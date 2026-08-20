'use strict';

// ---------------------------------------------------------------------------
// 正式计算引擎（覆盖 js/data.js 中的早期同名草稿函数）
// 依赖：data.js 提供的预设、defaultState、deepClone、applyGpuPreset 等
// ---------------------------------------------------------------------------

// 月度成本（修正：可变电费斜率在 U=0 时也正确）
function calcCosts(state, U) {
  const g = state.gpu, c = state.cost;
  const nodes = state.nodes;
  const gpuH = nodes * state.gpusPerNode;
  const hours = 730;

  let rent = 0, amort = 0, maint = 0;
  if (c.rentMode === 'buy') {
    amort = nodes * g.purchasePrice / c.amortMonths;
    maint = nodes * g.purchasePrice * c.maintPctPerYear / 100 / 12;
  } else {
    rent = gpuH * g.rentPerHour * hours * (1 - g.reservedDiscountPct / 100);
  }

  const powerPerGpuAtFull = g.tdpW / 1000 * hours * c.elecPerKWh * c.pue;
  const powerIdle = powerPerGpuAtFull * gpuH * c.idlePowerPct / 100;
  const powerVariable = powerPerGpuAtFull * gpuH * (1 - c.idlePowerPct / 100) * U;
  const power = powerIdle + powerVariable;
  const ops = nodes * c.coloPerNodeMonth;
  const total = rent + amort + maint + power + ops;

  const varCostPerUnitU = powerPerGpuAtFull * gpuH * (1 - c.idlePowerPct / 100);
  return {
    rent, amort, maint, power, ops, total,
    powerIdle, powerVariable,
    fixedCost: rent + amort + maint + ops + powerIdle,
    varCostPerUnitU
  };
}

// 完整收益结果（修正盈亏平衡公式）
function calcResults(state) {
  const n = computeNode(state);
  const b = state.biz;
  const U = b.utilizationPct / 100;
  const nodes = state.nodes;
  const isPrivate = b.mode === 'private';
  const isHybrid = b.mode === 'hybrid';
  const apiNodes = isPrivate ? 0 : nodes - (isHybrid ? b.privateNodes : 0);
  const privateNodes = isPrivate ? nodes : (isHybrid ? b.privateNodes : 0);

  const outTokHPerNode = n.nodeDecode * 3600 * U;
  const outTokH = outTokHPerNode * apiNodes;
  const needInTokH = outTokH * state.model.inputOutputRatio;
  const inCapH = n.nodePrefill * 3600 * U * apiNodes;
  const inTokH = Math.min(needInTokH, inCapH);
  const inCapped = needInTokH > inCapH + 1;
  const outTokM = outTokH * 730;
  const inTokM = inTokH * 730;

  const p = blendedPrices(state);
  const hit = state.opt.kvPoolOn ? state.opt.cacheHitPct / 100 : 0;
  const apiRevPerH = (outTokH * p.out + inTokH * (hit * p.cached + (1 - hit) * p.in)) / 1e6;
  const apiRevPerM = apiRevPerH * 730;
  const privateRevPerM = privateNodes * b.contractPerNodeMonth;
  const revenuePerM = apiRevPerM + privateRevPerM;
  const revenuePerH = revenuePerM / 730;

  const cost = calcCosts(state, U);
  const profitPerM = revenuePerM - cost.total;
  const margin = revenuePerM > 0 ? profitPerM / revenuePerM * 100 : null;

  // 每单位负载率（0→1）对应的收入与可变电费斜率
  const outTokHPerNodeU1 = n.nodeDecode * 3600;
  const needInTokHPerNodeU1 = outTokHPerNodeU1 * state.model.inputOutputRatio;
  const inCapHPerNodeU1 = n.nodePrefill * 3600;
  const inTokHPerNodeU1 = Math.min(needInTokHPerNodeU1, inCapHPerNodeU1);
  const apiUnitRevPerM = (
    (outTokHPerNodeU1 * p.out + inTokHPerNodeU1 * (hit * p.cached + (1 - hit) * p.in)) / 1e6 * 730 * apiNodes
  );
  const denom = apiUnitRevPerM - cost.varCostPerUnitU;
  let breakEvenUtil = null;
  if (apiNodes > 0) {
    if (denom > 0) {
      breakEvenUtil = (cost.fixedCost - privateRevPerM) / denom * 100;
      breakEvenUtil = Math.max(0, Math.min(120, breakEvenUtil));
    } else {
      breakEvenUtil = null; // 永远无法盈亏平衡
    }
  }

  // 盈亏平衡输出价（API 场景，给定当前负载率）
  let breakEvenPrice = null;
  if (apiNodes > 0 && outTokM > 0) {
    const inputRev = inTokM * (hit * p.cached + (1 - hit) * p.in) / 1e6;
    breakEvenPrice = (cost.total - privateRevPerM - inputRev) * 1e6 / outTokM;
  }

  // 采购回本周期
  let paybackMonths = null;
  if (state.cost.rentMode === 'buy' && profitPerM > 0) {
    paybackMonths = state.nodes * state.gpu.purchasePrice / profitPerM;
  }

  return {
    node: n,
    U,
    apiNodes,
    privateNodes,
    outTokH, inTokH, outTokM, inTokM,
    inCapped,
    apiRevPerH, apiRevPerM,
    privateRevPerM,
    revenuePerH, revenuePerM,
    cost,
    profitPerM,
    margin,
    breakEvenUtil,
    breakEvenPrice,
    paybackMonths,
    currency: state.currency
  };
}

// 敏感性矩阵：负载率 × 输出价格（私有化模式时改为合同价）
function sensitivityMatrix(state) {
  const s = state.sensitivity;
  const rows = [];
  const usages = [];
  const prices = [];
  for (let u = s.utilMin; u <= s.utilMax + 1e-9; u += s.utilStep) usages.push(Math.round(u * 10) / 10);
  for (let p = s.priceMin; p <= s.priceMax + 1e-9; p += s.priceStep) prices.push(Math.round(p * 100) / 100);

  const isPrivate = state.biz.mode === 'private';
  for (const u of usages) {
    const row = [];
    for (const p of prices) {
      const st = deepClone(state);
      st.biz.utilizationPct = u;
      if (isPrivate) st.biz.contractPerNodeMonth = p * 1000;
      else st.biz.outputPrice = p;
      row.push(round1(calcResults(st).profitPerM));
    }
    rows.push(row);
  }
  return { usages, prices, rows, isPrivate };
}

// Tornado：关键参数 ±tornadoPct 对月毛利的影响
function tornado(state) {
  const pct = state.sensitivity.tornadoPct / 100;
  const base = calcResults(state).profitPerM;
  const items = [];
  const defs = [
    ['输出单价', s => { s.biz.outputPrice *= 1 + pct; }, s => { s.biz.outputPrice *= 1 - pct; }],
    ['输入单价', s => { s.biz.inputPrice *= 1 + pct; }, s => { s.biz.inputPrice *= 1 - pct; }],
    ['负载率', s => { s.biz.utilizationPct = Math.min(100, s.biz.utilizationPct * (1 + pct)); }, s => { s.biz.utilizationPct = Math.max(1, s.biz.utilizationPct * (1 - pct)); }],
    ['缓存命中率', s => { s.opt.cacheHitPct = Math.min(100, s.opt.cacheHitPct * (1 + pct)); }, s => { s.opt.cacheHitPct = Math.max(0, s.opt.cacheHitPct * (1 - pct)); }],
    ['DSpark 加速', s => { s.opt.dsparkSpeedup = Math.min(2.5, s.opt.dsparkSpeedup * (1 + pct)); }, s => { s.opt.dsparkSpeedup = Math.max(1, s.opt.dsparkSpeedup * (1 - pct)); }],
    ['带宽利用率', s => { s.opt.bwUtilPct = Math.min(95, s.opt.bwUtilPct * (1 + pct)); }, s => { s.opt.bwUtilPct = Math.max(5, s.opt.bwUtilPct * (1 - pct)); }],
    ['单卡时租', s => { s.gpu.rentPerHour *= 1 + pct; }, s => { s.gpu.rentPerHour *= 1 - pct; }],
    ['预留折扣', s => { s.gpu.reservedDiscountPct = Math.min(80, s.gpu.reservedDiscountPct + pct * 100); }, s => { s.gpu.reservedDiscountPct = Math.max(0, s.gpu.reservedDiscountPct - pct * 100); }],
    ['私有化合同', s => { s.biz.contractPerNodeMonth *= 1 + pct; }, s => { s.biz.contractPerNodeMonth *= 1 - pct; }]
  ];
  for (const [label, up, down] of defs) {
    const su = deepClone(state); up(su);
    const sd = deepClone(state); down(sd);
    items.push({
      label,
      up: round1(calcResults(su).profitPerM - base),
      down: round1(calcResults(sd).profitPerM - base)
    });
  }
  items.sort((a, b) => Math.max(Math.abs(a.up), Math.abs(a.down)) - Math.max(Math.abs(b.up), Math.abs(b.down)));
  return items;
}

// 同配置换卡对比（H100 / H200 / B300）
function compareGpus(state) {
  const out = [];
  for (const key of ['h100', 'h200', 'b300']) {
    const st = deepClone(state);
    applyGpuPreset(st, key);
    const r = calcResults(st);
    out.push({
      key,
      name: st.gpu.name,
      decodeTps: r.node.nodeDecode,
      outTokH: r.node.nodeDecode * 3600 * r.U * Math.max(r.apiNodes, 1),
      revPerM: r.revenuePerM,
      costPerM: r.cost.total,
      profitPerM: r.profitPerM,
      breakEvenUtil: r.breakEvenUtil,
      fits: r.node.fits
    });
  }
  return out;
}

// 负载率-利润曲线（0–120%）
function profitCurve(state) {
  const curve = [];
  for (let u = 0; u <= 120; u += 5) {
    const st = deepClone(state);
    st.biz.utilizationPct = u;
    const r = calcResults(st);
    curve.push({ u, revenue: round1(r.revenuePerM), cost: round1(r.cost.total), profit: round1(r.profitPerM) });
  }
  return curve;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcCosts, calcResults, sensitivityMatrix, tornado, compareGpus, profitCurve };
}
