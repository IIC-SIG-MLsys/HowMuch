'use strict';

// ---------------------------------------------------------------------------
// 计算引擎（唯一正式实现）
// 依赖：data.js 提供的预设、defaultState、deepClone、apply*Preset 等
// ---------------------------------------------------------------------------

const KV_PRECISION = {
  fp16: 2.0,
  fp8: 1.0,
  fp4: 0.5,
  '3bit': 0.375
};

function clamp(v, min, max) {
  const n = Number(v);
  if (!isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// 清洗状态：保证数值合法，避免 NaN 传播
function normalizeState(state) {
  const s = state;
  s.nodes = Math.round(clamp(s.nodes, 1, 128));
  s.gpusPerNode = Math.round(clamp(s.gpusPerNode, 1, 16));
  s.model.totalParamsB = clamp(s.model.totalParamsB, 0.1, 100000);
  s.model.activeParamsB = clamp(s.model.activeParamsB, 0.01, 100000);
  s.model.bytesPerParam = clamp(s.model.bytesPerParam, 0.01, 4);
  s.model.kvBytesPerToken = clamp(s.model.kvBytesPerToken, 1, 1e6);
  s.model.contextLen = clamp(s.model.contextLen, 1, 1e8);
  s.model.avgInputLen = clamp(s.model.avgInputLen, 1, 1e7);
  s.model.avgOutputLen = clamp(s.model.avgOutputLen, 1, 1e7);
  s.model.inputOutputRatio = clamp(s.model.inputOutputRatio, 0.01, 1000);
  s.model.overheadPct = clamp(s.model.overheadPct, 0, 500);

  s.gpu.hbmGB = clamp(s.gpu.hbmGB, 1, 10000);
  s.gpu.bandwidthTBps = clamp(s.gpu.bandwidthTBps, 0.01, 100);
  s.gpu.fp8TFLOPS = clamp(s.gpu.fp8TFLOPS, 1, 1e6);
  s.gpu.tdpW = clamp(s.gpu.tdpW, 1, 10000);
  s.gpu.rentPerHour = clamp(s.gpu.rentPerHour, 0, 1e6);
  s.gpu.reservedDiscountPct = clamp(s.gpu.reservedDiscountPct, 0, 90);
  s.gpu.purchasePrice = clamp(s.gpu.purchasePrice, 0, 1e9);
  s.gpu.coloPerNodeMonth = clamp(s.gpu.coloPerNodeMonth, 0, 1e7);

  s.opt.dsparkSpeedup = clamp(s.opt.dsparkSpeedup, 1, 3);
  s.opt.cacheHitPct = clamp(s.opt.cacheHitPct, 0, 99);
  s.opt.hostKvGB = clamp(s.opt.hostKvGB, 0, 1e6);
  s.opt.bwUtilPct = clamp(s.opt.bwUtilPct, 1, 99);
  s.opt.prefillEffPct = clamp(s.opt.prefillEffPct, 1, 100);
  s.opt.pdSplitGainPct = clamp(s.opt.pdSplitGainPct, 0, 100);
  s.opt.kernelGainPct = clamp(s.opt.kernelGainPct, 0, 50);
  s.opt.chunkedGainPct = clamp(s.opt.chunkedGainPct, 0, 100);
  s.opt.batchingFactor = clamp(s.opt.batchingFactor, 0.7, 1.3);
  s.opt.moeGainPct = clamp(s.opt.moeGainPct, 0, 50);
  if (!KV_PRECISION[s.opt.kvPrecision]) s.opt.kvPrecision = 'fp8';
  s.opt.singleStreamTps = clamp(s.opt.singleStreamTps, 1, 1e6);
  s.opt.reserveGB = clamp(s.opt.reserveGB, 0, 1e6);

  s.biz.utilizationPct = clamp(s.biz.utilizationPct, 0, 100);
  s.biz.peakSharePct = clamp(s.biz.peakSharePct, 0, 100);
  s.biz.peakMult = clamp(s.biz.peakMult, 1, 10);
  s.biz.outputPrice = clamp(s.biz.outputPrice, 0, 1e6);
  s.biz.inputPrice = clamp(s.biz.inputPrice, 0, 1e6);
  s.biz.cachedInputPrice = clamp(s.biz.cachedInputPrice, 0, 1e6);
  s.biz.privateNodes = Math.round(clamp(s.biz.privateNodes, 0, s.nodes));
  s.biz.contractPerNodeMonth = clamp(s.biz.contractPerNodeMonth, 0, 1e9);

  s.cost.elecPerKWh = clamp(s.cost.elecPerKWh, 0, 100);
  s.cost.rentIncludesPower = s.cost.rentIncludesPower !== false;
  s.cost.pue = clamp(s.cost.pue, 1, 5);
  s.cost.idlePowerPct = clamp(s.cost.idlePowerPct, 0, 100);
  s.cost.amortMonths = Math.round(clamp(s.cost.amortMonths, 1, 120));
  s.cost.maintPctPerYear = clamp(s.cost.maintPctPerYear, 0, 50);
  s.cost.residualPct = clamp(s.cost.residualPct, 0, 90);
  s.cost.coloPerNodeMonth = clamp(s.cost.coloPerNodeMonth, 0, 1e7);

  s.sensitivity.priceMin = clamp(s.sensitivity.priceMin, 0, 1e6);
  s.sensitivity.priceMax = Math.max(s.sensitivity.priceMin + 0.01, clamp(s.sensitivity.priceMax, 0.01, 1e6));
  s.sensitivity.priceStep = Math.max(0.01, clamp(s.sensitivity.priceStep, 0.01, 1e6));
  s.sensitivity.utilMin = clamp(s.sensitivity.utilMin, 0, 100);
  s.sensitivity.utilMax = Math.max(s.sensitivity.utilMin + 1, clamp(s.sensitivity.utilMax, 1, 100));
  s.sensitivity.utilStep = clamp(s.sensitivity.utilStep, 1, 50);
  s.sensitivity.tornadoPct = clamp(s.sensitivity.tornadoPct, 1, 100);
  return s;
}

function computeModel(m) {
  const weightGB = m.totalParamsB * m.bytesPerParam * (1 + m.overheadPct / 100);
  const activeBytes = m.activeParamsB * 1e9 * m.bytesPerParam;
  const ctxLen = m.avgInputLen + m.avgOutputLen;
  const kvBytesPerReq = m.kvBytesPerToken * ctxLen;
  return {
    weightGB,
    activeBytes,
    ctxLen,
    kvBytesPerReq,
    kvMBPerReq: kvBytesPerReq / 1e6,
    kvGBPerReq: kvBytesPerReq / 1e9
  };
}

function computeNode(state) {
  const g = state.gpu, m = state.model, o = state.opt;
  const mm = computeModel(m);
  const kvFactor = KV_PRECISION[o.kvPrecision] || 1;
  const kvBytesPerReq = mm.kvBytesPerReq * kvFactor;
  const bytesPerTok = mm.activeBytes + kvBytesPerReq;
  const basePerGpu = (g.bandwidthTBps * 1e12) / bytesPerTok;
  const effPerGpu = basePerGpu * o.bwUtilPct / 100;
  const dsparkPerGpu = effPerGpu * (o.dsparkOn ? o.dsparkSpeedup : 1);
  const engFactor = (o.kernelOptOn ? (1 + o.kernelGainPct / 100) : 1) *
    o.batchingFactor *
    (o.moeOptOn ? (1 + o.moeGainPct / 100) : 1);
  const pdFactor = o.pdSplitOn ? (1 + o.pdSplitGainPct / 100) : 1;
  const nodeDecode = dsparkPerGpu * state.gpusPerNode * pdFactor * engFactor;
  const nodeDecodeNoDspark = effPerGpu * state.gpusPerNode * pdFactor * engFactor;

  const flopsPerTok = 2 * m.activeParamsB * 1e9;
  const prefillFactor = (o.chunkedPrefillOn ? (1 + o.chunkedGainPct / 100) : 1) *
    (o.kernelOptOn ? (1 + o.kernelGainPct / 100) : 1);
  const nodePrefill = g.fp8TFLOPS * 1e12 / flopsPerTok * state.gpusPerNode * o.prefillEffPct / 100 * prefillFactor;

  const nodeTheoretical = (g.bandwidthTBps * 1e12) / bytesPerTok * state.gpusPerNode * pdFactor * engFactor;
  const requiredConcurrency = Math.max(1, Math.ceil(
    nodeTheoretical * o.bwUtilPct / 100 / o.singleStreamTps
  ));

  const hbmTotal = state.gpusPerNode * g.hbmGB;
  const hbmFree = hbmTotal - mm.weightGB - o.reserveGB;
  const hbmCap = hbmFree > 0 ? Math.floor(hbmFree / mm.kvGBPerReq) : 0;
  const offloadCap = o.offloadOn ? Math.floor(o.hostKvGB / mm.kvGBPerReq) : 0;

  return {
    ...mm,
    kvBytesPerReq,
    kvMBPerReq: kvBytesPerReq / 1e6,
    kvGBPerReq: kvBytesPerReq / 1e9,
    kvFactor,
    engFactor,
    prefillFactor,
    basePerGpu,
    effPerGpu,
    dsparkPerGpu,
    pdFactor,
    nodeDecode,
    nodeDecodeNoDspark,
    nodePrefill,
    nodeTheoretical,
    requiredConcurrency,
    hbmTotal,
    hbmFree,
    hbmCap,
    offloadCap,
    kvCapTotal: hbmCap + offloadCap,
    fits: hbmFree >= 0
  };
}

function blendedPrices(state) {
  const b = state.biz;
  const f = base => base * (1 + b.peakSharePct / 100 * (b.peakMult - 1));
  return { out: f(b.outputPrice), in: f(b.inputPrice), cached: f(b.cachedInputPrice) };
}

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

  // 电费与机房仅计列于：采购自持，或租用但租金未含电费/机房（裸机托管场景）
  const countPower = c.rentMode === 'buy' || !c.rentIncludesPower;
  const powerPerGpuAtFull = countPower ? g.tdpW / 1000 * hours * c.elecPerKWh * c.pue : 0;
  const powerIdle = powerPerGpuAtFull * gpuH * c.idlePowerPct / 100;
  const powerVariable = powerPerGpuAtFull * gpuH * (1 - c.idlePowerPct / 100) * U;
  const power = powerIdle + powerVariable;
  const ops = countPower ? nodes * c.coloPerNodeMonth : 0;
  const total = rent + amort + maint + power + ops;

  const varCostPerUnitU = countPower ? powerPerGpuAtFull * gpuH * (1 - c.idlePowerPct / 100) : 0;
  return {
    rent, amort, maint, power, ops, total,
    powerIdle, powerVariable,
    fixedCost: rent + amort + maint + ops + powerIdle,
    varCostPerUnitU
  };
}

function calcResults(state) {
  normalizeState(state);
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
  const billableTokH = outTokH + inTokH;
  const billableTokM = outTokM + inTokM;

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

  // 单节点满负载收入/h（API 口径，U=100%）
  const outTokHPerNodeU1 = n.nodeDecode * 3600;
  const needInTokHPerNodeU1 = outTokHPerNodeU1 * state.model.inputOutputRatio;
  const inTokHPerNodeU1 = Math.min(needInTokHPerNodeU1, n.nodePrefill * 3600);
  const maxRevPerHPerApiNode = (
    (outTokHPerNodeU1 * p.out + inTokHPerNodeU1 * (hit * p.cached + (1 - hit) * p.in)) / 1e6
  );

  // 每单位负载率（0→1）对应的收入与可变电费斜率
  const apiUnitRevPerM = (
    (outTokHPerNodeU1 * p.out + inTokHPerNodeU1 * (hit * p.cached + (1 - hit) * p.in)) / 1e6 * 730 * apiNodes
  );
  const denom = apiUnitRevPerM - cost.varCostPerUnitU;
  let breakEvenUtil = null;
  if (apiNodes > 0) {
    if (denom > 0) {
      breakEvenUtil = (cost.fixedCost - privateRevPerM) / denom * 100;
      breakEvenUtil = Math.max(0, Math.min(110, breakEvenUtil));
    } else {
      breakEvenUtil = null;
    }
  }

  let breakEvenPrice = null;
  if (apiNodes > 0 && outTokM > 0) {
    const inputRev = inTokM * (hit * p.cached + (1 - hit) * p.in) / 1e6;
    breakEvenPrice = (cost.total - privateRevPerM - inputRev) * 1e6 / outTokM;
  }

  // 私有化合同盈亏平衡价（月/节点）
  let breakEvenContract = null;
  if (privateNodes > 0) breakEvenContract = cost.total / privateNodes;

  let paybackMonths = null;
  if (state.cost.rentMode === 'buy' && profitPerM > 0) {
    paybackMonths = state.nodes * state.gpu.purchasePrice / profitPerM;
  }

  const costPerMOut = outTokM > 0 ? cost.total / outTokM : null;
  const revPerMOut = outTokM > 0 ? revenuePerM / outTokM : null;
  const profitPerMOut = outTokM > 0 ? profitPerM / outTokM : null;

  // KV 缓存命中节省的预填充算力（每小时）
  const prefillSavedTokH = state.opt.kvPoolOn
    ? Math.min(needInTokH, inCapH) * state.opt.cacheHitPct / 100
    : 0;

  return {
    node: n,
    U,
    apiNodes,
    privateNodes,
    outTokH, inTokH, outTokM, inTokM,
    billableTokH, billableTokM,
    inCapped,
    apiRevPerH, apiRevPerM,
    privateRevPerM,
    revenuePerH, revenuePerM,
    revPerHPerNode: nodes > 0 ? revenuePerH / nodes : 0,
    maxRevPerHPerApiNode,
    cost,
    profitPerM,
    margin,
    breakEvenUtil,
    breakEvenPrice,
    breakEvenContract,
    paybackMonths,
    costPerMOut,
    revPerMOut,
    profitPerMOut,
    prefillSavedTokH,
    currency: state.currency
  };
}

// 生成不超过 maxPoints 个点的坐标轴
function buildAxis(min, max, step, maxPoints) {
  const out = [];
  const raw = [];
  for (let v = min; v <= max + 1e-9; v += step) raw.push(Math.round(v * 10000) / 10000);
  if (raw.length <= maxPoints) return raw;
  const k = Math.ceil(raw.length / maxPoints);
  for (let i = 0; i < raw.length; i += k) out.push(raw[i]);
  if (out[out.length - 1] !== raw[raw.length - 1]) out.push(raw[raw.length - 1]);
  return out;
}

function sensitivityMatrix(state) {
  const s = state.sensitivity;
  const usages = buildAxis(s.utilMin, s.utilMax, s.utilStep, 21);
  const prices = buildAxis(s.priceMin, s.priceMax, s.priceStep, 21);
  const rows = [];
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

function tornado(state) {
  const pct = state.sensitivity.tornadoPct / 100;
  const base = calcResults(state).profitPerM;
  const items = [];
  const isPrivate = state.biz.mode === 'private';
  const isHybrid = state.biz.mode === 'hybrid';

  const defs = [];
  if (!isPrivate) {
    defs.push(
      ['输出单价', s => { s.biz.outputPrice *= 1 + pct; }, s => { s.biz.outputPrice *= 1 - pct; }],
      ['输入单价', s => { s.biz.inputPrice *= 1 + pct; }, s => { s.biz.inputPrice *= 1 - pct; }],
      ['负载率', s => { s.biz.utilizationPct = Math.min(100, s.biz.utilizationPct * (1 + pct)); }, s => { s.biz.utilizationPct = Math.max(1, s.biz.utilizationPct * (1 - pct)); }],
      ['缓存命中率', s => { s.opt.cacheHitPct = Math.min(99, s.opt.cacheHitPct * (1 + pct)); }, s => { s.opt.cacheHitPct = Math.max(0, s.opt.cacheHitPct * (1 - pct)); }],
      ['DSpark 加速', s => { s.opt.dsparkSpeedup = Math.min(3, s.opt.dsparkSpeedup * (1 + pct)); }, s => { s.opt.dsparkSpeedup = Math.max(1, s.opt.dsparkSpeedup * (1 - pct)); }],
      ['带宽利用率', s => { s.opt.bwUtilPct = Math.min(99, s.opt.bwUtilPct * (1 + pct)); }, s => { s.opt.bwUtilPct = Math.max(1, s.opt.bwUtilPct * (1 - pct)); }]
    );
  }
  if (state.cost.rentMode !== 'buy') {
    defs.push(
      ['单卡时租', s => { s.gpu.rentPerHour *= 1 + pct; }, s => { s.gpu.rentPerHour *= 1 - pct; }],
      ['预留折扣', s => { s.gpu.reservedDiscountPct = Math.min(90, s.gpu.reservedDiscountPct + pct * 100); }, s => { s.gpu.reservedDiscountPct = Math.max(0, s.gpu.reservedDiscountPct - pct * 100); }]
    );
  }
  if (state.cost.rentMode === 'buy' || !state.cost.rentIncludesPower) {
    defs.push(
      ['电价', s => { s.cost.elecPerKWh *= 1 + pct; }, s => { s.cost.elecPerKWh *= 1 - pct; }],
      ['机房/运维', s => { s.cost.coloPerNodeMonth *= 1 + pct; }, s => { s.cost.coloPerNodeMonth *= 1 - pct; }]
    );
  }
  if (isPrivate || isHybrid) {
    defs.push(
      ['私有化合同', s => { s.biz.contractPerNodeMonth *= 1 + pct; }, s => { s.biz.contractPerNodeMonth *= 1 - pct; }]
    );
  }

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

function compareGpus(state) {
  const out = [];
  const rate = CURRENCY_RATE[state.currency] / CURRENCY_RATE.USD;
  for (const key of ['h100', 'h200', 'b300']) {
    const st = deepClone(state);
    applyGpuPreset(st, key);
    // 预设金额为 USD，需换算到当前币种，避免 CNY 下混用美元数字
    st.gpu.rentPerHour = round1(st.gpu.rentPerHour * rate);
    st.gpu.purchasePrice = round1(st.gpu.purchasePrice * rate);
    st.gpu.coloPerNodeMonth = round1(st.gpu.coloPerNodeMonth * rate);
    st.cost.coloPerNodeMonth = st.gpu.coloPerNodeMonth;
    const r = calcResults(st);
    out.push({
      key,
      name: st.gpu.name,
      decodeTps: r.node.nodeDecode,
      outTokH: r.node.nodeDecode * 3600 * r.U * Math.max(r.apiNodes, 1),
      billableTokH: r.billableTokH,
      revPerM: r.revenuePerM,
      costPerM: r.cost.total,
      profitPerM: r.profitPerM,
      profitPerNode: r.profitPerM / st.nodes,
      breakEvenUtil: r.breakEvenUtil,
      fits: r.node.fits
    });
  }
  return out;
}

function profitCurve(state) {
  const curve = [];
  for (let u = 0; u <= 100; u += 5) {
    const st = deepClone(state);
    st.biz.utilizationPct = u;
    const r = calcResults(st);
    curve.push({ u, revenue: round1(r.revenuePerM), cost: round1(r.cost.total), profit: round1(r.profitPerM) });
  }
  return curve;
}

// 租 vs 买：months 个月总成本对比。
// 租用默认一口价（云 GPU 已含电费/机房）；采购自持计折旧+维护+电费+机房，期末按残值回收。
function rentBuyCompare(state, months = 36, residualPct) {
  const g = state.gpu, c = state.cost;
  const U = state.biz.utilizationPct / 100;
  const nodes = state.nodes;
  const gpuH = nodes * state.gpusPerNode;
  const hours = 730;
  const powerPerGpuAtFull = g.tdpW / 1000 * hours * c.elecPerKWh * c.pue;
  const powerIdle = powerPerGpuAtFull * gpuH * c.idlePowerPct / 100;
  const power = powerIdle + powerPerGpuAtFull * gpuH * (1 - c.idlePowerPct / 100) * U;
  const ops = nodes * c.coloPerNodeMonth;
  const rentPowerIncl = c.rentIncludesPower !== false;
  const rentMonthly = gpuH * g.rentPerHour * hours * (1 - g.reservedDiscountPct / 100)
    + (rentPowerIncl ? 0 : power + ops);
  const maintMonthly = nodes * g.purchasePrice * c.maintPctPerYear / 100 / 12;
  const buyMonthly = maintMonthly + power + ops;
  const rentTotal = rentMonthly * months;
  const residualValue = nodes * g.purchasePrice * (residualPct === undefined ? c.residualPct : residualPct) / 100;
  const buyTotal = nodes * g.purchasePrice + buyMonthly * months - residualValue;
  return {
    months,
    rentTotal: round1(rentTotal),
    buyTotal: round1(buyTotal),
    rentMonthly: round1(rentMonthly),
    buyMonthly: round1(buyMonthly),
    residualValue: round1(residualValue),
    buySaving: round1(rentTotal - buyTotal) // >0 表示买更省
  };
}

function round1(x) { return Math.round(x * 10) / 10; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clamp, normalizeState, computeModel, computeNode, blendedPrices,
    calcCosts, calcResults, sensitivityMatrix, tornado, compareGpus,
    profitCurve, rentBuyCompare, round1
  };
}
