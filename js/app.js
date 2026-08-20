'use strict';

const STORE_KEY = 'howmuch-state-v2';
const SNAP_KEY = 'howmuch-snapshot-v2';

const SOURCES = [
  { name: 'DeepSeek-V4 发布与规格（V4-Pro 1.6T/49B、V4-Flash 284B/13B、1M 上下文、MIT）', url: 'https://developer.aliyun.com/article/1730877', date: '2026-04-23' },
  { name: 'DeepSeek-V4 维基条目（许可证与版本）', url: 'https://zh.wikipedia.org/zh-tw/DeepSeek-V4', date: '2026-05-01' },
  { name: 'vLLM PR #47716：DeepSeek-V4 FP8 MLA KV 布局为 584 字节/token', url: 'https://app.semanticdiff.com/gh/vllm-project/vllm/pull/47716/overview', date: '2026-07-05' },
  { name: 'DeepSeek × 北大 DSpark：单用户提速 60–85%；严格延迟约束下吞吐最高 +661%', url: 'https://pandaily.com/peking-university-deepseek-dspark-inference-efficiency-jun2026', date: '2026-06-27' },
  { name: 'DSpark 技术细节：V4-Flash 提速 60–85%，V4-Pro 57–78%，80 tok/s SLA 下吞吐 +51%', url: 'https://www.opensourceforu.com/2026/06/peking-university-deepseek-open-source-dspark/', date: '2026-06-28' },
  { name: 'Mooncake（KVCache 分离架构）：Kimi 生产实测，满足 SLO 的请求数最多提升 75%，吞吐最高 +525%', url: 'https://github.com/ForceInjection/AI-fundamentals/blob/27500812c67b88db1e2f016a70183875a84050a9/09_inference_system/kv_cache/mooncake/mooncake_architecture.md', date: '2025-10' },
  { name: 'Mooncake 基准：1P1D 配置峰值传输带宽 164.3 GB/s', url: 'https://kvcache-ai.github.io/Mooncake/_sources/performance/sglang/sglang-benchmark-results-v1.md', date: '2026' },
  { name: 'LMCache 在 AMD MI300X 多轮 Agent 负载：命中率 64–72%，TTFT 平均降低 4.4×，请求完成量 +1.6×', url: 'https://blog.lmcache.ai/en/2026/05/12/benchmarking-lmcache-for-multi-turn-agentic-workloads-on-amd-mi300x/', date: '2026-05-12' },
  { name: 'LMCache 预填充加速：高命中场景输入吞吐最高 +355.3%，TTFT 降低 58.8%', url: 'https://docs.gpustack.ai/2.0/performance-lab/references/evaluating-lmcache-prefill-acceleration-in-vllm/', date: '2026' },
  { name: 'NVIDIA B300：288GB HBM3e、8 TB/s 带宽；2026-07 按需租金约 $9.16/h，现货低至 $2.45/h', url: 'https://www.spheron.network/blog/nvidia-b300-blackwell-ultra-guide/', date: '2026-07' },
  { name: 'NVIDIA B300 租赁中位价 $8.75/h（Hashrate 数据库）', url: 'https://new.hashrate.no/db/gpus/nvidia_b300', date: '2026' },
  { name: 'H200 按需价格区间 $1.45–13.78/h，市场中枢约 $3.95/h（2026-05）', url: 'https://www.gmicloud.ai/en/blog/h200-gpu-cloud-rental-guide', date: '2026-05-27' },
  { name: 'H100 2026 年租金中枢约 $2.29–3.12/h', url: 'https://www.moduledge.com/blog/nvidia-hopper', date: '2026-06-06' },
  { name: 'B300 8 卡整机月租（中国大陆市场，2026-08）：标准方案约 ¥30 万/月', url: 'https://www.sohu.com/a/1060482614_122971846', date: '2026-08-08' },
  { name: 'H200/H100 整机月租（中国大陆市场，2026-07）：H200 ¥6–10 万，H100 ¥4.5–8 万', url: 'https://guba.eastmoney.com/news,gssz,1753023710.html', date: '2026-07-31' },
  { name: 'B300 功耗 1100–1400W，需液冷；H100/H200 700W', url: 'https://www.quotecolo.com/nvidia-dgx-ready-data-centers/', date: '2026-05-17' },
  { name: '8 卡服务器采购价参考：H200 ≈ $45–58 万、B300 ≈ $75–100 万（Haink 2026-06）', url: 'https://haink.org/knowledge/technology/ai-infrastructure-cost-guide', date: '2026-06-10' },
  { name: 'DeepSeek-V4 API 峰谷分时调价（2026-08-16 生效）：Flash 非高峰输入 ¥1.5/M、输出 ¥4.5/M、缓存命中 ¥0.05/M；高峰翻倍', url: 'https://news.qq.com/rain/a/20260817A08RSA00', date: '2026-08-17' },
  { name: 'DeepSeek-V4 官方调价美元口径：Flash 非高峰输入 $0.22/M、输出 $0.66/M；高峰 $0.44/$1.32', url: 'https://www.zhiding.cn/ai-applications/2026/0818/3196693.shtml', date: '2026-08-18' }
];

const App = (() => {
  let state = loadState();
  const $ = id => document.getElementById(id);

  // [id, getter, setter, min, max]
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

  // ---------- 状态加载 / 保存 / 分享 ----------

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
    // v1 使用 bandwidthGBps 字段（实际存的是 TB/s 数值），迁移到 v2 字段名
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
      try { history.replaceState(null, '', '#' + enc); } catch (e) { /* file:// 或受限环境 */ }
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

  function clamp(v, min, max) {
    const n = Number(v);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function updateMoneyLabels() {
    const sym = currencySymbol();
    document.querySelectorAll('.field.money input').forEach(inp => {
      const label = inp.closest('.field')?.querySelector('span');
      if (label && !label.dataset.base) label.dataset.base = label.textContent;
      if (label) {
        const base = label.dataset.base.replace(/\s*（.*）$/, '').trim();
        label.textContent = `${base}（${sym}）`;
      }
    });
  }

  function updateScenarioChips() {
    document.querySelectorAll('[data-scenario]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === state.biz.mode);
    });
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
    } else if (scenario === 'premium' || scenario === 'official' || scenario === 'hybrid') {
      state.sensitivity.priceMin = 0.5;
      state.sensitivity.priceMax = 8;
      state.sensitivity.priceStep = 0.5;
    }
    populateForm();
    renderAll();
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
    updateOfficialHint();
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
    const modeLabel = { official: '官方价转售/自用', premium: '溢价转售', private: '私有化部署', hybrid: '混合策略' }[state.biz.mode];
    const be = r.breakEvenUtil !== null
      ? (r.breakEvenUtil > 100 ? '>100%（不可达）' : fmtNum(r.breakEvenUtil, 0) + '%')
      : (state.biz.mode === 'private' ? '—' : '不可达');
    const profitCls = r.profitPerM >= 0 ? 'good' : 'bad';
    $('mini-summary').innerHTML = `
      <div class="ms-item"><span class="ms-label">方案</span><span class="ms-value">${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes} 节点 · ${modeLabel}</span></div>
      <div class="ms-item"><span class="ms-label">月毛利</span><span class="ms-value ${profitCls}">${fmtMoney(r.profitPerM, true)}</span></div>
      <div class="ms-item"><span class="ms-label">盈亏平衡负载率</span><span class="ms-value">${be}</span></div>
      <div class="ms-item"><span class="ms-label">输出 token/h</span><span class="ms-value">${fmtTok(r.outTokH)}</span></div>
      <div class="ms-item"><span class="ms-label">每百万输出成本</span><span class="ms-value">${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)}</span></div>
      <button class="btn small" id="mini-goto-profit">查看收益 →</button>`;
    $('mini-goto-profit').addEventListener('click', () => switchTab('profit'));
  }

  function renderCapacity() {
    const r = calcResults(state);
    const n = r.node;
    const outTokHPerNode = n.nodeDecode * 3600;
    const inTokHPerNode = Math.min(outTokHPerNode * state.model.inputOutputRatio, n.nodePrefill * 3600);

    const warns = [];
    if (!n.fits) warns.push(`模型权重 + 预留显存（${fmtNum(n.weightGB + state.opt.reserveGB, 0)}GB）超出节点总显存（${fmtNum(n.hbmTotal, 0)}GB），当前配置无法加载。请减少显存开销、使用更低量化或换更大显存 GPU。`);
    if (n.hbmCap === 0 && n.fits) warns.push('KV 容量上限为 0：显存几乎被权重占满，长上下文并发能力极低。');
    if (!state.opt.dsparkOn) warns.push('DSpark 已关闭：官方实测单流提速 60–85%，开启后产能与并发收益会显著提升。');
    if (state.opt.kvPoolOn && state.opt.cacheHitPct < 20) warns.push('缓存命中率设置较低（<20%）：Agent/多轮场景通常可到 60–90%，建议结合实际流量回放修正。');
    if (state.opt.pdSplitOn) warns.push('已启用 PD 分离：解码吞吐按配置增益放大（默认 +15%），该收益依赖调度器与网络，实际以压测为准。');
    if ((state.modelKey === 'v4-flash-fp4' || state.modelKey === 'v4-pro-fp4') && (state.gpuKey === 'h100' || state.gpuKey === 'h200')) {
      warns.push('当前模型为 FP4+FP8 混合预设：H100/H200 不支持 FP4 运算，请改用 FP8 预设或 B300 等 Blackwell 级 GPU。');
    }
    $('capacity-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    $('capacity-kpis').innerHTML =
      kpi('权重占用（单节点）', fmtNum(n.weightGB, 0) + ' GB', n.fits ? '' : 'bad',
        `总显存 ${fmtNum(n.hbmTotal, 0)} GB · 剩余 ${fmtNum(n.hbmFree, 0)} GB`) +
      kpi('单请求 KV 缓存', fmtNum(n.kvMBPerReq, 2) + ' MB', '',
        `平均上下文 ${fmtNum(n.ctxLen, 0)} token`) +
      kpi('解码吞吐（DSpark）', fmtNum(n.nodeDecode, 0) + ' tok/s', 'good',
        `未优化 ${fmtNum(n.nodeDecodeNoDspark, 0)} tok/s` + (state.opt.pdSplitOn ? ` · PD ×${n.pdFactor.toFixed(2)}` : '')) +
      kpi('输出 token / 小时', fmtTok(outTokHPerNode), 'good', '满负载理论值（单节点）') +
      kpi('输入 token / 小时', fmtTok(inTokHPerNode), '', '受预填充能力上限约束') +
      kpi('达到满吞吐所需并发', fmtNum(n.requiredConcurrency, 0) + ' 路', 'warn', `单流 ${fmtNum(state.opt.singleStreamTps, 0)} tok/s`) +
      kpi('KV 容量并发上限', fmtNum(n.kvCapTotal, 0) + ' 路', '', `HBM ${fmtNum(n.hbmCap, 0)} + 卸载池 ${fmtNum(n.offloadCap, 0)}`) +
      kpi('单节点当前收入/h', fmtMoney(r.revPerHPerNode, true), '', `满负载时可达 ${fmtMoney(r.maxRevPerHPerApiNode, true)}/h`);

    const rows = [
      ['单卡带宽（TB/s）', fmtNum(state.gpu.bandwidthTBps, 2)],
      ['每 token 读取字节', fmtNum(n.activeBytes / 1e9 + n.kvBytesPerReq / 1e9, 2) + ' GB',
        `激活权重 ${fmtNum(n.activeBytes / 1e9, 1)} GB + KV ${fmtNum(n.kvBytesPerReq / 1e6, 1)} MB`],
      ['单卡理论解码（100% 带宽）', fmtNum(n.basePerGpu, 0) + ' tok/s'],
      ['单卡有效解码（含利用率）', fmtNum(n.effPerGpu, 0) + ' tok/s'],
      ['单节点解码（含优化）', fmtNum(n.nodeDecode, 0) + ' tok/s'],
      ['单节点预填充', fmtNum(n.nodePrefill, 0) + ' tok/s'],
      ['单节点满负载输出 token/h', fmtTok(outTokHPerNode)],
      ['单节点满负载输入 token/h', fmtTok(inTokHPerNode)],
      ['缓存命中节省预填充', fmtTok(r.prefillSavedTokH) + '/h',
        state.opt.kvPoolOn ? `命中率 ${state.opt.cacheHitPct}% 下被跳过的输入计算` : 'KV 缓存池未启用'],
      ['显存占用明细', `${fmtNum(n.weightGB, 0)} GB 权重 + ${fmtNum(state.opt.reserveGB, 0)} GB 预留`, `${fmtNum(n.hbmFree, 0)} GB 可用于 KV`],
      ['KV 容量并发（HBM）', fmtNum(n.hbmCap, 0) + ' 路'],
      ['KV 容量并发（卸载池）', fmtNum(n.offloadCap, 0) + ' 路'],
      ['实际可支撑并发（参考）', Math.min(n.kvCapTotal, Math.max(n.requiredConcurrency * 4, n.requiredConcurrency)) + ' 路',
        '工程建议值：容量上限与饱和并发的 4 倍余量取小']
    ];
    $('capacity-detail').innerHTML =
      '<table><thead><tr><th>项目</th><th>数值</th><th>说明</th></tr></thead><tbody>' +
      rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="muted">${c || ''}</td></tr>`).join('') +
      '</tbody></table>';

    Charts.mount('chart-throughput', Charts.throughputOption(n));
  }

  function renderProfit() {
    const r = calcResults(state);
    const warns = [];
    if (r.inCapped) warns.push('输入侧需求超过预填充能力上限，输入 token 已按预填充上限截断；实际长输入负载下输入收入可能低于模型估算。');
    if (r.apiNodes > 0 && r.breakEvenUtil === null) warns.push('当前定价与成本结构下无法实现盈亏平衡（收入斜率 < 可变成本斜率），建议提价或降本。');
    if (r.apiNodes > 0 && r.breakEvenUtil !== null && r.breakEvenUtil > 100) warns.push(`盈亏平衡负载率 ${fmtNum(r.breakEvenUtil, 0)}% 超过 100%，当前组合在纯 API 模式下无法盈利。`);
    if (state.biz.mode === 'official') warns.push('官方价转售通常无法覆盖租金成本：DeepSeek 官方定价接近其自有基建成本，转售窗口很窄；此模式更适合“自用替代 API”测算。');
    if (state.biz.mode === 'hybrid' && r.privateNodes === 0) warns.push('混合模式未设置私有化节点：当前等同于纯 API 转售。');
    $('profit-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    const modeLabel = { official: '官方价转售/自用', premium: '溢价转售', private: '私有化部署', hybrid: '混合策略' }[state.biz.mode];
    const profitLabel = state.biz.mode === 'official' ? '月毛利（自用=节省）' : '月毛利';
    $('profit-kpis').innerHTML =
      kpi('月收入', fmtMoney(r.revenuePerM, true), '', `${modeLabel} · ${r.apiNodes} API + ${r.privateNodes} 私有化节点`) +
      kpi('月成本', fmtMoney(r.cost.total, true), '', `租金/折旧 ${fmtMoney(r.cost.rent + r.cost.amort + r.cost.maint, true)} + 电费 ${fmtMoney(r.cost.power, true)} + 运维 ${fmtMoney(r.cost.ops, true)}`) +
      kpi(profitLabel, fmtMoney(r.profitPerM, true), r.profitPerM >= 0 ? 'good' : 'bad',
        `每小时 ${fmtMoney(r.revenuePerH - r.cost.total / 730, true)}`) +
      kpi('毛利率', r.margin === null ? '—' : fmtNum(r.margin, 1) + '%', r.margin !== null && r.margin >= 0 ? 'good' : 'bad') +
      kpi('盈亏平衡负载率', r.breakEvenUtil === null ? (state.biz.mode === 'private' ? '—' : '不可达') : fmtNum(r.breakEvenUtil, 0) + '%',
        r.breakEvenUtil !== null && r.breakEvenUtil <= 100 ? 'good' : 'warn') +
      kpi('盈亏平衡输出价', r.breakEvenPrice === null ? '—' : fmtMoney(r.breakEvenPrice, false), '',
        `当前负载 ${fmtNum(state.biz.utilizationPct, 0)}%）`) +
      kpi('合同盈亏平衡价', r.breakEvenContract === null ? '—' : fmtMoney(r.breakEvenContract, false), '',
        '私有化节点口径（月/节点）') +
      kpi('每百万输出 token 成本', r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut), '',
        r.revPerMOut === null ? '' : `当前单价 ${fmtMoney(r.revPerMOut)}/M`) +
      kpi('输出 token / 月', fmtTok(r.outTokM), '', `输入 ${fmtTok(r.inTokM)} · 可计费 ${fmtTok(r.billableTokM)}`) +
      kpi('采购回本周期', r.paybackMonths === null ? '—' : fmtNum(r.paybackMonths, 1) + ' 个月',
        r.paybackMonths !== null && r.paybackMonths <= 36 ? 'good' : 'warn',
        state.cost.rentMode === 'buy' ? '按当前月毛利' : '当前为租用模式');

    $('unit-econ').innerHTML = `
      <table>
        <thead><tr><th>单位经济指标</th><th>数值</th><th>口径</th></tr></thead>
        <tbody>
          <tr><td>输出 token / 月</td><td>${fmtTok(r.outTokM)}</td><td>解码吞吐 × 负载率 × 730h</td></tr>
          <tr><td>输入 token / 月</td><td>${fmtTok(r.inTokM)}</td><td>输出 × 输入输出比（受预填充上限约束）</td></tr>
          <tr><td>每百万输出 token 成本</td><td>${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)}</td><td>月总成本 ÷ 输出 tokens × 1M</td></tr>
          <tr><td>每百万输出 token 收入</td><td>${r.revPerMOut === null ? '—' : fmtMoney(r.revPerMOut)}</td><td>月总收入 ÷ 输出 tokens × 1M</td></tr>
          <tr><td>每百万输出 token 毛利</td><td class="${r.profitPerMOut !== null && r.profitPerMOut >= 0 ? 'num-good' : 'num-bad'}">${r.profitPerMOut === null ? '—' : fmtMoney(r.profitPerMOut)}</td><td>收入 − 成本（按输出摊薄）</td></tr>
        </tbody>
      </table>`;

    const rb = rentBuyCompare(state, state.cost.amortMonths, state.cost.residualPct);
    $('rent-buy-wrap').innerHTML = `
      <table>
        <thead><tr><th>方式</th><th>${rb.months} 个月总成本</th><th>月均成本</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td>租用</td><td>${fmtMoney(rb.rentTotal, true)}</td><td>${fmtMoney(rb.rentMonthly, true)}</td><td>含电费与运维，按当前折扣 ${fmtNum(state.gpu.reservedDiscountPct, 0)}% 计算</td></tr>
          <tr><td>采购</td><td>${fmtMoney(rb.buyTotal, true)}</td><td>${fmtMoney(rb.buyMonthly, true)}</td><td>一次采购 + 维护/电费/运维，期末按 ${fmtNum(state.cost.residualPct, 0)}% 残值回收（${fmtMoney(rb.residualValue, true)}）</td></tr>
        </tbody>
      </table>
      <p class="muted small">${rb.buySaving > 0
        ? `按 ${rb.months} 个月口径，采购比租用省 ${fmtMoney(rb.buySaving, true)}（${fmtNum(rb.buySaving / Math.max(rb.rentTotal, 1) * 100, 0)}%）。`
        : `按 ${rb.months} 个月口径，租用比采购省 ${fmtMoney(-rb.buySaving, true)}，短期租用更划算。`}</p>`;

    Charts.mount('chart-cost', Charts.costOption(r.cost, state.currency));
    Charts.mount('chart-profit-curve', Charts.profitCurveOption(profitCurve(state), state.currency, r.breakEvenUtil));

    const cmp = compareGpus(state);
    $('gpu-compare').innerHTML =
      '<table><thead><tr><th>GPU</th><th>解码 tok/s</th><th>输出 tok/h</th><th>可计费 tok/h</th><th>月收入</th><th>月成本</th><th>月毛利</th><th>每节点月毛利</th><th>盈亏平衡负载率</th><th>可部署</th></tr></thead><tbody>' +
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
        <td>${c.fits ? '✅' : '❌ 显存不足'}</td>
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
      wrap.innerHTML = '<p class="muted small">尚未保存快照。点击“保存当前方案为快照”，即可与之后任意一次询价方案做 A/B 对比。</p>';
      return;
    }
    snap = Object.assign(defaultState(), migrateState(snap));
    if (snap.currency !== state.currency) convertMoney(snap, snap.currency, state.currency);
    const cur = calcResults(state);
    const old = calcResults(snap);
    const modeLabel = m => ({ official: '官方价转售/自用', premium: '溢价转售', private: '私有化部署', hybrid: '混合策略' }[m]);
    const be = r => r.breakEvenUtil === null ? (r.apiNodes === 0 ? '—' : '不可达') : fmtNum(r.breakEvenUtil, 0) + '%';
    const rows = [
      ['方案', `${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes}`, `${snap.model.shortName || snap.model.name} · ${snap.gpu.name} ×${snap.nodes}`],
      ['模式', modeLabel(state.biz.mode), modeLabel(snap.biz.mode)],
      ['负载率', fmtNum(state.biz.utilizationPct, 0) + '%', fmtNum(snap.biz.utilizationPct, 0) + '%'],
      ['月收入', fmtMoney(cur.revenuePerM, true), fmtMoney(old.revenuePerM, true)],
      ['月成本', fmtMoney(cur.cost.total, true), fmtMoney(old.cost.total, true)],
      ['月毛利', fmtMoney(cur.profitPerM, true), fmtMoney(old.profitPerM, true)],
      ['毛利率', cur.margin === null ? '—' : fmtNum(cur.margin, 1) + '%', old.margin === null ? '—' : fmtNum(old.margin, 1) + '%'],
      ['盈亏平衡负载率', be(cur), be(old)],
      ['输出 token/h', fmtTok(cur.outTokH), fmtTok(old.outTokH)],
      ['每百万输出成本', cur.costPerMOut === null ? '—' : fmtMoney(cur.costPerMOut), old.costPerMOut === null ? '—' : fmtMoney(old.costPerMOut)]
    ];
    wrap.innerHTML =
      '<table><thead><tr><th>指标</th><th>当前方案</th><th>快照方案</th></tr></thead><tbody>' +
      rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('') +
      '</tbody></table>';
  }

  function saveSnapshot() {
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    renderSnapshot();
    toast('已保存当前方案为快照');
  }

  function clearSnapshot() {
    try { localStorage.removeItem(SNAP_KEY); } catch (e) { /* ignore */ }
    renderSnapshot();
    toast('快照已清除');
  }

  function renderSensitivity() {
    const matrix = sensitivityMatrix(state);
    const tornadoItems = tornado(state);
    const sym = currencySymbol();
    const values = matrix.rows.flat();
    const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
    const header = matrix.isPrivate ? '合同价（' + sym + 'k/节点/月）' : '输出价（' + sym + '/M token）';

    $('heatmap-title').textContent = matrix.isPrivate
      ? `负载率 × 私有化合同价：月度毛利热力图（单位：${sym}k）`
      : `负载率 × 输出价格：月度毛利热力图（单位：${sym}k）`;

    const cell = v => {
      const a = Math.min(0.85, Math.abs(v) / maxAbs);
      const bg = v >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})`;
      const fg = a > 0.45 ? '#fff' : '#e8edff';
      return `<td style="background:${bg};color:${fg}">${fmtMoney(v, true)}</td>`;
    };

    $('heatmap-wrap').innerHTML =
      '<table><thead><tr><th>负载率 \\ ' + header + '</th>' +
      matrix.prices.map(p => `<th>${matrix.isPrivate ? fmtNum(p * 1000, 0) : fmtNum(p, 2)}</th>`).join('') +
      '</tr></thead><tbody>' +
      matrix.usages.map((u, i) => `<tr><th>${fmtNum(u, 0)}%</th>${matrix.rows[i].map(cell).join('')}</tr>`).join('') +
      '</tbody></table>';
    $('heatmap-legend').innerHTML =
      '<div class="hm-legend"><span>亏损</span><div class="hm-gradient"></div><span>盈利</span>' +
      `<span class="muted small">单位：${sym}k/月；颜色越深绝对值越大</span></div>`;

    Charts.mount('chart-tornado', Charts.tornadoOption(tornadoItems, state.currency, state.sensitivity.tornadoPct));
  }

  function updateOfficialHint() {
    const pricing = OFFICIAL_PRICING[state.modelKey] || OFFICIAL_PRICING['v4-flash'];
    const rate = CURRENCY_RATE[state.currency] || 1;
    const f = v => round2(v / 7.2 * rate);
    const p = pricing.offpeak;
    const officialOut = f(p.out);
    const compareOut = state.biz.outputPrice > 0
      ? (state.biz.outputPrice >= officialOut
        ? `你的输出价 ${fmtMoney(state.biz.outputPrice)} 是官方非高峰价 ${fmtMoney(officialOut)} 的 ${fmtNum(state.biz.outputPrice / officialOut, 1)}×`
        : `你的输出价 ${fmtMoney(state.biz.outputPrice)} 低于官方非高峰价 ${fmtMoney(officialOut)}，按官方口径倒挂`)
      : '';
    $('biz-note').textContent =
      `官方参考价（${state.modelKey === 'v4-pro' || state.modelKey === 'v4-pro-fp4' ? 'V4-Pro' : 'V4-Flash'}，2026-08-16 起）：` +
      `输入 ${fmtMoney(f(p.in))}/M，输出 ${fmtMoney(officialOut)}/M，缓存命中 ${fmtMoney(f(p.cached))}/M；高峰 = ×${pricing.peakMult}。` +
      (compareOut ? ` ${compareOut}。` : '');
  }

  function renderSources() {
    $('source-list').innerHTML = SOURCES.map(s =>
      `<li>${s.name}（${s.date}）<br><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></li>`
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
        state = Object.assign(defaultState(), parsed);
        populateForm();
        renderAll();
        toast('配置已导入');
      } catch (e) {
        toast('配置文件无效：' + e.message, true);
      }
    };
    reader.readAsText(file);
  }

  function shareLink() {
    const url = location.href.split('#')[0] + '#' + encodeState();
    const done = () => toast('链接已复制，打开即可恢复当前方案');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动复制地址栏链接', true); }
    document.body.removeChild(ta);
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function copySummary() {
    const r = calcResults(state);
    const modeLabel = { official: '官方价转售/自用', premium: '溢价转售', private: '私有化部署', hybrid: '混合策略' }[state.biz.mode];
    const be = r.breakEvenUtil === null
      ? (state.biz.mode === 'private' ? '—' : '不可达')
      : (r.breakEvenUtil > 100 ? '>100%（不可达）' : fmtNum(r.breakEvenUtil, 0) + '%');
    const lines = [
      '# AI 部署成本测算摘要',
      '',
      `- 方案：${state.model.shortName || state.model.name} · ${state.gpu.name} ×${state.nodes} 节点（${state.gpusPerNode} 卡/节点） · ${modeLabel}`,
      `- 月收入：${fmtMoney(r.revenuePerM, true)}｜月成本：${fmtMoney(r.cost.total, true)}｜月毛利：${fmtMoney(r.profitPerM, true)}（${r.margin === null ? '—' : fmtNum(r.margin, 1) + '%'}）`,
      `- 盈亏平衡负载率：${be}`,
      `- 每百万输出 token 成本：${r.costPerMOut === null ? '—' : fmtMoney(r.costPerMOut)}｜输出价：${fmtMoney(state.biz.outputPrice)}/M`,
      `- 输出 token：${fmtTok(r.outTokM)}/月｜输入：${fmtTok(r.inTokM)}/月｜可计费：${fmtTok(r.billableTokM)}/月`,
      `- 关键参数：负载率 ${fmtNum(state.biz.utilizationPct, 0)}%、缓存命中 ${state.opt.kvPoolOn ? state.opt.cacheHitPct : 0}%、DSpark ×${state.opt.dsparkOn ? state.opt.dsparkSpeedup : 1}、带宽利用率 ${state.opt.bwUtilPct}%`,
      `- 生成时间：${new Date().toLocaleString('zh-CN')}`,
      `- 页面链接：${location.href.split('#')[0]}`
    ].join('\n');
    copyText(lines, () => toast('方案摘要已复制，可直接粘贴到聊天/文档'));
  }

  let toastTimer = null;
  function toast(msg, isError = false) {
    let el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
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
    setTimeout(after, 1200); // 部分浏览器不触发 afterprint 时兜底
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
        el.innerHTML = '<div class="warning-box">图表库未加载，表格与计算不受影响。</div>';
      });
    }
    populateForm();
    renderSources();
    initTabs();

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

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn ghost';
    resetBtn.textContent = '重置默认';
    resetBtn.addEventListener('click', () => {
      state = defaultState();
      populateForm();
      renderAll();
      toast('已恢复默认参数');
    });
    document.querySelector('.header-actions').appendChild(resetBtn);

    renderAll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
