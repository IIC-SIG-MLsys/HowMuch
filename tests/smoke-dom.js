'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
// 冒烟测试去掉 ECharts（jsdom 无 canvas），验证应用逻辑本身
html = html.replace(/<script src="vendor\/echarts\.min\.js[^"]*"><\/script>/, '');
const css = fs.readFileSync(path.join(__dirname, '..', 'css/style.css'), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file://' + htmlPath,
  beforeParse(window) {
    window.addEventListener('error', e => errors.push(e.message));
  }
});

const { window } = dom;
const { document: d } = window;

function ok(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

function change(id, value) {
  const el = d.getElementById(id);
  el.value = value;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function input(id, value) {
  const el = d.getElementById(id);
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      ok(d.querySelector('#profit-kpis').innerHTML.length > 200, 'profit KPIs rendered');
      ok(d.querySelector('#mini-summary').textContent.includes('月毛利'), 'mini summary rendered');
      ok(d.querySelector('main').className === '', 'main no longer has container class (padding override bug)');
      ok(css.includes('padding: 48px 20px 48px'), 'main top padding rule present');
      ok(d.querySelectorAll('#heatmap-wrap table tr').length >= 3, 'heatmap table rendered');
      ok(d.querySelector('#rent-buy-wrap').textContent.includes('采购'), 'rent-buy compare rendered');
      ok(d.querySelector('#unit-econ').textContent.includes('每百万输出 token 成本'), 'unit economics rendered');
      ok(d.querySelector('#heatmap-legend').textContent.includes('盈利'), 'heatmap legend rendered');
      ok(d.querySelector('#biz-note').textContent.includes('官方参考价'), 'official hint rendered');
      ok(d.querySelectorAll('#capacity-kpis .kpi').length >= 6, 'capacity KPIs rendered');
      ok(d.querySelector('#source-list').children.length >= 10, 'sources rendered');

      d.querySelector('[data-scenario="premium"]').click();
      ok(d.getElementById('biz-mode').value === 'premium', 'premium scenario sets mode');
      ok(Math.abs(parseFloat(d.getElementById('biz-out-price').value) - 3) < 1e-6, 'premium scenario sets USD price 3');
      ok(d.getElementById('toast').textContent.includes('溢价转售'), 'scenario toast feedback');

      d.querySelector('[data-scenario="official"]').click();
      ok(d.getElementById('biz-mode').value === 'official', 'official scenario sets mode');
      ok(Math.abs(parseFloat(d.getElementById('biz-out-price').value) - 4.5 / 7.2) < 0.02, 'official scenario sets USD price');
      ok(d.getElementById('biz-peak-share').value === '33', 'official scenario sets peak share 33%');

      d.querySelector('[data-scenario="private"]').click();
      ok(d.getElementById('biz-mode').value === 'private', 'private scenario sets mode');
      ok(d.getElementById('biz-private-nodes').value === '5', 'private scenario sets all nodes');
      ok(d.getElementById('sens-price-min').value === '5', 'private scenario switches sensitivity axis to contract');

      input('gpu-rent', 4);
      ok(parseFloat(d.getElementById('gpu-rent').value) === 4, 'rent input applied');

      d.getElementById('currency-btn').click();
      ok(Math.abs(parseFloat(d.getElementById('gpu-rent').value) - 4 * 7.2) < 0.01, 'currency switch converts money (rent)');
      ok(Math.abs(parseFloat(d.getElementById('biz-contract').value) - 25000 * 7.2) < 1, 'currency switch converts money (contract)');
      ok(d.getElementById('currency-btn').textContent === '¥ CNY', 'currency button label updates');

      change('model-key', 'v4-pro-fp4');
      ok(d.getElementById('model-total-params').value === '1600', 'model preset applies params');

      change('gpu-nodes', -3);
      ok(parseFloat(d.getElementById('gpu-nodes').value) >= 1, 'node count clamped');
      change('gpu-nodes', 5.5);
      ok(parseFloat(d.getElementById('gpu-nodes').value) === 6, 'integer fields rounded');

      change('gpu-key', 'b300');
      ok(Math.abs(parseFloat(d.getElementById('gpu-rent').value) - 8 * 7.2) < 0.01, 'GPU preset converts rent to CNY');
      ok(Math.abs(parseFloat(d.getElementById('gpu-purchase').value) - 550000 * 7.2) < 1, 'GPU preset converts purchase to CNY');

      const resetBtn = [...d.querySelectorAll('.header-actions .btn')].find(b => b.textContent === '重置默认');
      resetBtn.click();
      ok(d.getElementById('currency-btn').textContent === '¥ CNY', 'reset keeps CNY');
      ok(Math.abs(parseFloat(d.getElementById('gpu-rent').value) - 3.5 * 7.2) < 0.01, 'reset converts defaults to CNY');

      d.getElementById('btn-save-snapshot').click();
      ok(d.querySelector('#snapshot-compare').textContent.includes('当前方案'), 'snapshot saved and compared');
      d.getElementById('btn-clear-snapshot').click();
      ok(d.querySelector('#snapshot-compare').textContent.includes('尚未保存快照'), 'snapshot cleared');

      // 获取方式联动：租用默认隐藏电费/机房/折旧字段，采购自持才显示
      ok(d.getElementById('cost-elec').closest('.field').hasAttribute('hidden'), 'rent mode hides electricity field');
      ok(d.getElementById('cost-amort').closest('.field').hasAttribute('hidden'), 'rent mode hides amortization field');
      ok(!d.getElementById('cost-rent-incl').closest('.field').hasAttribute('hidden'), 'rent mode shows all-in checkbox');
      ok(d.getElementById('rent-mode-note').textContent.includes('云 GPU 租用'), 'rent mode note rendered');
      change('cost-rent-mode', 'buy');
      ok(!d.getElementById('cost-elec').closest('.field').hasAttribute('hidden'), 'buy mode shows electricity field');
      ok(!d.getElementById('cost-amort').closest('.field').hasAttribute('hidden'), 'buy mode shows amortization field');
      ok(d.getElementById('cost-rent-incl').closest('.field').hasAttribute('hidden'), 'buy mode hides all-in checkbox');
      ok(d.getElementById('rent-mode-note').textContent.includes('采购自持'), 'buy mode note rendered');
      change('cost-rent-mode', 'rent');
      ok(d.getElementById('cost-elec').closest('.field').hasAttribute('hidden'), 'back to rent hides electricity again');

      // 商业模式联动：溢价模式显示 API 定价、隐藏合同；私有化相反
      ok(!d.getElementById('biz-out-price').closest('.field').hasAttribute('hidden'), 'premium mode shows API pricing');
      ok(d.getElementById('biz-contract').closest('.field').hasAttribute('hidden'), 'premium mode hides contract fields');
      d.querySelector('[data-scenario="private"]').click();
      ok(d.getElementById('biz-out-price').closest('.field').hasAttribute('hidden'), 'private mode hides API pricing');
      ok(!d.getElementById('biz-contract').closest('.field').hasAttribute('hidden'), 'private mode shows contract fields');
      d.querySelector('[data-scenario="premium"]').click();

      // 自定义 GPU 才显示手动规格字段
      ok(d.getElementById('gpu-hbm').closest('.field').hasAttribute('hidden'), 'preset GPU hides manual specs');
      change('gpu-key', 'custom');
      ok(!d.getElementById('gpu-hbm').closest('.field').hasAttribute('hidden'), 'custom GPU shows manual specs');
      change('gpu-key', 'h200');

      ok(!!d.getElementById('cost-residual'), 'residual rate input exists');
      ok(!!d.getElementById('btn-copy'), 'copy summary button exists');
      ok(!!d.getElementById('btn-more'), 'mobile more button exists');
      ok(!!d.getElementById('opt-kernel'), 'kernel optimization toggle exists');
      ok(!!d.getElementById('opt-chunked'), 'chunked prefill toggle exists');
      ok(!!d.getElementById('opt-kvprecision'), 'KV precision select exists');
      ok(!!d.getElementById('opt-batching'), 'batching factor input exists');
      ok(!!d.getElementById('opt-moe'), 'MoE optimization toggle exists');
      ok(!!d.getElementById('btn-expand-all'), 'expand-all button exists');
      ok(!!d.getElementById('btn-collapse-all'), 'collapse-all button exists');
      ok(!!d.getElementById('mobile-cta'), 'mobile CTA exists');
      ok(d.getElementById('mobile-cta-value').textContent !== '—', 'mobile CTA value updated');
      ok(d.querySelectorAll('#profit-kpis .kpi-group-title').length >= 2, 'profit KPIs grouped');
      ok(d.querySelectorAll('#capacity-kpis .kpi-group-title').length >= 2, 'capacity KPIs grouped');

      d.getElementById('btn-collapse-all').click();
      ok(d.querySelectorAll('#panel-setup details[open]').length === 0, 'collapse-all works');
      d.getElementById('btn-expand-all').click();
      ok(d.querySelectorAll('#panel-setup details[open]').length >= 5, 'expand-all works');

      d.getElementById('mobile-cta-btn').click();
      ok(d.getElementById('panel-profit').classList.contains('active'), 'mobile CTA switches to profit tab');

      d.getElementById('btn-more').click();
      ok(d.querySelector('.header-side').classList.contains('open'), 'mobile more menu opens');
      ok(d.getElementById('btn-more').getAttribute('aria-expanded') === 'true', 'mobile more aria-expanded true');
      d.getElementById('btn-more').click();
      ok(!d.querySelector('.header-side').classList.contains('open'), 'mobile more menu closes');

      ok(d.querySelectorAll('#assumptions-wrap table tr').length >= 6, 'assumptions table rendered');
      ok(!d.querySelector('.site-footer').textContent.includes('GitHub Pages'), 'footer sentence removed');

      d.querySelector('[data-reliability="optimistic"]').click();
      ok(parseFloat(d.getElementById('opt-bwutil').value) === 60, 'optimistic scenario sets BW util 60%');
      ok(Math.abs(parseFloat(d.getElementById('opt-dspark-speedup').value) - 1.85) < 1e-6, 'optimistic scenario sets DSpark 1.85');
      ok(d.getElementById('opt-kvprecision').value === '3bit', 'optimistic scenario sets 3-bit KV');
      ok(Math.abs(parseFloat(d.getElementById('opt-batching').value) - 1.1) < 1e-6, 'optimistic scenario sets batching 1.1');

      ok(d.getElementById('biz-mode-desc').textContent.length > 10, 'mode description rendered');

      d.querySelector('[data-lang="en"]').click();
      ok(d.getElementById('btn-copy').textContent === 'Copy summary', 'English static text applied');
      ok(d.querySelector('#mini-summary').textContent.includes('Monthly profit'), 'English dynamic text applied');
      ok(d.querySelector('#assumptions-wrap').textContent.includes('Parameter'), 'English assumptions applied');

      d.querySelector('[data-lang="zh"]').click();
      ok(d.getElementById('btn-copy').textContent === '复制摘要', 'Chinese static text restored');
      ok(d.querySelector('#mini-summary').textContent.includes('月毛利'), 'Chinese dynamic text restored');

      ok(errors.length === 0, 'no uncaught errors: ' + errors.join(' | '));
      console.log('\nDOM smoke test passed.');
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    } finally {
      window.close();
    }
  }, 300);
});
