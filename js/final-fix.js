'use strict';

// ---------------------------------------------------------------------------
// 最终修正：覆盖 app.js 中“快捷场景”填充失效的问题，并修正若干联动细节。
// app.js 的 applyScenario 会先改 state、再被旧表单值覆盖（等效于 no-op），
// 这里在 DOMContentLoaded 之后重新绑定，直接写表单并触发重算。
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const rate = () => (CURRENCY_RATE[$('currency-select').value] || 1);

  function setNum(id, v) {
    const el = $(id);
    if (!el) return;
    el.value = Math.round(v * 10000) / 10000;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setSel(id, v) {
    const el = $(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const OFFICIAL_USD = {
    'v4-flash': { out: 4.5 / 7.2, in: 1.5 / 7.2, cached: 0.05 / 7.2 },
    'v4-pro': { out: 13.5 / 7.2, in: 4.5 / 7.2, cached: 0.15 / 7.2 }
  };

  function toCur(vUsd) {
    return vUsd * rate();
  }

  function applyScenario(scenario) {
    const nodes = parseInt($('gpu-nodes').value || '5', 10);
    if (scenario === 'official') {
      const key = $('model-key').value;
      const p = OFFICIAL_USD[key] || OFFICIAL_USD['v4-flash'];
      setSel('biz-mode', 'official');
      setNum('biz-out-price', toCur(p.out));
      setNum('biz-in-price', toCur(p.in));
      setNum('biz-cached-price', toCur(p.cached));
      setNum('biz-peak-share', 33);
      setNum('biz-peak-mult', 2);
      setNum('biz-private-nodes', 0);
    } else if (scenario === 'premium') {
      setSel('biz-mode', 'premium');
      setNum('biz-out-price', toCur(3));
      setNum('biz-in-price', toCur(0.3));
      setNum('biz-cached-price', toCur(0.03));
      setNum('biz-peak-share', 0);
      setNum('biz-peak-mult', 1);
      setNum('biz-private-nodes', 0);
    } else if (scenario === 'private') {
      setSel('biz-mode', 'private');
      setNum('biz-private-nodes', nodes);
      setNum('biz-contract', toCur(25000));
    } else if (scenario === 'hybrid') {
      setSel('biz-mode', 'hybrid');
      setNum('biz-private-nodes', Math.min(2, nodes));
      setNum('biz-contract', toCur(25000));
      setNum('biz-out-price', toCur(3));
      setNum('biz-in-price', toCur(0.3));
      setNum('biz-cached-price', toCur(0.03));
      setNum('biz-peak-share', 0);
      setNum('biz-peak-mult', 1);
    }
  }

  document.querySelectorAll('[data-scenario]').forEach(btn => {
    btn.addEventListener('click', () => applyScenario(btn.dataset.scenario));
  });

  // GPU 预设切换后，把预设整机运维费换算成当前币种
  $('gpu-key').addEventListener('change', () => {
    const coloUsd = { h100: 1200, h200: 1200, b300: 2000, custom: 1200 }[$('gpu-key').value] || 1200;
    setNum('cost-colo', toCur(coloUsd));
  });

  // 私有化模式下，热力图横轴从“输出价”切换为“合同价”区间
  $('biz-mode').addEventListener('change', () => {
    const isPrivate = $('biz-mode').value === 'private';
    if (isPrivate) {
      setNum('sens-price-min', 5);
      setNum('sens-price-max', 50);
      setNum('sens-price-step', 5);
    } else {
      setNum('sens-price-min', 0.5);
      setNum('sens-price-max', 8);
      setNum('sens-price-step', 0.5);
    }
  });
});
