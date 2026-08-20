'use strict';

const STORE_KEY = 'howmuch-state-v1';

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
  const fieldMap = [
    ['model-total-params', s => s.model.totalParamsB],
    ['model-active-params', s => s.model.activeParamsB],
    ['model-bytes-per-param', s => s.model.bytesPerParam],
    ['model-kv-bytes', s => s.model.kvBytesPerToken],
    ['model-context-len', s => s.model.contextLen],
    ['model-avg-input', s => s.model.avgInputLen],
    ['model-avg-output', s => s.model.avgOutputLen],
    ['model-ratio', s => s.model.inputOutputRatio],
    ['model-overhead', s => s.model.overheadPct],
    ['gpu-nodes', s => s.nodes],
    ['gpu-per-node', s => s.gpusPerNode],
    ['gpu-hbm', s => s.gpu.hbmGB],
    ['gpu-bw', s => s.gpu.bandwidthGBps],
    ['gpu-fp8', s => s.gpu.fp8TFLOPS],
    ['gpu-tdp', s => s.gpu.tdpW],
    ['gpu-rent', s => s.gpu.rentPerHour],
    ['gpu-discount', s => s.gpu.reservedDiscountPct],
    ['gpu-purchase', s => s.gpu.purchasePrice],
    ['opt-single-stream', s => s.opt.singleStreamTps],
    ['opt-dspark-speedup', s => s.opt.dsparkSpeedup],
    ['opt-hit', s => s.opt.cacheHitPct],
    ['opt-hostkv', s => s.opt.hostKvGB],
    ['opt-bwutil', s => s.opt.bwUtilPct],
    ['opt-prefill-eff', s => s.opt.prefillEffPct],
    ['opt-reserve', s => s.opt.reserveGB],
    ['biz-util', s => s.biz.utilizationPct],
    ['biz-peak-share', s => s.biz.peakSharePct],
    ['biz-peak-mult', s => s.biz.peakMult],
    ['biz-out-price', s => s.biz.outputPrice],
    ['biz-in-price', s => s.biz.inputPrice],
    ['biz-cached-price', s => s.biz.cachedInputPrice],
    ['biz-private-nodes', s => s.biz.privateNodes],
    ['biz-contract', s => s.biz.contractPerNodeMonth],
    ['cost-elec', s => s.cost.elecPerKWh],
    ['cost-pue', s => s.cost.pue],
    ['cost-idle', s => s.cost.idlePowerPct],
    ['cost-amort', s => s.cost.amortMonths],
    ['cost-maint', s => s.cost.maintPctPerYear],
    ['cost-colo', s => s.cost.coloPerNodeMonth],
    ['sens-price-min', s => s.sensitivity.priceMin],
    ['sens-price-max', s => s.sensitivity.priceMax],
    ['sens-price-step', s => s.sensitivity.priceStep],
    ['sens-util-min', s => s.sensitivity.utilMin],
    ['sens-util-max', s => s.sensitivity.utilMax],
    ['sens-util-step', s => s.sensitivity.utilStep],
    ['sens-tornado', s => s.sensitivity.tornadoPct]
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.model && parsed.gpu) {
          const base = defaultState();
          return Object.assign(base, parsed);
        }
      }
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function currencySymbol() {
    return state.currency === 'CNY' ? '¥' : '$';
  }

  function fmtMoney(v, compact = false) {
    const sym = currencySymbol();
    if (compact && Math.abs(v) >= 1e6) return sym + (v / 1e6).toFixed(2) + 'M';
    if (compact && Math.abs(v) >= 1e4) return sym + (v / 1e3).toFixed(1) + 'k';
    if (compact && Math.abs(v) >= 1000) return sym + (v / 1e3).toFixed(2) + 'k';
    return sym + Math.round(v).toLocaleString();
  }

  function fmtTok(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
    return Math.round(v).toLocaleString();
  }

  function fmtNum(v, digits = 0) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: digits });
  }

  function populateForm() {
    $('currency-select').value = state.currency;
    $('model-key').value = state.modelKey;
    $('gpu-key').value = state.gpuKey;
    $('biz-mode').value = state.biz.mode;
    $('cost-rent-mode').value = state.cost.rentMode;
    $('opt-dspark').checked = state.opt.dsparkOn;
    $('opt-kvpool').checked = state.opt.kvPoolOn;
    $('opt-offload').checked = state.opt.offloadOn;
    for (const [id, get] of fieldMap) {
      const el = $(id);
      if (el) el.value = get(state);
    }
    updateMoneyLabels();
  }

  function collectForm() {
    const st = state;
    st.modelKey = $('model-key').value;
    st.gpuKey = $('gpu-key').value;
    st.biz.mode = $('biz-mode').value;
    st.cost.rentMode = $('cost-rent-mode').value;
    st.opt.dsparkOn = $('opt-dspark').checked;
    st.opt.kvPoolOn = $('opt-kvpool').checked;
    st.opt.offloadOn = $('opt-offload').checked;
    for (const [id, get, set] of fieldMapWithSetters()) {
      const el = $(id);
      if (!el) continue;
      const v = parseFloat(el.value);
      if (!isNaN(v)) set(st, v);
    }
    // 校验私有化节点数
    st.biz.privateNodes = Math.min(Math.max(0, st.biz.privateNodes), st.nodes);
    return st;
  }

  function fieldMapWithSetters() {
    const setters = {
      'model-total-params': (s, v) => s.model.totalParamsB = v,
      'model-active-params': (s, v) => s.model.activeParamsB = v,
      'model-bytes-per-param': (s, v) => s.model.bytesPerParam = v,
      'model-kv-bytes': (s, v) => s.model.kvBytesPerToken = v,
      'model-context-len': (s, v) => s.model.contextLen = v,
      'model-avg-input': (s, v) => s.model.avgInputLen = v,
      'model-avg-output': (s, v) => s.model.avgOutputLen = v,
      'model-ratio': (s, v) => s.model.inputOutputRatio = v,
      'model-overhead': (s, v) => s.model.overheadPct = v,
      'gpu-nodes': (s, v) => s.nodes = v,
      'gpu-per-node': (s, v) => s.gpusPerNode = v,
      'gpu-hbm': (s, v) => s.gpu.hbmGB = v,
      'gpu-bw': (s, v) => s.gpu.bandwidthGBps = v,
      'gpu-fp8': (s, v) => s.gpu.fp8TFLOPS = v,
      'gpu-tdp': (s, v) => s.gpu.tdpW = v,
      'gpu-rent': (s, v) => s.gpu.rentPerHour = v,
      'gpu-discount': (s, v) => s.gpu.reservedDiscountPct = v,
      'gpu-purchase': (s, v) => s.gpu.purchasePrice = v,
      'opt-single-stream': (s, v) => s.opt.singleStreamTps = v,
      'opt-dspark-speedup': (s, v) => s.opt.dsparkSpeedup = v,
      'opt-hit': (s, v) => s.opt.cacheHitPct = v,
      'opt-hostkv': (s, v) => s.opt.hostKvGB = v,
      'opt-bwutil': (s, v) => s.opt.bwUtilPct = v,
      'opt-prefill-eff': (s, v) => s.opt.prefillEffPct = v,
      'opt-reserve': (s, v) => s.opt.reserveGB = v,
      'biz-util': (s, v) => s.biz.utilizationPct = v,
      'biz-peak-share': (s, v) => s.biz.peakSharePct = v,
      'biz-peak-mult': (s, v) => s.biz.peakMult = v,
      'biz-out-price': (s, v) => s.biz.outputPrice = v,
      'biz-in-price': (s, v) => s.biz.inputPrice = v,
      'biz-cached-price': (s, v) => s.biz.cachedInputPrice = v,
      'biz-private-nodes': (s, v) => s.biz.privateNodes = v,
      'biz-contract': (s, v) => s.biz.contractPerNodeMonth = v,
      'cost-elec': (s, v) => s.cost.elecPerKWh = v,
      'cost-pue': (s, v) => s.cost.pue = v,
      'cost-idle': (s, v) => s.cost.idlePowerPct = v,
      'cost-amort': (s, v) => s.cost.amortMonths = v,
      'cost-maint': (s, v) => s.cost.maintPctPerYear = v,
      'cost-colo': (s, v) => s.cost.coloPerNodeMonth = v,
      'sens-price-min': (s, v) => s.sensitivity.priceMin = v,
      'sens-price-max': (s, v) => s.sensitivity.priceMax = v,
      'sens-price-step': (s, v) => s.sensitivity.priceStep = v,
      'sens-util-min': (s, v) => s.sensitivity.utilMin = v,
      'sens-util-max': (s, v) => s.sensitivity.utilMax = v,
      'sens-util-step': (s, v) => s.sensitivity.utilStep = v,
      'sens-tornado': (s, v) => s.sensitivity.tornadoPct = v
    };
    return fieldMap.map(([id]) => [id, null, setters[id]]);
  }

  function updateMoneyLabels() {
    const sym = currencySymbol();
    document.querySelectorAll('.field.money input').forEach(inp => {
      const label = inp.closest('.field')?.querySelector('span');
      if (label && !label.dataset.base) {
        label.dataset.base = label.textContent;
      }
      if (label) {
        const base = label.dataset.base.replace(/\s*\(.*\)$/, '').trim();
        label.textContent = `${base}（${sym}）`;
      }
    });
  }

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
    if (scenario === 'official') {
      applyOfficialPrices();
    } else if (scenario === 'premium') {
      state.biz.mode = 'premium';
      const rate = CURRENCY_RATE[state.currency] || 1;
      state.biz.outputPrice = round2(3 * rate / 7.2);
      state.biz.inputPrice = round2(0.3 * rate / 7.2);
      state.biz.cachedInputPrice = round2(0.03 * rate / 7.2);
      state.biz.peakSharePct = 0;
      state.biz.peakMult = 1;
    } else if (scenario === 'private') {
      state.biz.mode = 'private';
      state.biz.privateNodes = state.nodes;
      state.biz.contractPerNodeMonth = round2(25000 * (CURRENCY_RATE[state.currency] || 1) / 7.2);
    } else if (scenario === 'hybrid') {
      state.biz.mode = 'hybrid';
      state.biz.privateNodes = Math.min(2, state.nodes);
      state.biz.contractPerNodeMonth = round2(25000 * (CURRENCY_RATE[state.currency] || 1) / 7.2);
      const rate = CURRENCY_RATE[state.currency] || 1;
      state.biz.outputPrice = round2(3 * rate / 7.2);
      state.biz.inputPrice = round2(0.3 * rate / 7.2);
      state.biz.cachedInputPrice = round2(0.03 * rate / 7.2);
      state.biz.peakSharePct = 0;
      state.biz.peakMult = 1;
    }
    collectForm();
    populateForm();
    renderAll();
  }

  function renderAll() {
    collectForm();
    saveState();
    renderCapacity();
    renderProfit();
    renderSensitivity();
  }

  function kpi(label, value, cls = '', sub = '') {
    return `<div class="kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  }

  function renderCapacity() {
    const r = calcResults(state);
    const n = r.node;
    const outTokHPerNode = n.nodeDecode * 3600;
    const inTokHPerNode = Math.min(outTokHPerNode * state.model.inputOutputRatio, n.nodePrefill * 3600);
    const sym = currencySymbol();

    const warns = [];
    if (!n.fits) warns.push(`模型权重 + 预留显存（${fmtNum(n.weightGB + state.opt.reserveGB, 0)}GB）超出节点总显存（${fmtNum(n.hbmTotal, 0)}GB），当前配置无法加载。请减少显存开销、使用更低位量化或换更大显存 GPU。`);
    if (n.hbmCap === 0 && n.fits) warns.push('KV 容量上限为 0：显存几乎被权重占满，长上下文并发能力极低。');
    if (!state.opt.dsparkOn) warns.push('DSpark 已关闭：官方实测单流提速 60–85%，开启后产能与并发收益会显著提升。');
    if (state.opt.kvPoolOn && state.opt.cacheHitPct < 20) warns.push('缓存命中率设置较低（<20%）：Agent/多轮场景通常可到 60–90%，建议结合实际流量回放修正。');
    $('capacity-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    $('capacity-kpis').innerHTML =
      kpi('权重占用（单节点）', fmtNum(n.weightGB, 0) + ' GB', n.fits ? '' : 'bad',
        `总显存 ${fmtNum(n.hbmTotal, 0)} GB · 剩余 ${fmtNum(n.hbmFree, 0)} GB`) +
      kpi('单请求 KV 缓存', fmtNum(n.kvMBPerReq, 2) + ' MB', '',
        `平均上下文 ${fmtNum(n.ctxLen, 0)} token`) +
      kpi('解码吞吐（DSpark）', fmtNum(n.nodeDecode, 0) + ' tok/s', 'good',
        `未优化 ${fmtNum(n.nodeDecodeNoDspark, 0)} tok/s · ×${state.opt.dsparkOn ? state.opt.dsparkSpeedup : 1}`) +
      kpi('输出 token / 小时', fmtTok(outTokHPerNode), 'good',
        `满负载理论值（单节点）`) +
      kpi('输入 token / 小时', fmtTok(inTokHPerNode), '',
        `受预填充能力上限约束`) +
      kpi('达到满吞吐所需并发', fmtNum(n.requiredConcurrency, 0) + ' 路', 'warn',
        `单流 ${fmtNum(state.opt.singleStreamTps, 0)} tok/s`) +
      kpi('KV 容量并发上限', fmtNum(n.kvCapTotal, 0) + ' 路', '',
        `HBM ${fmtNum(n.hbmCap, 0)} + 卸载池 ${fmtNum(n.offloadCap, 0)}`) +
      kpi('每小时最大收入', fmtMoney(r.revenuePerH * (state.nodes / Math.max(r.apiNodes, 1)), true), '',
        `当前价格与负载（单节点口径）`);

    const rows = [
      ['单卡带宽（TB/s）', fmtNum(state.gpu.bandwidthGBps, 2)],
      ['每 token 读取字节', fmtNum(n.activeBytes / 1e9 + n.kvBytesPerReq / 1e9, 2) + ' GB',
        `激活权重 ${fmtNum(n.activeBytes / 1e9, 1)} GB + KV ${fmtNum(n.kvBytesPerReq / 1e6, 1)} MB`],
      ['单卡理论解码（100% 带宽）', fmtNum(n.basePerGpu, 0) + ' tok/s'],
      ['单卡有效解码（含利用率）', fmtNum(n.effPerGpu, 0) + ' tok/s'],
      ['单节点解码（含 DSpark）', fmtNum(n.nodeDecode, 0) + ' tok/s'],
      ['单节点预填充', fmtNum(n.nodePrefill, 0) + ' tok/s'],
      ['单节点满负载输出 token/h', fmtTok(outTokHPerNode)],
      ['单节点满负载输入 token/h', fmtTok(inTokHPerNode)],
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
    const sym = currencySymbol();
    const warns = [];
    if (r.inCapped) warns.push('输入侧需求超过预填充能力上限，输入 token 已按预填充上限截断；实际长输入负载下输入收入可能低于模型估算。');
    if (r.apiNodes > 0 && r.breakEvenUtil === null) warns.push('当前定价与成本结构下无法实现盈亏平衡（收入斜率 < 可变成本斜率），建议提价或降本。');
    if (r.apiNodes > 0 && r.breakEvenUtil !== null && r.breakEvenUtil > 100) warns.push(`盈亏平衡负载率 ${fmtNum(r.breakEvenUtil, 0)}% 超过 100%，当前组合在纯 API 模式下无法盈利。`);
    if (state.biz.mode === 'official') warns.push('官方价转售通常无法覆盖租金成本：DeepSeek 官方定价接近其自有基建成本，转售窗口很窄；此模式更适合“自用替代 API”测算。');
    if (state.biz.mode === 'hybrid' && r.privateNodes === 0) warns.push('混合模式未设置私有化节点：当前等同于纯 API 转售。');
    $('profit-warning').innerHTML = warns.map(w => `<div class="warning-box">${w}</div>`).join('');

    const modeLabel = { official: '官方价转售/自用', premium: '溢价转售', private: '私有化部署', hybrid: '混合策略' }[state.biz.mode];
    $('profit-kpis').innerHTML =
      kpi('月收入', fmtMoney(r.revenuePerM, true), '', `${modeLabel} · ${r.apiNodes} API + ${r.privateNodes} 私有化节点`) +
      kpi('月成本', fmtMoney(r.cost.total, true), '', `租金/折旧 ${fmtMoney(r.cost.rent + r.cost.amort + r.cost.maint, true)} + 电费 ${fmtMoney(r.cost.power, true)} + 运维 ${fmtMoney(r.cost.ops, true)}`) +
      kpi('月毛利', fmtMoney(r.profitPerM, true), r.profitPerM >= 0 ? 'good' : 'bad',
        `每小时 ${fmtMoney(r.revenuePerH - r.cost.total / 730, true)}`) +
      kpi('毛利率', r.margin === null ? '—' : fmtNum(r.margin, 1) + '%', r.margin !== null && r.margin >= 0 ? 'good' : 'bad') +
      kpi('盈亏平衡负载率', r.breakEvenUtil === null ? '不可达' : fmtNum(r.breakEvenUtil, 0) + '%', r.breakEvenUtil !== null && r.breakEvenUtil <= 100 ? 'good' : 'warn') +
      kpi('盈亏平衡输出价', r.breakEvenPrice === null ? '—' : fmtMoney(r.breakEvenPrice, false), '',
        `当前负载 ${fmtNum(state.biz.utilizationPct, 0)}%）`) +
      kpi('采购回本周期', r.paybackMonths === null ? '—' : fmtNum(r.paybackMonths, 1) + ' 个月', r.paybackMonths !== null && r.paybackMonths <= 36 ? 'good' : 'warn',
        state.cost.rentMode === 'buy' ? '按当前月毛利' : '当前为租用模式') +
      kpi('输出 token / 月', fmtTok(r.outTokM), '', `输入 ${fmtTok(r.inTokM)} · 命中率 ${state.opt.kvPoolOn ? state.opt.cacheHitPct : 0}%`);

    Charts.mount('chart-cost', Charts.costOption(r.cost, state.currency));
    Charts.mount('chart-profit-curve', Charts.profitCurveOption(profitCurve(state), state.currency));

    const cmp = compareGpus(state);
    $('gpu-compare').innerHTML =
      '<table><thead><tr><th>GPU</th><th>解码 tok/s</th><th>输出 tok/h</th><th>月收入</th><th>月成本</th><th>月毛利</th><th>盈亏平衡负载率</th><th>可部署</th></tr></thead><tbody>' +
      cmp.map(c => `<tr>
        <td>${c.name}</td>
        <td>${fmtNum(c.decodeTps, 0)}</td>
        <td>${fmtTok(c.outTokH)}</td>
        <td>${fmtMoney(c.revPerM, true)}</td>
        <td>${fmtMoney(c.costPerM, true)}</td>
        <td class="${c.profitPerM >= 0 ? 'num-good' : 'num-bad'}">${fmtMoney(c.profitPerM, true)}</td>
        <td>${c.breakEvenUtil === null ? '—' : fmtNum(c.breakEvenUtil, 0) + '%'}</td>
        <td>${c.fits ? '✅' : '❌ 显存不足'}</td>
      </tr>`).join('') + '</tbody></table>';
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

    Charts.mount('chart-tornado', Charts.tornadoOption(tornadoItems, state.currency));
  }

  function renderSources() {
    $('source-list').innerHTML = SOURCES.map(s =>
      `<li>${s.name}（${s.date}）<br><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></li>`
    ).join('');
  }

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
        alert('配置已导入');
      } catch (e) {
        alert('配置文件无效：' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function initTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $('panel-' + btn.dataset.tab).classList.add('active');
        setTimeout(() => {
          Object.keys(echarts || {}).length && Object.values(Charts).forEach(() => {});
        }, 50);
      });
    });
  }

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
      populateForm();
      renderAll();
    });

    document.querySelectorAll('#panel-setup input, #panel-setup select').forEach(el => {
      el.addEventListener('input', renderAll);
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

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn ghost';
    resetBtn.textContent = '重置默认';
    resetBtn.addEventListener('click', () => {
      state = defaultState();
      populateForm();
      renderAll();
    });
    document.querySelector('.header-actions').appendChild(resetBtn);

    renderAll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
