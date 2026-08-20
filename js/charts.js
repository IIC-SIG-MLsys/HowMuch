'use strict';

const Charts = (() => {
  const instances = {};

  function available() {
    return typeof echarts !== 'undefined';
  }

  function mount(elId, option) {
    const el = document.getElementById(elId);
    if (!el) return null;
    if (!available()) {
      el.innerHTML = '<div class="warning-box">图表库未加载（需联网或检查 vendor/echarts.min.js），其余计算不受影响。</div>';
      return null;
    }
    if (!instances[elId]) {
      instances[elId] = echarts.init(el, null, { renderer: 'canvas' });
      window.addEventListener('resize', () => instances[elId] && instances[elId].resize());
    }
    instances[elId].setOption(option, true);
    return instances[elId];
  }

  const base = {
    backgroundColor: 'transparent',
    textStyle: { color: '#c7d2f0' },
    tooltip: { trigger: 'axis', backgroundColor: '#131b31', borderColor: '#233052', textStyle: { color: '#e8edff' } }
  };

  function throughputOption(n) {
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 70, right: 24, top: 30, bottom: 40 },
      xAxis: {
        type: 'value',
        name: 'tok/s',
        nameTextStyle: { color: '#93a1c4' },
        axisLabel: { color: '#93a1c4', formatter: v => fmtCompact(v) }
      },
      yAxis: {
        type: 'category',
        data: ['预填充（输入）', '解码-未优化', '解码-DSpark'],
        axisLabel: { color: '#c7d2f0' }
      },
      series: [{
        type: 'bar',
        data: [
          { value: n.nodePrefill, itemStyle: { color: '#22d3ee' } },
          { value: n.nodeDecodeNoDspark, itemStyle: { color: '#6d8dff' } },
          { value: n.nodeDecode, itemStyle: { color: '#34d399' } }
        ],
        barWidth: 26,
        label: { show: true, position: 'right', color: '#e8edff', formatter: p => fmtCompact(p.value) }
      }]
    };
  }

  function costOption(cost, currency) {
    const items = [
      ['租金', cost.rent],
      ['折旧', cost.amort],
      ['维护', cost.maint],
      ['电费', cost.power],
      ['机房/运维', cost.ops]
    ].filter(x => x[1] > 0);
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'item', formatter: p => `${p.name}<br>${money(p.value, currency)}（${p.percent}%）` },
      legend: { bottom: 0, textStyle: { color: '#93a1c4' } },
      series: [{
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['50%', '45%'],
        data: items.map(([name, value], i) => ({
          name,
          value: Math.round(value),
          itemStyle: { color: ['#6d8dff', '#22d3ee', '#fbbf24', '#34d399', '#f87171'][i % 5] }
        })),
        label: { color: '#c7d2f0', formatter: '{b}\n{d}%' }
      }]
    };
  }

  function profitCurveOption(curve, currency) {
    return {
      ...base,
      legend: { top: 0, textStyle: { color: '#93a1c4' } },
      grid: { left: 70, right: 70, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: curve.map(c => c.u + '%'), axisLabel: { color: '#93a1c4' } },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#93a1c4', formatter: v => money(v, currency, true) }
      },
      series: [
        { name: '收入', type: 'line', smooth: true, data: curve.map(c => c.revenue), itemStyle: { color: '#22d3ee' }, areaStyle: { color: 'rgba(34,211,238,.08)' } },
        { name: '成本', type: 'line', smooth: true, data: curve.map(c => c.cost), itemStyle: { color: '#f87171' } },
        { name: '毛利', type: 'line', smooth: true, data: curve.map(c => c.profit), itemStyle: { color: '#34d399' }, areaStyle: { color: 'rgba(52,211,153,.08)' } }
      ]
    };
  }

  function tornadoOption(items, currency) {
    const names = items.map(i => i.label);
    return {
      ...base,
      tooltip: {
        ...base.tooltip,
        trigger: 'axis',
        formatter: ps => {
          const idx = ps[0].dataIndex;
          const it = items[idx];
          return `${it.label}<br>−20%: ${money(it.down, currency, true)}<br>+20%: ${money(it.up, currency, true)}`;
        }
      },
      grid: { left: 120, right: 70, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#93a1c4', formatter: v => money(v, currency, true) }
      },
      yAxis: { type: 'category', data: names, axisLabel: { color: '#c7d2f0' } },
      series: [
        {
          name: '下降',
          type: 'bar',
          stack: 't',
          data: items.map(i => Math.min(i.down, 0)),
          itemStyle: { color: '#f87171' },
          label: { show: true, position: 'left', color: '#f87171', formatter: p => p.value ? money(p.value, currency, true) : '' }
        },
        {
          name: '上升',
          type: 'bar',
          stack: 't',
          data: items.map(i => Math.max(i.up, 0)),
          itemStyle: { color: '#34d399' },
          label: { show: true, position: 'right', color: '#34d399', formatter: p => p.value ? money(p.value, currency, true) : '' }
        }
      ]
    };
  }

  function fmtCompact(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
    return Math.round(v).toLocaleString();
  }

  function money(v, currency, compact = false) {
    const sym = currency === 'CNY' ? '¥' : '$';
    if (compact && Math.abs(v) >= 1e6) return sym + (v / 1e6).toFixed(1) + 'M';
    if (compact && Math.abs(v) >= 1e4) return sym + (v / 1e3).toFixed(1) + 'k';
    return sym + Math.round(v).toLocaleString();
  }

  return {
    available,
    mount,
    throughputOption,
    costOption,
    profitCurveOption,
    tornadoOption,
    fmtCompact,
    money
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Charts };
}
