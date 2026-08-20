'use strict';

// ---------------------------------------------------------------------------
// 预设数据与状态工具（金额以“当前币种”存储；切换币种时由 app.js 转换）
// 数据日期：2026-08-20
// ---------------------------------------------------------------------------

const MODEL_PRESETS = {
  'v4-flash': {
    key: 'v4-flash',
    name: 'DeepSeek-V4-Flash（FP8）',
    shortName: 'V4-Flash FP8',
    desc: '284B 总参 / 13B 激活，MoE，MLA，1M 上下文，MIT 开源；FP8 权重约 284GB',
    totalParamsB: 284,
    activeParamsB: 13,
    bytesPerParam: 1.0,
    kvBytesPerToken: 584,
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 8
  },
  'v4-flash-fp4': {
    key: 'v4-flash-fp4',
    name: 'DeepSeek-V4-Flash（FP4+FP8 混合）',
    shortName: 'V4-Flash FP4',
    desc: 'FP4 专家 + FP8 注意力混合权重（盘上约 146GB），需支持 FP4 的 Blackwell 级 GPU',
    totalParamsB: 284,
    activeParamsB: 13,
    bytesPerParam: 0.5,
    kvBytesPerToken: 584,
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 3
  },
  'v4-pro': {
    key: 'v4-pro',
    name: 'DeepSeek-V4-Pro（FP8）',
    shortName: 'V4-Pro FP8',
    desc: '1.6T 总参 / 49B 激活，MoE，MLA，1M 上下文；FP8 权重约 1.6TB',
    totalParamsB: 1600,
    activeParamsB: 49,
    bytesPerParam: 1.0,
    kvBytesPerToken: 1024,
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 8
  },
  'v4-pro-fp4': {
    key: 'v4-pro-fp4',
    name: 'DeepSeek-V4-Pro（FP4+FP8 混合）',
    shortName: 'V4-Pro FP4',
    desc: 'FP4 混合权重约 800GB+，需 B300 级显存；KV 规格为估算值',
    totalParamsB: 1600,
    activeParamsB: 49,
    bytesPerParam: 0.5,
    kvBytesPerToken: 1024,
    contextLen: 1000000,
    avgInputLen: 4000,
    avgOutputLen: 512,
    inputOutputRatio: 4,
    overheadPct: 3
  },
  'custom': {
    key: 'custom',
    name: '自定义模型',
    shortName: '自定义',
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
    bandwidthTBps: 3.35,
    fp8TFLOPS: 989,
    tdpW: 700,
    rentPerHour: 2.5,
    reservedDiscountPct: 25,
    purchasePrice: 250000,
    coloPerNodeMonth: 1200,
    singleStreamTps: 50
  },
  h200: {
    key: 'h200',
    name: 'H200 SXM 141GB',
    hbmGB: 141,
    bandwidthTBps: 4.8,
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
    bandwidthTBps: 8.0,
    fp8TFLOPS: 7000,
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
    bandwidthTBps: 4.8,
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

const CURRENCY_RATE = { USD: 1, CNY: 7.2 };

function defaultState() {
  const gpu = deepClone(GPU_PRESETS.h200);
  const model = deepClone(MODEL_PRESETS['v4-flash']);
  return {
    version: 2,
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
      pdSplitOn: false,
      pdSplitGainPct: 15,
      singleStreamTps: gpu.singleStreamTps,
      reserveGB: 16
    },
    biz: {
      mode: 'premium',
      utilizationPct: 60,
      peakSharePct: 0,
      peakMult: 1,
      outputPrice: 3,
      inputPrice: 0.3,
      cachedInputPrice: 0.03,
      privateNodes: 2,
      contractPerNodeMonth: 25000
    },
    cost: {
      rentMode: 'rent',
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

// 金额字段从一种币种换算到另一种（rate: 目标币种每 USD 单位，如 CNY=7.2）
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MODEL_PRESETS, GPU_PRESETS, OFFICIAL_PRICING, CURRENCY_RATE,
    defaultState, applyGpuPreset, applyModelPreset, convertMoney,
    deepClone, round2
  };
}
