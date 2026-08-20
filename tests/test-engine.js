'use strict';

const assert = require('assert');
const data = require('../js/data.js');
const engine = require('../js/engine.js');

const st = data.defaultState();

// 1) 模型权重与 KV 计算
const mm = engine.computeModel(st.model);
assert.ok(Math.abs(mm.weightGB - 284 * 1.08) < 1e-9, 'weightGB wrong: ' + mm.weightGB);
assert.ok(Math.abs(mm.kvMBPerReq - 584 * 4512 / 1e6) < 1e-6, 'kvMB wrong: ' + mm.kvMBPerReq);

// 2) FP4 混合预设权重约 146GB
const stFp4 = data.deepClone(st);
data.applyModelPreset(stFp4, 'v4-flash-fp4');
assert.ok(Math.abs(engine.computeModel(stFp4.model).weightGB - 284 * 0.5 * 1.03) < 1e-9,
  'fp4 weight wrong: ' + engine.computeModel(stFp4.model).weightGB);

// 3) H200 单节点解码吞吐（带宽 TB/s × 1e12，含默认工程优化因子 1.1×1.05=1.155）
const n = engine.computeNode(st);
const expectBase = 4.8e12 / (13e9 + 584 * 4512);
assert.ok(Math.abs(n.basePerGpu - expectBase) < 1e-6, 'basePerGpu wrong: ' + n.basePerGpu);
assert.ok(Math.abs(n.nodeDecodeNoDspark - expectBase * 0.45 * 8 * 1.155) < 1e-3, 'decodeNoDspark wrong');
assert.ok(Math.abs(n.nodeDecode - expectBase * 0.45 * 8 * 1.6 * 1.155) < 1e-3, 'decode wrong');
assert.ok(n.requiredConcurrency >= 1, 'requiredConcurrency invalid');
assert.ok(n.fits, 'H200 should fit V4-Flash');

// 4) H100 / H200 / B300 吞吐顺序
const stH100 = data.deepClone(st); data.applyGpuPreset(stH100, 'h100');
const stB300 = data.deepClone(st); data.applyGpuPreset(stB300, 'b300');
const nH100 = engine.computeNode(stH100);
const nB300 = engine.computeNode(stB300);
assert.ok(nH100.nodeDecode < n.nodeDecode && n.nodeDecode < nB300.nodeDecode,
  `order wrong: ${nH100.nodeDecode} / ${n.nodeDecode} / ${nB300.nodeDecode}`);

// 4b) KV 精度 3-bit 降低 KV 显存并提高解码吞吐
const st3 = data.deepClone(st);
st3.opt.kvPrecision = '3bit';
const n3 = engine.computeNode(st3);
assert.ok(Math.abs(n3.kvMBPerReq - n.kvMBPerReq * 0.375) < 1e-6, '3bit kvMB wrong');
assert.ok(n3.nodeDecode > n.nodeDecode, '3bit KV should raise decode');

// 5) 收益结果完整
const r = engine.calcResults(st);
assert.ok(Number.isFinite(r.revenuePerM) && Number.isFinite(r.cost.total) && Number.isFinite(r.profitPerM));
assert.ok(r.outTokM > 0 && r.inTokM > 0, 'token volumes invalid');
assert.ok(r.breakEvenUtil === null || (r.breakEvenUtil >= 0 && r.breakEvenUtil <= 110), 'breakEvenUtil out of range');
assert.ok(Number.isFinite(r.billableTokH) && Number.isFinite(r.maxRevPerHPerApiNode));
assert.ok(Number.isFinite(r.profitPerMOut) && Number.isFinite(r.prefillSavedTokH));

// 6) 私有化模式：收入与负载率无关，合同盈亏平衡价为正
const stPriv = data.deepClone(st);
stPriv.biz.mode = 'private';
stPriv.biz.privateNodes = stPriv.nodes;
const rPriv60 = engine.calcResults(stPriv);
const stPriv90 = data.deepClone(stPriv); stPriv90.biz.utilizationPct = 90;
const rPriv90 = engine.calcResults(stPriv90);
assert.ok(Math.abs(rPriv60.revenuePerM - rPriv90.revenuePerM) < 1e-6, 'private revenue should not depend on utilization');
assert.ok(rPriv60.breakEvenContract !== null && rPriv60.breakEvenContract > 0, 'breakEvenContract invalid');

// 7) 敏感性矩阵与 Tornado
const m = engine.sensitivityMatrix(st);
assert.ok(m.rows.length >= 3 && m.rows[0].length >= 3, 'matrix too small');
const t = engine.tornado(st);
assert.ok(t.length >= 5, 'tornado items too few');
const tPriv = engine.tornado(stPriv);
assert.ok(tPriv.every(i => i.label !== '输出单价'), 'private tornado should not include output price');

// 8) 负载率-利润曲线（0–100，步长 5 → 21 点）
const curve = engine.profitCurve(st);
assert.strictEqual(curve.length, 21, 'curve length wrong');
assert.ok(curve[0].u === 0 && curve[curve.length - 1].u === 100);

// 9) 换卡对比与租买对比
const cmp = engine.compareGpus(st);
assert.strictEqual(cmp.length, 3);
assert.ok(cmp.every(c => Number.isFinite(c.profitPerM) && Number.isFinite(c.profitPerNode)));
const rb = engine.rentBuyCompare(st, 36);
assert.strictEqual(rb.months, 36);
assert.ok(Number.isFinite(rb.rentTotal) && Number.isFinite(rb.buyTotal) && Number.isFinite(rb.buySaving));
const rentOnly = st.nodes * st.gpusPerNode * st.gpu.rentPerHour * 730 * (1 - st.gpu.reservedDiscountPct / 100);
assert.ok(Math.abs(rb.rentMonthly - rentOnly) < 1e-6, 'all-in rent compare should not add power/colo on top of rent');
assert.ok(Math.abs(rb.residualValue - st.nodes * st.gpu.purchasePrice * st.cost.residualPct / 100) < 1e-6, 'residual value wrong');
assert.ok(Math.abs(rb.buyTotal + rb.residualValue - (st.nodes * st.gpu.purchasePrice + rb.buyMonthly * 36)) < 3, 'buy total formula wrong');

// 9b) 租用默认一口价：不再重复计列电费与机房
assert.strictEqual(r.cost.power, 0, 'all-in rent mode should not bill power');
assert.strictEqual(r.cost.ops, 0, 'all-in rent mode should not bill colo/ops');
assert.ok(Math.abs(r.cost.total - r.cost.rent) < 1e-6, 'all-in rent total equals rent');

const stRentExcl = data.deepClone(st); stRentExcl.cost.rentIncludesPower = false;
const rRentExcl = engine.calcResults(stRentExcl);
assert.ok(rRentExcl.cost.power > 0 && rRentExcl.cost.ops > 0, 'bare-metal rent mode adds power/colo');

// 9c) Tornado 与获取方式联动
const tRent = engine.tornado(st);
assert.ok(!tRent.some(i => i.label === '电价' || i.label === '机房/运维'), 'all-in rent tornado excludes power/colo');
assert.ok(tRent.some(i => i.label === '单卡时租'), 'all-in rent tornado keeps rent');
const tRentExcl = engine.tornado(stRentExcl);
assert.ok(tRentExcl.some(i => i.label === '电价'), 'bare-metal rent tornado includes power');
const stBuyLocal = data.deepClone(st); stBuyLocal.cost.rentMode = 'buy';
const tBuy = engine.tornado(stBuyLocal);
assert.ok(tBuy.some(i => i.label === '电价'), 'buy tornado includes power');
assert.ok(!tBuy.some(i => i.label === '单卡时租'), 'buy tornado excludes rent');

// 10) 状态清洗
const bad = data.deepClone(st);
bad.nodes = -5;
bad.biz.utilizationPct = 500;
bad.gpu.bandwidthTBps = 0;
engine.normalizeState(bad);
assert.strictEqual(bad.nodes, 1);
assert.strictEqual(bad.biz.utilizationPct, 100);
assert.ok(bad.gpu.bandwidthTBps > 0);

// 11) 边界场景
const st0 = data.deepClone(st); st0.biz.utilizationPct = 0;
const r0 = engine.calcResults(st0);
assert.strictEqual(r0.outTokH, 0);
assert.ok(r0.profitPerM < 0, 'zero utilization should lose money (rent still paid)');
assert.ok(r0.breakEvenUtil !== null, 'break-even still computable at zero utilization');

const st1 = data.deepClone(st); st1.nodes = 1; st1.gpusPerNode = 1;
const r1 = engine.calcResults(st1);
assert.ok(Number.isFinite(r1.profitPerM) && r1.outTokM > 0, 'single GPU edge case works');

const stZero = data.deepClone(st);
stZero.biz.outputPrice = 0; stZero.biz.inputPrice = 0; stZero.biz.cachedInputPrice = 0;
const rZero = engine.calcResults(stZero);
assert.strictEqual(rZero.revenuePerM, 0, 'zero prices => zero revenue');
assert.ok(rZero.breakEvenPrice !== null && rZero.breakEvenPrice > 0, 'break-even price computed even at zero price');

const stBuy = data.deepClone(st); stBuy.cost.rentMode = 'buy';
const rBuy = engine.calcResults(stBuy);
assert.strictEqual(rBuy.cost.rent, 0);
assert.ok(rBuy.cost.amort > 0, 'buy mode amortizes');
assert.ok(rBuy.cost.power > 0 && rBuy.cost.ops > 0, 'buy mode bills power and colo');

// 12) 换卡对比在 CNY 下金额一致（不再混用 USD 数字）
const stCny = data.deepClone(st);
data.convertMoney(stCny, 'USD', 'CNY');
const cmpCny = engine.compareGpus(stCny);
assert.ok(cmpCny.every(c => c.costPerM > 1000), 'CNY comparison should use CNY-scale costs');
assert.ok(cmpCny.every(c => c.revPerM > 1000), 'CNY comparison should use CNY-scale revenue');

// 13) mergeState 保留默认新字段
const legacy = { model: data.deepClone(st.model), gpu: data.deepClone(st.gpu) };
const merged = data.mergeState(data.defaultState(), legacy);
assert.strictEqual(merged.cost.residualPct, data.defaultState().cost.residualPct, 'merge keeps residualPct default');
assert.strictEqual(merged.opt.pdSplitGainPct, data.defaultState().opt.pdSplitGainPct, 'merge keeps pdSplitGainPct default');
assert.strictEqual(merged.nodes, data.defaultState().nodes, 'merge keeps nodes default');

console.log('All engine tests passed.');
console.log(`  H100 decode: ${nH100.nodeDecode.toFixed(1)} tok/s`);
console.log(`  H200 decode: ${n.nodeDecode.toFixed(1)} tok/s`);
console.log(`  B300 decode: ${nB300.nodeDecode.toFixed(1)} tok/s`);
console.log(`  Default premium monthly profit: ${r.profitPerM.toFixed(0)} (${st.currency})`);
