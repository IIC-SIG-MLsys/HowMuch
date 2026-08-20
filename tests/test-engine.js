'use strict';

const assert = require('assert');
const data = require('../js/data.js');
const engine = require('../js/engine.js');
const fix = require('../js/engine-fix.js');

const st = data.defaultState();
const computeNode = fix.computeNode;

// 1) 模型权重与 KV 计算
const mm = data.computeModel(st.model);
assert.ok(Math.abs(mm.weightGB - 284 * 1.08) < 1e-9, 'weightGB wrong: ' + mm.weightGB);
assert.ok(Math.abs(mm.kvMBPerReq - 584 * 4512 / 1e6) < 1e-6, 'kvMB wrong: ' + mm.kvMBPerReq);

// 2) H200 单节点解码吞吐（TB/s × 1e12 修正后）
const n = computeNode(st);
const expectBase = 4.8e12 / (13e9 + 584 * 4512);
assert.ok(Math.abs(n.basePerGpu - expectBase) < 1e-6, 'basePerGpu wrong: ' + n.basePerGpu);
assert.ok(Math.abs(n.nodeDecodeNoDspark - expectBase * 0.45 * 8) < 1e-3, 'decodeNoDspark wrong: ' + n.nodeDecodeNoDspark);
assert.ok(Math.abs(n.nodeDecode - expectBase * 0.45 * 8 * 1.6) < 1e-3, 'decode wrong: ' + n.nodeDecode);
assert.ok(n.requiredConcurrency >= 1, 'requiredConcurrency invalid');
assert.ok(n.fits, 'H200 should fit V4-Flash');

// 3) H100 / B300 对比
const stH100 = data.deepClone(st); data.applyGpuPreset(stH100, 'h100');
const stB300 = data.deepClone(st); data.applyGpuPreset(stB300, 'b300');
const nH100 = computeNode(stH100);
const nB300 = computeNode(stB300);
assert.ok(nH100.nodeDecode < n.nodeDecode && n.nodeDecode < nB300.nodeDecode,
  `order wrong: ${nH100.nodeDecode} / ${n.nodeDecode} / ${nB300.nodeDecode}`);

// 4) 收益结果可计算且结构完整
const r = engine.calcResults(st);
assert.ok(Number.isFinite(r.revenuePerM) && Number.isFinite(r.cost.total) && Number.isFinite(r.profitPerM));
assert.ok(r.outTokM > 0 && r.inTokM > 0, 'token volumes invalid');
assert.ok(r.breakEvenUtil === null || (r.breakEvenUtil >= 0 && r.breakEvenUtil <= 120), 'breakEvenUtil out of range');
if (r.breakEvenPrice !== null) assert.ok(r.breakEvenPrice > 0, 'breakEvenPrice invalid');

// 5) 私有化模式：收入与负载率无关
const stPriv = data.deepClone(st);
stPriv.biz.mode = 'private';
stPriv.biz.privateNodes = stPriv.nodes;
const rPriv60 = engine.calcResults(stPriv);
const stPriv90 = data.deepClone(stPriv); stPriv90.biz.utilizationPct = 90;
const rPriv90 = engine.calcResults(stPriv90);
assert.ok(Math.abs(rPriv60.revenuePerM - rPriv90.revenuePerM) < 1e-6, 'private revenue should not depend on utilization');

// 6) 敏感性矩阵与 Tornado
const m = engine.sensitivityMatrix(st);
const expectRows = Math.floor((st.sensitivity.utilMax - st.sensitivity.utilMin) / st.sensitivity.utilStep) + 1;
const expectCols = Math.floor((st.sensitivity.priceMax - st.sensitivity.priceMin) / st.sensitivity.priceStep) + 1;
assert.strictEqual(m.rows.length, expectRows, 'matrix rows wrong');
assert.strictEqual(m.rows[0].length, expectCols, 'matrix cols wrong');

const t = engine.tornado(st);
assert.ok(t.length >= 5, 'tornado items too few');

// 7) 负载率-利润曲线
const curve = engine.profitCurve(st);
assert.strictEqual(curve.length, 25, 'curve length wrong');
assert.ok(curve[0].u === 0 && curve[curve.length - 1].u === 120);

// 8) 换卡对比
const cmp = engine.compareGpus(st);
assert.strictEqual(cmp.length, 3);
assert.ok(cmp.every(c => Number.isFinite(c.profitPerM)));

console.log('All engine tests passed.');
console.log(`  H100 decode: ${nH100.nodeDecode.toFixed(1)} tok/s`);
console.log(`  H200 decode: ${n.nodeDecode.toFixed(1)} tok/s`);
console.log(`  B300 decode: ${nB300.nodeDecode.toFixed(1)} tok/s`);
console.log(`  Default premium monthly profit: ${r.profitPerM.toFixed(0)} (${st.currency})`);
