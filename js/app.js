'use strict';

const STORE_KEY = 'howmuch-state-v2';
const SNAP_KEY = 'howmuch-snapshot-v2';
const T = key => I18N.t(key);

const SOURCES = [
  { nameZh: 'DeepSeek-V4 发布与规格（V4-Pro 1.6T/49B、V4-Flash 284B/13B、1M 上下文、MIT）', nameEn: 'DeepSeek-V4 release & specs (V4-Pro 1.6T/49B, V4-Flash 284B/13B, 1M context, MIT)', url: 'https://developer.aliyun.com/article/1730877', date: '2026-04-23' },
  { nameZh: 'DeepSeek-V4 维基条目（许可证与版本）', nameEn: 'DeepSeek-V4 Wikipedia entry (license & versions)', url: 'https://zh.wikipedia.org/zh-tw/DeepSeek-V4', date: '2026-05-01' },
  { nameZh: 'vLLM PR #47716：DeepSeek-V4 FP8 MLA KV 布局为 584 字节/token', nameEn: 'vLLM PR #47716: DeepSeek-V4 FP8 MLA KV layout = 584 bytes/token', url: 'https://app.semanticdiff.com/gh/vllm-project/vllm/pull/47716/overview', date: '2026-07-05' },
  { nameZh: 'DeepSeek × 北大 DSpark：单用户提速 60–85%；严格延迟约束下吞吐最高 +661%', nameEn: 'DeepSeek × PKU DSpark: 60–85% single-user speedup; up to +661% throughput under strict latency SLA', url: 'https://pandaily.com/peking-university-deepseek-dspark-inference-efficiency-jun2026', date: '2026-06-27' },
  { nameZh: 'DSpark 技术细节：V4-Flash 提速 60–85%，V4-Pro 57–78%，80 tok/s SLA 下吞吐 +51%', nameEn: 'DSpark details: 60–85% on V4-Flash, 57–78% on V4-Pro, +51% throughput at 80 tok/s SLA', url: 'https://www.opensourceforu.com/2026/06/peking-university-deepseek-open-source-dspark/', date: '2026-06-28' },
  { nameZh: 'Mooncake（KVCache 分离架构）：Kimi 生产实测，满足 SLO 的请求数最多提升 75%，吞吐最高 +525%', nameEn: 'Mooncake (KVCache-centric disaggregation): Kimi production results, +75% SLO-satisfying requests, up to +525% throughput', url: 'https://github.com/ForceInjection/AI-fundamentals/blob/27500812c67b88db1e2f016a70183875a84050a9/09_inference_system/kv_cache/mooncake/mooncake_architecture.md', date: '2025-10' },
  { nameZh: 'Mooncake 基准：1P1D 配置峰值传输带宽 164.3 GB/s', nameEn: 'Mooncake benchmark: 164.3 GB/s peak transfer bandwidth in 1P1D setup', url: 'https://kvcache-ai.github.io/Mooncake/_sources/performance/sglang/sglang-benchmark-results-v1.md', date: '2026' },
  { nameZh: 'LMCache 在 AMD MI300X 多轮 Agent 负载：命中率 64–72%，TTFT 平均降低 4.4×，请求完成量 +1.6×', nameEn: 'LMCache on AMD MI300X agent workloads: 64–72% hit rate, 4.4× lower avg TTFT, +1.6× requests completed', url: 'https://blog.lmcache.ai/en/2026/05/12/benchmarking-lmcache-for-multi-turn-agentic-workloads-on-amd-mi300x/', date: '2026-05-12' },
  { nameZh: 'LMCache 预填充加速：高命中场景输入吞吐最高 +355.3%，TTFT 降低 58.8%', nameEn: 'LMCache prefill acceleration: up to +355.3% input throughput and −58.8% TTFT at high hit rates', url: 'https://docs.gpustack.ai/2.0/performance-lab/references/evaluating-lmcache-prefill-acceleration-in-vllm/', date: '2026' },
  { nameZh: 'NVIDIA B300：288GB HBM3e、8 TB/s 带宽；2026-07 按需租金约 $9.16/h，现货低至 $2.45/h', nameEn: 'NVIDIA B300: 288GB HBM3e, 8 TB/s; ~$9.16/h on-demand, from $2.45/h spot (Jul 2026)', url: 'https://www.spheron.network/blog/nvidia-b300-blackwell-ultra-guide/', date: '2026-07' },
  { nameZh: 'NVIDIA B300 租赁中位价 $8.75/h（Hashrate 数据库）', nameEn: 'NVIDIA B300 median rent $8.75/h (Hashrate database)', url: 'https://new.hashrate.no/db/gpus/nvidia_b300', date: '2026' },
  { nameZh: 'H200 按需价格区间 $1.45–13.78/h，市场中枢约 $3.95/h（2026-05）', nameEn: 'H200 on-demand $1.45–13.78/h, median ~$3.95/h (May 2026)', url: 'https://www.gmicloud.ai/en/blog/h200-gpu-cloud-rental-guide', date: '2026-05-27' },
  { nameZh: 'H100 2026 年租金中枢约 $2.29–3.12/h', nameEn: 'H100 2026 rent median ~$2.29–3.12/h', url: 'https://www.moduledge.com/blog/nvidia-hopper', date: '2026-06-06' },
  { nameZh: 'B300 8 卡整机月租（中国大陆市场，2026-08）：标准方案约 ¥30 万/月', nameEn: 'B300 8-GPU node monthly rent (mainland China, Aug 2026): ~¥300k/month', url: 'https://www.sohu.com/a/1060482614_122971846', date: '2026-08-08' },
  { nameZh: 'H200/H100 整机月租（中国大陆市场，2026-07）：H200 ¥6–10 万，H100 ¥4.5–8 万', nameEn: 'H200/H100 node monthly rent (mainland China, Jul 2026): H200 ¥60–100k, H100 ¥45–80k', url: 'https://guba.eastmoney.com/news,gssz,1753023710.html', date: '2026-07-31' },
  { nameZh: 'B300 功耗 1100–1400W，需液冷；H100/H200 700W', nameEn: 'B300 power 1100–1400W, liquid cooling required; H100/H200 700W', url: 'https://www.quotecolo.com/nvidia-dgx-ready-data-centers/', date: '2026-05-17' },
  { nameZh: '8 卡服务器采购价参考：H200 ≈ $45–58 万、B300 ≈ $75–100 万（Haink 2026-06）', nameEn: '8-GPU server purchase price: H200 ≈ $450–580k, B300 ≈ $750k–1M (Haink, Jun 2026)', url: 'https://haink.org/knowledge/technology/ai-infrastructure-cost-guide', date: '2026-06-10' },
  { nameZh: 'DeepSeek-V4 API 峰谷分时调价（2026-08-16 生效）：Flash 非高峰输入 ¥1.5/M、输出 ¥4.5/M、缓存命中 ¥0.05/M；高峰翻倍', nameEn: 'DeepSeek-V4 peak/off-peak API pricing (effective 2026-08-16): Flash off-peak input ¥1.5/M, output ¥4.5/M, cached ¥0.05/M; peak = 2×', url: 'https://news.qq.com/rain/a/20260817A08RSA00', date: '2026-08-17' },
  { nameZh: 'DeepSeek-V4 官方调价美元口径：Flash 非高峰输入 $0.22/M、输出 $0.66/M；高峰 $0.44/$1.32', nameEn: 'DeepSeek-V4 USD pricing: Flash off-peak input $0.22/M, output $0.66/M; peak $0.44/$1.32', url: 'https://www.zhiding.cn/ai-applications/2026/0818/3196693.shtml', date: '2026-08-18' }
];

const ASSUMPTIONS = [
  { key: 'assumption.dspark', src: 'src.official', values: s => ({ low: '1.3', typical: String(s.opt.dsparkSpeedup), high: '1.85' }) },
  { key: 'assumption.bwutil', src: 'src.estimate', values: s => ({ low: '35%', typical: s.opt.bwUtilPct + '%', high: '60%' }) },
  { key: 'assumption.hit', src: 'src.community', values: s => ({ low: '40%', typical: s.opt.cacheHitPct + '%', high: '90%' }) },
  { key: 'assumption.singleStream', src: 'src.estimate', values: s => ({ low: Math.round(s.opt.singleStreamTps * 0.8), typical: s.opt.singleStreamTps, high: Math.round(s.opt.singleStreamTps * 1.2) }) },
  { key: 'assumption.prefillEff', src: 'src.estimate', values: s => ({ low: '—', typical: s.opt.prefillEffPct + '%', high: '—' }) },
  { key: 'assumption.rent', src: 'src.market', values: s => ({ low: '—', typical: s.gpu.rentPerHour + '/GPU/h', high: '—' }) },
  { key: 'assumption.kvBytes', src: 'src.official', values: s => ({ low: s.model.kvBytesPerToken, typical: s.model.kvBytesPerToken, high: s.modelKey === 'v4-pro' || s.modelKey === 'v4-pro-fp4' ? '1024（估算）' : '—' }) }
];

const App = (() => {
  let state = loadState();
  let resetBtn = null;
  const $ = id => document.getElementById(id);

  const fieldMap = [
    ['model-total-params', s => s.model.totalParamsB, (s, v) => s.model.totalParamsB = v, 0.1, 100000],
    ['model-active-params', s => s.model.activeParamsB, (s, v) => s.model.activeParamsB = v, 0.01, 100000],
    ['model-bytes-per-param', s => s.model.bytesPerParam, (s, v) => s.model.bytesPerParam = v, 0.01, 4],
    ['model-kv-bytes', s => s.model.kvBytesPerToken, (s, v) => s.model.kvBytesPerToken = v, 1, 1e6],
    ['model-context-len', s => s.model.contextLen, (s, v) => s.model.contextLen = v, 1, 1e8],
    ['model-avg-input', s => s.model.avgInputLen, (s, v) => s.model.avgInputLen = v, 1, 1e7],
    ['model-avg-output', s => s.model.avgOutputLen, (s, v) => s.model.avgOutputLen = v, 1, 1e7],
    ['model-ratio', s => s.model.inputOutputRatio, (s, v) => s.model.inputOutputRatio = v, 0.01, 1000],
    ['model-overhead', s => s.model.overheadPct, (s, v) => s.model.overheadPct = v, 0, 500],
    ['gpu-nodes', s => s.nodes, (s, v) => s.nodes = v, 1, 128],
    ['gpu-per-node', s => s.gpusPerNode, (s, v) => s.gpusPerNode = v, 1, 16],
    ['gpu-hbm', s => s.gpu.hbmGB, (s, v) => s.gpu.hbmGB = v, 1, 10000],
    ['gpu-bw', s => s.gpu.bandwidthTBps, (s, v) => s.gpu.bandwidthTBps = v, 0.01, 100],
    ['gpu-fp8', s => s.gpu.fp8TFLOPS, (s, v) => s.gpu.fp8TFLOPS = v, 1, 1e6],
    ['gpu-tdp', s => s.gpu.tdpW, (s, v) => s.gpu.tdpW = v, 1, 10000],
    ['gpu-rent', s => s.gpu.rentPerHour, (s, v) => s.gpu.rentPerHour = v, 0, 1e6],
    ['gpu-discount', s => s.gpu.reservedDiscountPct, (s, v) => s.gpu.reservedDiscountPct = v, 0, 90],
    ['gpu-purchase', s => s.gpu.purchasePrice, (s, v) => s.gpu.purchasePrice = v, 0, 1e9],
    ['opt-single-stream', s => s.opt.singleStreamTps, (s, v) => s.opt.singleStreamTps = v, 1, 1e6],
    ['opt-dspark-speedup', s => s.opt.dsparkSpeedup, (s, v) => s.opt.dsparkSpeedup = v, 1, 3],
    ['opt-hit', s => s.opt.cacheHitPct, (s, v) => s.opt.cacheHitPct = v, 0, 99],
    ['opt-hostkv', s => s.opt.hostKvGB, (s, v) => s.opt.hostKvGB = v, 0, 1e6],
    ['opt-bwutil', s => s.opt.bwUtilPct, (s, v) => s.opt.bwUtilPct = v, 1, 99],
    ['opt-prefill-eff', s => s.opt.prefillEffPct, (s, v) => s.opt.prefillEffPct = v, 1, 100],
    ['opt-pd-gain', s => s.opt.pdSplitGainPct, (s, v) => s.opt.pdSplitGainPct = v, 0, 100],
    ['opt-reserve', s => s.opt.reserveGB, (s, v) => s.opt.reserveGB = v, 0, 1e6],
    ['biz-util', s => s.biz.utilizationPct, (s, v) => s.biz.utilizationPct = v, 0, 100],
    ['biz-peak-share', s => s.biz.peakSharePct, (s, v) => s.biz.peakSharePct = v, 0, 100],
    ['biz-peak-mult', s => s.biz.peakMult, (s, v) => s.biz.peakMult = v, 1, 10],
    ['biz-out-price', s => s.biz.outputPrice, (s, v) => s.biz.outputPrice = v, 0, 1e6],
    ['biz-in-price', s => s.biz.inputPrice, (s, v) => s.biz.inputPrice = v, 0, 1e6],
    ['biz-cached-price', s => s.biz.cachedInputPrice, (s, v) => s.biz.cachedInputPrice = v, 0, 1e6],
    ['biz-private-nodes', s => s.biz.privateNodes, (s, v) => s.biz.privateNodes = v, 0, 128],
    ['biz-contract', s => s.biz.contractPerNodeMonth, (s, v) => s.biz.contractPerNodeMonth = v, 0, 1e9],
    ['cost-elec', s => s.cost.elecPerKWh, (s, v) => s.cost.elecPerKWh = v, 0, 100],
    ['cost-pue', s => s.cost.pue, (s, v) => s.cost.pue = v, 1, 5],
    ['cost-idle', s => s.cost.idlePowerPct, (s, v) => s.cost.idlePowerPct = v, 0, 100],
    ['cost-amort', s => s.cost.amortMonths, (s, v) => s.cost.amortMonths = v, 1, 120],
    ['cost-maint', s => s.cost.maintPctPerYear, (s, v) => s.cost.maintPctPerYear = v, 0, 50],
    ['cost-residual', s => s.cost.residualPct, (s, v) => s.cost.residualPct = v, 0, 90],
    ['cost-colo', s => s.cost.coloPerNodeMonth, (s, v) => s.cost.coloPerNodeMonth = v, 0, 1e7],
    ['sens-price-min', s => s.sensitivity.priceMin, (s, v) => s.sensitivity.priceMin = v, 0, 1e6],
    ['sens-price-max', s => s.sensitivity.priceMax, (s, v) => s.sensitivity.priceMax = v, 0.01, 1e6],
    ['sens-price-step', s => s.sensitivity.priceStep, (s, v) => s.sensitivity.priceStep = v, 0.01, 1e6],
    ['sens-util-min', s => s.sensitivity.utilMin, (s, v) => s.sensitivity.utilMin = v, 0, 100],
    ['sens-util-max', s => s.sensitivity.utilMax, (s, v) => s.sensitivity.utilMax = v, 1, 100],
    ['sens-util-step', s => s.sensitivity.utilStep, (s, v) => s.sensitivity.utilStep = v, 1, 50],
    ['sens-tornado', s => s.sensitivity.tornadoPct, (s, v) => s.sensitivity.tornadoPct = v, 1, 100]
  ];

  // ---------- 状态 ----------

  function loadState() {
    const base = defaultState();
    const hashState = decodeHash();
    if (hashState) return Object.assign(base, migrateState(hashState));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.model && parsed.gpu) return Object.assign(base, migrateState(parsed));
      }
    } catch (e) { /* ignore */ }
    return base;
  }

  function migrateState(parsed) {
    if (parsed.gpu && parsed.gpu.bandwidthGBps !== undefined && parsed.gpu.bandwidthTBps === undefined) {
      parsed.gpu.bandwidthTBps = parsed.gpu.bandwidthGBps;
      delete parsed.gpu.bandwidthGBps;
    }
    return parsed;
  }

  function encodeState() {
    try {
      const json = JSON.stringify(state);
      return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      return '';
    }
  }

  function decodeHash() {
    const hash = location.hash.slice(1);
    if (!hash) return null;
    try {
      const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(b64)));
      const parsed = JSON.parse(json);
      return (parsed && parsed.model && parsed.gpu) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    const enc = encodeState();
    if (enc && enc.length < 12000) {
      try { history.replaceState(null, '', '#' + enc); } catch (e) { /* ignore */ }
    }
  }

  function currencySymbol() {
    return state.currency === 'CNY' ? '¥' : '$';
  }

  function fmtMoney(v, compact = false) {
    const sym = currencySymbol();
    const n = Number(v);
    if (!isFinite(n)) return '—';
    if (compact && Math.abs(n) >= 1e6) return sym + (n / 1e6).toFixed(2) + 'M';
    if (compact && Math.abs(n) >= 1e4) return sym + (n / 1e3).toFixed(1) + 'k';
    if (compact && Math.abs(n) >= 1000) return sym + (n / 1e3).toFixed(2) + 'k';
    if (Math.abs(n) < 1) return sym + n.toFixed(4);
    if (Math.abs(n) < 100) return sym + n.toFixed(2);
    return sym + Math.round(n).toLocaleString();
  }

  function fmtTok(v) {
    const n = Number(v);
    if (!isFinite(n)) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return Math.round(n).toLocaleString();
  }

  function fmtNum(v, digits = 0) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: digits });
  }

  function clamp(v, min, max) {
    const n = Number(v);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  // ---------- 表单 ----------

  function populateForm() {
    $('currency-select').value = state.currency;
    $('model-key').value = state.modelKey;
    $('gpu-key').value = state.gpuKey;
    $('biz-mode').value = state.biz.mode;
    $('cost-rent-mode').value = state.cost.rentMode;
    $('opt-dspark').checked = state.opt.dsparkOn;
    $('opt-kvpool').checked = state.opt.kvPoolOn;
    $('opt-offload').checked = state.opt.offloadOn;
    $('opt-pd').checked = state.opt.pdSplitOn;
    for (const [id, get] of fieldMap) {
      const el = $(id);
      if (el) el.value = get(state);
    }
    updateMoneyLabels();
    updateScenarioChips();
    updateModeDesc();
  }

  function collectForm() {
    state.modelKey = $('model-key').value;
    state.gpuKey = $('gpu-key').value;
    state.biz.mode = $('biz-mode').value;
    state.cost.rentMode = $('cost-rent-mode').value;
    state.opt.dsparkOn = $('opt-dspark').checked;
    state.opt.kvPoolOn = $('opt-kvpool').checked;
    state.opt.offloadOn = $('opt-offload').checked;
    state.opt.pdSplitOn = $('opt-pd').checked;
    for (const [id, get, set, min, max] of fieldMap) {
      const el = $(id);
      if (!el) continue;
      const v = parseFloat(el.value);
      if (isNaN(v)) continue;
      const clamped = clamp(v, min, max);
      set(state, clamped);
      el.value = clamped;
    }
    state.biz.privateNodes = Math.round(clamp(state.biz.privateNodes, 0, state.nodes));
    $('biz-private-nodes').value = state.biz.privateNodes;
    if (state.sensitivity.priceMax <= state.sensitivity.priceMin) {
      state.sensitivity.priceMax = state.sensitivity.priceMin + state.sensitivity.priceStep;
      $('sens-price-max').value = state.sensitivity.priceMax;
    }
    if (state.sensitivity.utilMax <= state.sensitivity.utilMin) {
      state.sensitivity.utilMax = state.sensitivity.utilMin + state.sensitivity.utilStep;
      $('sens-util-max').value = state.sensitivity.utilMax;
    }
    return state;
  }

  function updateMoneyLabels() {
    const sym = currencySymbol();
    document.querySelectorAll('.field.money input').forEach(inp => {
      const label = inp.closest('.field')?.querySelector('span');
      if (!label) return;
      const base = label.dataset.i18n ? I18N.t(label.dataset.i18n) : (label.dataset.base || label.textContent);
      label.dataset.base = base;
      label.textContent = `${base}（${sym}）`;
    });
  }

  function updateScenarioChips() {
    document.querySelectorAll('[data-scenario]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === state.biz.mode);
    });
  }

  function updateModeDesc() {
    const el = $('biz-mode-desc');
    if (el) el.textContent = I18N.t('modeDesc.' + state.biz.mode);
  }

  // ---------- 场景与预设 ----------

  function applyOfficialPrices() {
    const pricing = OFFICIAL_PRICING[state.modelKey] || OFFICIAL_PRICING['v4-flash'];
    const rate = CURRENCY_RATE[state.currency] || 1;
    const f = v => round2(v / 7.2 * rate);
    state.biz.outputPrice = f(pricing.offpeak.out);
    state.biz.inputPrice = f(pricing.offpeak.in);
    state.biz.cachedInputPrice = f(pricing.offpeak.cached);
    state.biz.peakMult = pricing.peakMult;
    state.biz.peakSharePct = 33;
    state.biz.mode = 'official';
  }

  function applyScenario(scenario) {
    const rate = CURRENCY_RATE[state.currency] || 1;
    if (scenario === 'official') {
      applyOfficialPrices();
    } else if (scenario === 'premium') {
      state.biz.mode = 'premium';
      state.biz.outputPrice = round2(3 * rate);
      state.biz.inputPrice = round2(0.3 * rate);
      state.biz.cachedInputPrice = round2(0.03 * rate);
      state.biz.peakSharePct = 0;
      state.biz.peakMult = 1;
      state.biz.privateNodes = 0;
    } else if (scenario === 'private') {
      state.biz.mode = 'private';
      state.biz.privateNodes = state.nodes;
      state.biz.contractPerNodeMonth = round2(25000 * rate);
    } else if (scenario === 'hybrid') {
      state.biz.mode = 'hybrid';
      state.biz.privateNodes = Math.min(2, state.nodes);
      state.biz.contractPerNodeMonth = round2(25000 * rate);
      state.biz.outputPrice = round2(3 * rate);
      state.biz.inputPrice = round2(0.3 * rate);
      state.biz.cachedInputPrice = round2(0.03 * rate);
      state.biz.peakSharePct = 0;
      state.biz.peakMult = 1;
    }
    if (scenario === 'private') {
      state.sensitivity.priceMin = 5;
      state.sensitivity.priceMax = 50;
      state.sensitivity.priceStep = 5;
    } else {
      state.sensitivity.priceMin = 0.5;
      state.sensitivity.priceMax = 8;
      state.sensitivity.priceStep = 0.5;
    }
    populateForm();
    renderAll();
  }

  function applyReliability(level) {
    const presets = {
      conservative: { dspark: 1.3, bwutil: 35, hit: 40 },
      neutral: { dspark: 1.6, bwutil: 45, hit: 70 },
      optimistic: { dspark: 1.85, bwutil: 60, hit: 90 }
    }[level];
    if (!presets) return;
    state.opt.dsparkSpeedup = presets.dspark;
    state.opt.bwUtilPct = presets.bwutil;
    state.opt.cacheHitPct = presets.hit;
    document.querySelectorAll('[data-reliability]').forEach(b => b.classList.toggle('active', b.dataset.reliability === level));
    populateForm();
    renderAll();
    toast(I18N.t('scenario.' + level) + ' ✓');
  }

  // ---------- 渲染 ----------

  function renderAll() {
    collectForm();
    saveState();
    renderMiniSummary();
    renderCapacity();
    renderProfit();
    renderSensitivity();
    renderSnapshot();
    renderAssumptions();
    updateOfficialHint();
    updateModeDesc();
  }

  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 120);
  }

  function kpi(label, value, cls = '', sub = '') {
    return `<div class="kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  }

  function renderMiniSummary() {
    const r = calcResults(state);
    const modeLabel = I18N.t('modeLabel.' + state.biz.mode);
    const be = r.breakEvenUtil === null
      ? (state.biz.mode === 'private' ? '—' : I18N.t('be.unreachable'))
      : (r.breakEvenUtil > 100 ? I18N.t('be.over100') : fmtNum(r.breakEvenUtil, 0) + '%');
    const profitCls = r.profitPerM >= 0 ? 'good' : 'bad';
    $('mini-summary').innerHTML = `
      <div class="ms-item"><span class="ms-label">${I18N.t('mini.plan')}</span><span class="ms-value">${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes} · ${modeLabel}</span></div>
      <div class="ms-item"><span class="ms-label">${I18N.t('mini.profit')}</span><span class="ms-value ${profitCls}">${fmtMoney(r.profitPerM, true)}</span></div>
      <div class="ms-item"><span class="ms-label">${I18N.t('mini.be')}</span><span class="ms-value">${be}</span></div>
      <div class="ms-item"><span class="ms-label">${I18N.t('mini.outH')}</span><span class="ms-value">${fmtTok(r.outTokH)}</span></div>
      <div class="ms-item"><span class="ms-label">${I18N.t('mini.costPerM')}</span><span class="ms-value">${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)}</span></div>
      <button class="btn small" id="mini-goto-profit">${I18N.t('btn.gotoProfit')}</button>`;
    $('mini-goto-profit').addEventListener('click', () => switchTab('profit'));
  }

  function renderCapacity() {
    const r = calcResults(state);
    const n = r.node;
    const outTokHPerNode = n.nodeDecode * 3600;
    const inTokHPerNode = Math.min(outTokHPerNode * state.model.inputOutputRatio, n.nodePrefill * 3600);

    const warns = [];
    if (!n.fits) warns.push(I18N.t('warn.notFit', { a: fmtNum(n.weightGB + state.opt.reserveGB, 0), b: fmtNum(n.hbmTotal, 0) }));
    if (n.hbmCap === 0 && n.fits) warns.push(I18N.t('warn.kvZero'));
    if (!state.opt.dsparkOn) warns.push(I18N.t('warn.dsparkOff'));
    if (state.opt.kvPoolOn && state.opt.cacheHitPct < 20) warns.push(I18N.t('warn.lowHit'));
    if (state.opt.pdSplitOn) warns.push(I18N.t('warn.pdOn'));
    if ((state.modelKey === 'v4-flash-fp4' || state.modelKey === 'v4-pro-fp4') && (state.gpuKey === 'h100' || state.gpuKey === 'h200')) {
      warns.push(I18N.t('warn.fp4'));
    }
    $('capacity-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    $('capacity-kpis').innerHTML =
      kpi(I18N.t('kpi.weight'), fmtNum(n.weightGB, 0) + ' GB', n.fits ? '' : 'bad',
        I18N.t('kpi.weightSub', { t: fmtNum(n.hbmTotal, 0), f: fmtNum(n.hbmFree, 0) })) +
      kpi(I18N.t('kpi.kv'), fmtNum(n.kvMBPerReq, 2) + ' MB', '', I18N.t('kpi.kvSub', { v: fmtNum(n.ctxLen, 0) })) +
      kpi(I18N.t('kpi.decode'), fmtNum(n.nodeDecode, 0) + ' tok/s', 'good',
        I18N.t('kpi.decodeSub', {
          v: fmtNum(n.nodeDecodeNoDspark, 0),
          extra: state.opt.pdSplitOn ? I18N.t('kpi.pdExtra', { f: n.pdFactor.toFixed(2) }) : ''
        })) +
      kpi(I18N.t('kpi.outH'), fmtTok(outTokHPerNode), 'good', I18N.t('kpi.outHSub')) +
      kpi(I18N.t('kpi.inH'), fmtTok(inTokHPerNode), '', I18N.t('kpi.inHSub')) +
      kpi(I18N.t('kpi.concurrency'), fmtNum(n.requiredConcurrency, 0) + ' ' + I18N.t('unit.concurrent'), 'warn', I18N.t('kpi.concSub', { v: fmtNum(state.opt.singleStreamTps, 0) })) +
      kpi(I18N.t('kpi.kvCap'), fmtNum(n.kvCapTotal, 0) + ' ' + I18N.t('unit.concurrent'), '', I18N.t('kpi.kvCapSub', { h: fmtNum(n.hbmCap, 0), o: fmtNum(n.offloadCap, 0) })) +
      kpi(I18N.t('kpi.revH'), fmtMoney(r.revPerHPerNode, true), '', I18N.t('kpi.revHSub', { v: fmtMoney(r.maxRevPerHPerApiNode, true) }));

    const rows = [
      [I18N.t('detail.bw'), fmtNum(state.gpu.bandwidthTBps, 2)],
      [I18N.t('detail.bytesPerTok'), fmtNum(n.activeBytes / 1e9 + n.kvBytesPerReq / 1e9, 2) + ' GB',
        `active ${fmtNum(n.activeBytes / 1e9, 1)} GB + KV ${fmtNum(n.kvBytesPerReq / 1e6, 1)} MB`],
      [I18N.t('detail.base'), fmtNum(n.basePerGpu, 0) + ' tok/s'],
      [I18N.t('detail.eff'), fmtNum(n.effPerGpu, 0) + ' tok/s'],
      [I18N.t('detail.nodeDecode'), fmtNum(n.nodeDecode, 0) + ' tok/s'],
      [I18N.t('detail.nodePrefill'), fmtNum(n.nodePrefill, 0) + ' tok/s'],
      [I18N.t('detail.outH'), fmtTok(outTokHPerNode)],
      [I18N.t('detail.inH'), fmtTok(inTokHPerNode)],
      [I18N.t('detail.prefillSaved'), fmtTok(r.prefillSavedTokH) + '/h',
        state.opt.kvPoolOn ? `hit ${state.opt.cacheHitPct}%` : 'KV pool off'],
      [I18N.t('detail.mem'), `${fmtNum(n.weightGB, 0)} GB + ${fmtNum(state.opt.reserveGB, 0)} GB`, `${fmtNum(n.hbmFree, 0)} GB free`],
      [I18N.t('detail.kvHbm'), fmtNum(n.hbmCap, 0) + ' ' + I18N.t('unit.concurrent')],
      [I18N.t('detail.kvOffload'), fmtNum(n.offloadCap, 0) + ' ' + I18N.t('unit.concurrent')],
      [I18N.t('detail.practical'), Math.min(n.kvCapTotal, Math.max(n.requiredConcurrency * 4, n.requiredConcurrency)) + ' ' + I18N.t('unit.concurrent'), I18N.t('detail.engNote')]
    ];
    $('capacity-detail').innerHTML =
      '<table><thead><tr><th>' + I18N.t('table.item') + '</th><th>' + I18N.t('table.value') + '</th><th>' + I18N.t('table.note') + '</th></tr></thead><tbody>' +
      rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="muted">${c || ''}</td></tr>`).join('') +
      '</tbody></table>';

    Charts.mount('chart-throughput', Charts.throughputOption(n));
  }

  function renderProfit() {
    const r = calcResults(state);
    const warns = [];
    if (r.inCapped) warns.push(I18N.t('warn.inCapped'));
    if (r.apiNodes > 0 && r.breakEvenUtil === null) warns.push(I18N.t('warn.noBe'));
    if (r.apiNodes > 0 && r.breakEvenUtil !== null && r.breakEvenUtil > 100) warns.push(I18N.t('warn.beOver100', { v: fmtNum(r.breakEvenUtil, 0) }));
    if (state.biz.mode === 'official') warns.push(I18N.t('warn.official'));
    if (state.biz.mode === 'hybrid' && r.privateNodes === 0) warns.push(I18N.t('warn.hybridNoPrivate'));
    $('profit-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    const modeLabel = I18N.t('modeLabel.' + state.biz.mode);
    const profitLabel = state.biz.mode === 'official' ? I18N.t('kpi.profitOfficial') : I18N.t('kpi.profit');
    $('profit-kpis').innerHTML =
      kpi(I18N.t('kpi.revenue'), fmtMoney(r.revenuePerM, true), '', I18N.t('kpi.revenueSub', { mode: modeLabel, a: r.apiNodes, p: r.privateNodes })) +
      kpi(I18N.t('kpi.cost'), fmtMoney(r.cost.total, true), '', I18N.t('kpi.costSub', {
        r: fmtMoney(r.cost.rent + r.cost.amort + r.cost.maint, true),
        p: fmtMoney(r.cost.power, true),
        o: fmtMoney(r.cost.ops, true)
      })) +
      kpi(profitLabel, fmtMoney(r.profitPerM, true), r.profitPerM >= 0 ? 'good' : 'bad',
        I18N.t('kpi.profitSub', { v: fmtMoney(r.revenuePerH - r.cost.total / 730, true) })) +
      kpi(I18N.t('kpi.margin'), r.margin === null ? '—' : fmtNum(r.margin, 1) + '%', r.margin !== null && r.margin >= 0 ? 'good' : 'bad') +
      kpi(I18N.t('kpi.beUtil'), r.breakEvenUtil === null ? (state.biz.mode === 'private' ? '—' : I18N.t('be.unreachable')) : fmtNum(r.breakEvenUtil, 0) + '%',
        r.breakEvenUtil !== null && r.breakEvenUtil <= 100 ? 'good' : 'warn') +
      kpi(I18N.t('kpi.bePrice'), r.breakEvenPrice === null ? '—' : fmtMoney(r.breakEvenPrice, false), '',
        I18N.t('kpi.bePriceSub', { v: fmtNum(state.biz.utilizationPct, 0) })) +
      kpi(I18N.t('kpi.beContract'), r.breakEvenContract === null ? '—' : fmtMoney(r.breakEvenContract, false), '', I18N.t('kpi.beContractSub')) +
      kpi(I18N.t('kpi.costPerM'), r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut), '',
        r.revPerMOut === null ? '' : I18N.t('kpi.costPerMSub', { v: fmtMoney(r.revPerMOut) })) +
      kpi(I18N.t('kpi.outM'), fmtTok(r.outTokM), '', I18N.t('kpi.outMSub', { i: fmtTok(r.inTokM), b: fmtTok(r.billableTokM) })) +
      kpi(I18N.t('kpi.payback'), r.paybackMonths === null ? '—' : fmtNum(r.paybackMonths, 1) + ' ' + I18N.t('unit.months'),
        r.paybackMonths !== null && r.paybackMonths <= 36 ? 'good' : 'warn',
        state.cost.rentMode === 'buy' ? I18N.t('kpi.paybackSub') : I18N.t('kpi.paybackSubRent'));

    $('unit-econ').innerHTML = `
      <table>
        <thead><tr><th>${I18N.t('unit.metric')}</th><th>${I18N.t('unit.value')}</th><th>${I18N.t('unit.caliber')}</th></tr></thead>
        <tbody>
          <tr><td>${I18N.t('unit.outM')}</td><td>${fmtTok(r.outTokM)}</td><td>${I18N.t('unit.caliber.out')}</td></tr>
          <tr><td>${I18N.t('unit.inM')}</td><td>${fmtTok(r.inTokM)}</td><td>${I18N.t('unit.caliber.in')}</td></tr>
          <tr><td>${I18N.t('unit.costPerM')}</td><td>${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)}</td><td>${I18N.t('unit.caliber.cost')}</td></tr>
          <tr><td>${I18N.t('unit.revPerM')}</td><td>${r.revPerMOut === null ? '—' : fmtMoney(r.revPerMOut)}</td><td>${I18N.t('unit.caliber.rev')}</td></tr>
          <tr><td>${I18N.t('unit.profitPerM')}</td><td class="${r.profitPerMOut !== null && r.profitPerMOut >= 0 ? 'num-good' : 'num-bad'}">${r.profitPerMOut === null ? '—' : fmtMoney(r.profitPerMOut)}</td><td>${I18N.t('unit.caliber.profit')}</td></tr>
        </tbody>
      </table>`;

    const rb = rentBuyCompare(state, state.cost.amortMonths, state.cost.residualPct);
    $('rent-buy-wrap').innerHTML = `
      <table>
        <thead><tr><th></th><th>${I18N.t('rb.monthsTotal', { m: rb.months })}</th><th>${I18N.t('rb.monthly')}</th><th>${I18N.t('rb.note')}</th></tr></thead>
        <tbody>
          <tr><td>${I18N.t('rb.rent')}</td><td>${fmtMoney(rb.rentTotal, true)}</td><td>${fmtMoney(rb.rentMonthly, true)}</td><td>${I18N.t('rb.rentNote', { d: fmtNum(state.gpu.reservedDiscountPct, 0) })}</td></tr>
          <tr><td>${I18N.t('rb.buy')}</td><td>${fmtMoney(rb.buyTotal, true)}</td><td>${fmtMoney(rb.buyMonthly, true)}</td><td>${I18N.t('rb.buyNote', { r: fmtNum(state.cost.residualPct, 0), v: fmtMoney(rb.residualValue, true) })}</td></tr>
        </tbody>
      </table>
      <p class="muted small">${rb.buySaving > 0
        ? I18N.t('rb.buyBetter', { m: rb.months, v: fmtMoney(rb.buySaving, true), p: fmtNum(rb.buySaving / Math.max(rb.rentTotal, 1) * 100, 0) })
        : I18N.t('rb.rentBetter', { m: rb.months, v: fmtMoney(-rb.buySaving, true) })}</p>`;

    Charts.mount('chart-cost', Charts.costOption(r.cost, state.currency));
    Charts.mount('chart-profit-curve', Charts.profitCurveOption(profitCurve(state), state.currency, r.breakEvenUtil));

    const cmp = compareGpus(state);
    $('gpu-compare').innerHTML =
      '<table><thead><tr>' +
      ['cmp.gpu', 'cmp.decode', 'cmp.outH', 'cmp.billableH', 'cmp.rev', 'cmp.cost', 'cmp.profit', 'cmp.profitNode', 'cmp.be', 'cmp.fits']
        .map(k => `<th>${I18N.t(k)}</th>`).join('') +
      '</tr></thead><tbody>' +
      cmp.map(c => `<tr>
        <td>${c.name}</td>
        <td>${fmtNum(c.decodeTps, 0)}</td>
        <td>${fmtTok(c.outTokH)}</td>
        <td>${fmtTok(c.billableTokH)}</td>
        <td>${fmtMoney(c.revPerM, true)}</td>
        <td>${fmtMoney(c.costPerM, true)}</td>
        <td class="${c.profitPerM >= 0 ? 'num-good' : 'num-bad'}">${fmtMoney(c.profitPerM, true)}</td>
        <td class="${c.profitPerNode >= 0 ? 'num-good' : 'num-bad'}">${fmtMoney(c.profitPerNode, true)}</td>
        <td>${c.breakEvenUtil === null ? '—' : fmtNum(c.breakEvenUtil, 0) + '%'}</td>
        <td>${c.fits ? '✅' : '❌ ' + I18N.t('cmp.fitsNo')}</td>
      </tr>`).join('') + '</tbody></table>';
  }

  function renderSnapshot() {
    const wrap = $('snapshot-compare');
    let snap = null;
    try {
      const raw = localStorage.getItem(SNAP_KEY);
      if (raw) snap = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!snap || !snap.model || !snap.gpu) {
      wrap.innerHTML = `<p class="muted small">${I18N.t('snapshot.empty')}</p>`;
      return;
    }
    snap = Object.assign(defaultState(), migrateState(snap));
    if (snap.currency !== state.currency) convertMoney(snap, snap.currency, state.currency);
    const cur = calcResults(state);
    const old = calcResults(snap);
    const modeLabel = m => I18N.t('modeLabel.' + m);
    const be = r => r.breakEvenUtil === null ? (r.apiNodes === 0 ? '—' : I18N.t('be.unreachable')) : fmtNum(r.breakEvenUtil, 0) + '%';
    const rows = [
      [I18N.t('snap.plan'), `${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes}`, `${snap.model.shortName || snap.model.name} · ${snap.gpu.name} ×${snap.nodes}`],
      [I18N.t('snap.mode'), modeLabel(state.biz.mode), modeLabel(snap.biz.mode)],
      [I18N.t('snap.util'), fmtNum(state.biz.utilizationPct, 0) + '%', fmtNum(snap.biz.utilizationPct, 0) + '%'],
      [I18N.t('snap.rev'), fmtMoney(cur.revenuePerM, true), fmtMoney(old.revenuePerM, true)],
      [I18N.t('snap.cost'), fmtMoney(cur.cost.total, true), fmtMoney(old.cost.total, true)],
      [I18N.t('snap.profit'), fmtMoney(cur.profitPerM, true), fmtMoney(old.profitPerM, true)],
      [I18N.t('snap.margin'), cur.margin === null ? '—' : fmtNum(cur.margin, 1) + '%', old.margin === null ? '—' : fmtNum(old.margin, 1) + '%'],
      [I18N.t('snap.be'), be(cur), be(old)],
      [I18N.t('snap.outH'), fmtTok(cur.outTokH), fmtTok(old.outTokH)],
      [I18N.t('snap.costPerM'), cur.costPerMOut === null ? '—' : fmtMoney(cur.costPerMOut), old.costPerMOut === null ? '—' : fmtMoney(old.costPerMOut)]
    ];
    wrap.innerHTML =
      '<table><thead><tr><th>' + I18N.t('snapshot.metric') + '</th><th>' + I18N.t('snapshot.current') + '</th><th>' + I18N.t('snapshot.snapshot') + '</th></tr></thead><tbody>' +
      rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('') +
      '</tbody></table>';
  }

  function saveSnapshot() {
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    renderSnapshot();
    toast(I18N.t('toast.snapshotSaved'));
  }

  function clearSnapshot() {
    try { localStorage.removeItem(SNAP_KEY); } catch (e) { /* ignore */ }
    renderSnapshot();
    toast(I18N.t('toast.snapshotCleared'));
  }

  function renderSensitivity() {
    const matrix = sensitivityMatrix(state);
    const tornadoItems = tornado(state);
    const sym = currencySymbol();
    const values = matrix.rows.flat();
    const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));

    $('heatmap-title').textContent = matrix.isPrivate ? I18N.t('sensitivity.titlePrivate') : I18N.t('sensitivity.title');
    $('tornado-title').textContent = I18N.t('sensitivity.tornadoTitle', { pct: state.sensitivity.tornadoPct });

    const cell = v => {
      const a = Math.min(0.85, Math.abs(v) / maxAbs);
      const bg = v >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})`;
      const fg = a > 0.45 ? '#fff' : '#e8edff';
      return `<td style="background:${bg};color:${fg}">${fmtMoney(v, true)}</td>`;
    };

    $('heatmap-wrap').innerHTML =
      '<table><thead><tr><th>' + I18N.t('field.util') + ' \\ ' + (matrix.isPrivate ? I18N.t('field.contract') : I18N.t('field.outPrice')) + '</th>' +
      matrix.prices.map(p => `<th>${matrix.isPrivate ? fmtNum(p * 1000, 0) : fmtNum(p, 2)}</th>`).join('') +
      '</tr></thead><tbody>' +
      matrix.usages.map((u, i) => `<tr><th>${fmtNum(u, 0)}%</th>${matrix.rows[i].map(cell).join('')}</tr>`).join('') +
      '</tbody></table>';
    $('heatmap-legend').innerHTML =
      `<div class="hm-legend"><span>${I18N.t('sensitivity.legendLoss')}</span><div class="hm-gradient"></div><span>${I18N.t('sensitivity.legendGain')}</span>` +
      `<span class="muted small">${I18N.t('sensitivity.legendNote', { sym })}</span></div>`;

    Charts.mount('chart-tornado', Charts.tornadoOption(tornadoItems, state.currency, state.sensitivity.tornadoPct));
  }

  function renderAssumptions() {
    const rows = ASSUMPTIONS.map(a => {
      const v = a.values(state);
      return `<tr>
        <td>${I18N.t(a.key)}</td>
        <td>${v.low}</td>
        <td>${v.typical}</td>
        <td>${v.high}</td>
        <td>${I18N.t(a.src)}</td>
      </tr>`;
    }).join('');
    $('assumptions-wrap').innerHTML =
      `<table>
        <thead><tr><th>${I18N.t('assumption.param')}</th><th>${I18N.t('assumption.low')}</th><th>${I18N.t('assumption.typical')}</th><th>${I18N.t('assumption.high')}</th><th>${I18N.t('assumption.sourceType')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function updateOfficialHint() {
    const pricing = OFFICIAL_PRICING[state.modelKey] || OFFICIAL_PRICING['v4-flash'];
    const rate = CURRENCY_RATE[state.currency] || 1;
    const f = v => round2(v / 7.2 * rate);
    const p = pricing.offpeak;
    const officialOut = f(p.out);
    const modelName = (state.modelKey === 'v4-pro' || state.modelKey === 'v4-pro-fp4') ? I18N.t('official.modelPro') : I18N.t('official.modelFlash');
    const compareOut = state.biz.outputPrice > 0
      ? (state.biz.outputPrice >= officialOut
        ? I18N.t('official.compareHigher', { price: fmtMoney(state.biz.outputPrice), ref: fmtMoney(officialOut), x: fmtNum(state.biz.outputPrice / officialOut, 1) })
        : I18N.t('official.compareLower', { price: fmtMoney(state.biz.outputPrice), ref: fmtMoney(officialOut) }))
      : '';
    $('biz-note').textContent = I18N.t('official.ref', {
      model: modelName,
      in: fmtMoney(f(p.in)),
      out: fmtMoney(officialOut),
      cached: fmtMoney(f(p.cached)),
      mult: pricing.peakMult
    }) + (compareOut ? ' ' + compareOut + (I18N.getLang() === 'zh' ? '。' : '.') : '');
  }

  function renderSources() {
    const en = I18N.getLang() === 'en';
    $('source-list').innerHTML = SOURCES.map(s =>
      `<li>${en ? s.nameEn : s.nameZh}（${s.date}）<br><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></li>`
    ).join('');
  }

  // ---------- 导入导出 / 分享 / 打印 ----------

  function exportConfig() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'howmuch-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.model || !parsed.gpu || !parsed.biz) throw new Error('bad config');
        state = Object.assign(defaultState(), migrateState(parsed));
        populateForm();
        renderAll();
        toast(I18N.t('toast.imported'));
      } catch (e) {
        toast(I18N.t('toast.importFail') + e.message, true);
      }
    };
    reader.readAsText(file);
  }

  function shareLink() {
    const url = location.href.split('#')[0] + '#' + encodeState();
    copyText(url, () => toast(I18N.t('toast.copiedLink')));
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast(I18N.t('toast.copyFail'), true); }
    document.body.removeChild(ta);
  }

  function copySummary() {
    const r = calcResults(state);
    const modeLabel = I18N.t('modeLabel.' + state.biz.mode);
    const be = r.breakEvenUtil === null
      ? (state.biz.mode === 'private' ? '—' : I18N.t('be.unreachable'))
      : (r.breakEvenUtil > 100 ? I18N.t('be.over100') : fmtNum(r.breakEvenUtil, 0) + '%');
    const title = I18N.t('app.title');
    const lines = [
      `# ${title}`,
      '',
      `- ${I18N.t('mini.plan')}: ${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes} ${I18N.t('copy.nodes')} (${state.gpusPerNode} ${I18N.t('copy.gpusPerNode')}) · ${modeLabel}`,
      `- ${I18N.t('copy.revCostProfit')}: ${fmtMoney(r.revenuePerM, true)} / ${fmtMoney(r.cost.total, true)} / ${fmtMoney(r.profitPerM, true)} (${r.margin === null ? '—' : fmtNum(r.margin, 1) + '%'})`,
      `- ${I18N.t('mini.be')}: ${be}`,
      `- ${I18N.t('unit.costPerM')}: ${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)} | ${I18N.t('copy.outPrice')}: ${fmtMoney(state.biz.outputPrice)}/M`,
      `- ${I18N.t('copy.tokensMonth')}: output ${fmtTok(r.outTokM)} / input ${fmtTok(r.inTokM)} / billable ${fmtTok(r.billableTokM)}`,
      `- ${I18N.t('copy.keyParams')}: ${I18N.t('copy.utilization')} ${fmtNum(state.biz.utilizationPct, 0)}%, ${I18N.t('copy.cacheHit')} ${state.opt.kvPoolOn ? state.opt.cacheHitPct : 0}%, DSpark ×${state.opt.dsparkOn ? state.opt.dsparkSpeedup : 1}, ${I18N.t('copy.bwUtil')} ${state.opt.bwUtilPct}%`,
      `- ${I18N.t('copy.generated')}: ${new Date().toLocaleString()} | ${location.href.split('#')[0]}`
    ].join('\n');
    copyText(lines, () => toast(I18N.t('toast.copiedSummary')));
  }

  let toastTimer = null;
  function toast(msg, isError = false) {
    let el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function printReport() {
    const after = () => {
      document.body.classList.remove('printing');
      const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'setup';
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + activeTab));
      setTimeout(() => Charts.resizeAll(), 60);
    };
    document.body.classList.add('printing');
    document.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('active'));
    setTimeout(() => Charts.resizeAll(), 60);
    window.addEventListener('afterprint', after, { once: true });
    window.print();
    setTimeout(after, 1200);
  }

  // ---------- 标签页 ----------

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    setTimeout(() => Charts.resizeAll(), 80);
  }

  function initTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // ---------- 初始化 ----------

  function init() {
    if (!window.echarts) {
      document.querySelectorAll('.chart').forEach(el => {
        el.innerHTML = '<div class="warning-box">Chart library unavailable — tables & calculations still work.</div>';
      });
    }
    I18N.applyStatic();
    populateForm();
    renderSources();
    initTabs();

    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => I18N.setLang(btn.dataset.lang));
    });
    document.addEventListener('i18n:changed', () => {
      populateForm();
      renderAll();
      renderSources();
      if (resetBtn) resetBtn.textContent = I18N.t('btn.reset');
    });

    $('currency-select').addEventListener('change', e => {
      const from = state.currency;
      const to = e.target.value;
      if (from !== to) {
        collectForm();
        convertMoney(state, from, to);
        populateForm();
        renderAll();
      }
    });

    $('model-key').addEventListener('change', e => {
      applyModelPreset(state, e.target.value);
      populateForm();
      renderAll();
    });

    $('gpu-key').addEventListener('change', e => {
      applyGpuPreset(state, e.target.value);
      state.cost.coloPerNodeMonth = round2(state.gpu.coloPerNodeMonth * (CURRENCY_RATE[state.currency] / CURRENCY_RATE.USD));
      populateForm();
      renderAll();
    });

    $('biz-mode').addEventListener('change', () => {
      if ($('biz-mode').value === 'private') {
        $('sens-price-min').value = 5;
        $('sens-price-max').value = 50;
        $('sens-price-step').value = 5;
      } else {
        $('sens-price-min').value = 0.5;
        $('sens-price-max').value = 8;
        $('sens-price-step').value = 0.5;
      }
    });

    document.querySelectorAll('#panel-setup input, #panel-setup select').forEach(el => {
      el.addEventListener('input', scheduleRender);
      el.addEventListener('change', renderAll);
    });

    document.querySelectorAll('[data-scenario]').forEach(btn => {
      btn.addEventListener('click', () => applyScenario(btn.dataset.scenario));
    });
    document.querySelectorAll('[data-reliability]').forEach(btn => {
      btn.addEventListener('click', () => applyReliability(btn.dataset.reliability));
    });

    $('btn-export').addEventListener('click', exportConfig);
    $('btn-import').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', e => {
      if (e.target.files[0]) importConfig(e.target.files[0]);
      e.target.value = '';
    });
    $('btn-share').addEventListener('click', shareLink);
    $('btn-print').addEventListener('click', printReport);
    $('btn-copy').addEventListener('click', copySummary);
    $('btn-save-snapshot').addEventListener('click', saveSnapshot);
    $('btn-clear-snapshot').addEventListener('click', clearSnapshot);

    resetBtn = document.createElement('button');
    resetBtn.className = 'btn ghost small';
    resetBtn.textContent = I18N.t('btn.reset');
    resetBtn.addEventListener('click', () => {
      state = defaultState();
      populateForm();
      renderAll();
      toast(I18N.t('toast.reset'));
    });
    document.querySelector('.header-actions').appendChild(resetBtn);

    renderAll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
