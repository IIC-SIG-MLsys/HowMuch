'use strict';

// ---------------------------------------------------------------------------
// 模型与硬件预设（金额以 USD 存储；切换币种时由 app.js 转换）
// 数据日期：2026-08-20
// ---------------------------------------------------------------------------

const MODEL_PRESETS = {
  'v4-flash': {
    key: 'v4-flash',
    name: 'DeepSeek-V4-Flash',
    desc: '284B 总参 / 13B 激活，MoE，MLA，1M 上下文，MIT 开源',
    totalParamsB: 284,
    activeParamsB: 13,
    bytesPerParam: 1.0,          // FP8 权重 ≈ 1 字节/参数
    kvBytesPerToken: 584,        // vLLM FP8 MLA 布局实测（584 B/token）
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 8               // 运行时开销（激活、路由、上下文）
  },
  'v4-pro': {
    key: 'v4-pro',
    name: 'DeepSeek-V4-Pro',
    desc: '1.6T 总参 / 49B 激活，MoE，MLA，1M 上下文，MIT 开源',
    totalParamsB: 1600,
    activeParamsB: 49,
    bytesPerParam: 1.0,
    kvBytesPerToken: 1024,       // 估计值，可按实测修改
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 8
  },
  'custom': {
    key: 'custom',
    name: '自定义模型',
    desc: '手动输入总参/激活参数、量化位数、KV 缓存规格',
    totalParamsB: 284,
    activeParamsB: 13,
    bytesPerParam: 1.0,
    kvBytesPerToken: 584,
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 8
  }
};

const GPU_PRESETS = {
  h100: {
    key: 'h100',
    name: 'H100 SXM5 80GB',
    hbmGB: 80,
    bandwidthGBps: 3.35,          // TB/s
    fp8TFLOPS: 989,               // FP8 稠密算力
    tdpW: 700,
    rentPerHour: 2.5,             // USD/卡/时（按需，市场中枢）
    reservedDiscountPct: 25,
    purchasePrice: 250000,        // USD/8卡整机
    coloPerNodeMonth: 1200,
    singleStreamTps: 50           // 无 DSpark 单流速度（含工程损耗）
  },
  h200: {
    key: 'h200',
    name: 'H200 SXM 141GB',
    hbmGB: 141,
    bandwidthGBps: 4.8,
    fp8TFLOPS: 989,
    tdpW: 700,
    rentPerHour: 3.5,
    reservedDiscountPct: 25,
    purchasePrice: 300000,
    coloPerNodeMonth: 1200,
    singleStreamTps: 60
  },
  b300: {
    key: 'b300',
    name: 'B300 SXM 288GB',
    hbmGB: 288,
    bandwidthGBps: 8.0,
    fp8TFLOPS: 7000,              // FP8 稠密估算（FP4 稠密约 14 PF）
    tdpW: 1200,
    rentPerHour: 8.0,
    reservedDiscountPct: 25,
    purchasePrice: 550000,
    coloPerNodeMonth: 2000,
    singleStreamTps: 80
  },
  custom: {
    key: 'custom',
    name: '自定义 GPU',
    hbmGB: 141,
    bandwidthGBps: 4.8,
    fp8TFLOPS: 989,
    tdpW: 700,
    rentPerHour: 3.5,
    reservedDiscountPct: 25,
    purchasePrice: 300000,
    coloPerNodeMonth: 1200,
    singleStreamTps: 60
  }
};

// DeepSeek 官方 API 价格（2026-08-16 峰谷分时方案，人民币/百万 token）
// 高峰价 = 非高峰价 × 2（Flash 与 Pro 一致）
const OFFICIAL_PRICING = {
  'v4-flash': {
    name: 'DeepSeek-V4-Flash 官方价（2026-08-16 起）',
    offpeak: { in: 1.5, cached: 0.05, out: 4.5 },
    peakMult: 2
  },
  'v4-pro': {
    name: 'DeepSeek-V4-Pro 官方价（2026-08-16 起）',
    offpeak: { in: 4.5, cached: 0.15, out: 13.5 },
    peakMult: 2
  }
};

// 各币种下的参考换算（仅用于展示；实际以用户填写为准）
const CURRENCY_RATE = { USD: 1, CNY: 7.2 };

function defaultState() {
  const gpu = deepClone(GPU_PRESETS.h200);
  const model = deepClone(MODEL_PRESETS['v4-flash']);
  return {
    version: 1,
    currency: 'USD',
    modelKey: 'v4-flash',
    model,
    gpuKey: 'h200',
    gpu,
    nodes: 5,
    gpusPerNode: 8,
    opt: {
      dsparkOn: true,
      dsparkSpeedup: 1.6,
      kvPoolOn: true,
      cacheHitPct: 70,
      offloadOn: true,
      hostKvGB: 1024,
      bwUtilPct: 45,
      prefillEffPct: 35,
      singleStreamTps: gpu.singleStreamTps,
      reserveGB: 16
    },
    biz: {
      mode: 'premium',           // official | premium | private | hybrid
      utilizationPct: 60,
      peakSharePct: 0,
      peakMult: 1,
      outputPrice: 3,            // USD/百万 token
      inputPrice: 0.3,
      cachedInputPrice: 0.03,
      privateNodes: 2,
      contractPerNodeMonth: 25000
    },
    cost: {
      rentMode: 'rent',          // rent | buy
      elecPerKWh: 0.10,
      pue: 1.4,
      idlePowerPct: 20,
      amortMonths: 36,
      maintPctPerYear: 3,
      coloPerNodeMonth: gpu.coloPerNodeMonth
    },
    sensitivity: {
      priceMin: 0.5,
      priceMax: 8,
      priceStep: 0.5,
      utilMin: 20,
      utilMax: 100,
      utilStep: 10,
      tornadoPct: 20
    }
  };
}

function applyGpuPreset(state, key) {
  const p = GPU_PRESETS[key] || GPU_PRESETS.h200;
  state.gpuKey = key;
  state.gpu = deepClone(p);
  state.opt.singleStreamTps = p.singleStreamTps;
  state.cost.coloPerNodeMonth = p.coloPerNodeMonth;
  if (key === 'b300' && state.opt.dsparkSpeedup > 2) state.opt.dsparkSpeedup = 2;
  return state;
}

function applyModelPreset(state, key) {
  const p = MODEL_PRESETS[key] || MODEL_PRESETS['v4-flash'];
  state.modelKey = key;
  state.model = deepClone(p);
  return state;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 把金额字段从一种币种换算到另一种（rate: 目标币种每 USD 单位，如 CNY=7.2）
function convertMoney(state, fromCurrency, toCurrency) {
  const fromRate = CURRENCY_RATE[fromCurrency] || 1;
  const toRate = CURRENCY_RATE[toCurrency] || 1;
  const f = toRate / fromRate;
  const moneyKeys = [
    ['gpu', 'rentPerHour'],
    ['gpu', 'purchasePrice'],
    ['gpu', 'coloPerNodeMonth'],
    ['biz', 'outputPrice'],
    ['biz', 'inputPrice'],
    ['biz', 'cachedInputPrice'],
    ['biz', 'contractPerNodeMonth'],
    ['cost', 'elecPerKWh'],
    ['cost', 'coloPerNodeMonth']
  ];
  for (const [a, b] of moneyKeys) {
    if (state[a] && typeof state[a][b] === 'number') state[a][b] = round2(state[a][b] * f);
  }
  state.currency = toCurrency;
  return state;
}

function round2(x) { return Math.round(x * 100) / 100; }

// 计算模型与硬件的关键中间量
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

// 计算单节点产能（含优化）
function computeNode(state) {
  const g = state.gpu, m = state.model, o = state.opt;
  const mm = computeModel(m);
  const bytesPerTok = mm.activeBytes + mm.kvBytesPerReq;
  const basePerGpu = (g.bandwidthGBps * 1e9) / bytesPerTok;
  const effPerGpu = basePerGpu * o.bwUtilPct / 100;
  const dsparkPerGpu = effPerGpu * (o.dsparkOn ? o.dsparkSpeedup : 1);
  const nodeDecode = dsparkPerGpu * state.gpusPerNode;
  const nodeDecodeNoDspark = effPerGpu * state.gpusPerNode;

  const flopsPerTok = 2 * m.activeParamsB * 1e9;
  const nodePrefill = g.fp8TFLOPS * 1e12 / flopsPerTok * state.gpusPerNode * o.prefillEffPct / 100;

  const nodeTheoretical = (g.bandwidthGBps * 1e9) / bytesPerTok * state.gpusPerNode;
  const requiredConcurrency = Math.max(1, Math.ceil(
    nodeTheoretical * o.bwUtilPct / 100 / o.singleStreamTps
  ));

  const hbmTotal = state.gpusPerNode * g.hbmGB;
  const hbmFree = hbmTotal - mm.weightGB - o.reserveGB;
  const hbmCap = hbmFree > 0 ? Math.floor(hbmFree / mm.kvGBPerReq) : 0;
  const offloadCap = o.offloadOn ? Math.floor(o.hostKvGB / mm.kvGBPerReq) : 0;

  return {
    ...mm,
    basePerGpu,
    effPerGpu,
    dsparkPerGpu,
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

// 价格混合（高峰/非高峰）
function blendedPrices(state) {
  const b = state.biz;
  const f = (base) => base * (1 + b.peakSharePct / 100 * (b.peakMult - 1));
  return { out: f(b.outputPrice), in: f(b.inputPrice), cached: f(b.cachedInputPrice) };
}

// 月度成本
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

  const powerPerGpu = g.tdpW / 1000 * hours * c.elecPerKWh * c.pue;
  const powerIdle = powerPerGpu * gpuH * c.idlePowerPct / 100;
  const powerVariable = powerPerGpu * gpuH * (1 - c.idlePowerPct / 100) * U;
  const power = powerIdle + powerVariable;
  const ops = nodes * c.coloPerNodeMonth;
  const total = rent + amort + maint + power + ops;

  return {
    rent, amort, maint, power, ops, total,
    powerIdle, powerVariable,
    fixedCost: rent + amort + maint + ops + powerIdle,
    varCostPerUnitU: powerVariable / (U || 1)
  };
}

// 计算完整收益结果
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

  // 单位负载率下的收益/成本斜率（用于盈亏平衡点）
  const outTokHPerNodeU1 = n.nodeDecode * 3600;
  const needInTokHPerNodeU1 = outTokHPerNodeU1 * state.model.inputOutputRatio;
  const inCapHPerNodeU1 = n.nodePrefill * 3600;
  const inTokHPerNodeU1 = Math.min(needInTokHPerNodeU1, inCapHPerNodeU1);
  const apiUnitRevPerM = (
    (outTokHPerNodeU1 * p.out + inTokHPerNodeU1 * (hit * p.cached + (1 - hit) * p.in)) / 1e6 * 730 * apiNodes
  );
  const powerPerUnitM = cost.varCostPerUnitU * (U > 0 ? U : 1); // 近似
  const denom = apiUnitRevPerM - powerPerUnitM;
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
  for (let u = s.utilMin; u <= s.utilMax + 1e-9; u += s.utilStep) usages.push(u);
  for (let p = s.priceMin; p <= s.priceMax + 1e-9; p += s.priceStep) prices.push(p);

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

function round1(x) { return Math.round(x * 10) / 10; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MODEL_PRESETS, GPU_PRESETS, OFFICIAL_PRICING, CURRENCY_RATE,
    defaultState, applyGpuPreset, applyModelPreset, convertMoney,
    computeModel, computeNode, calcCosts, calcResults,
    sensitivityMatrix, tornado, compareGpus, blendedPrices,
    round1, round2, deepClone
  };
}
