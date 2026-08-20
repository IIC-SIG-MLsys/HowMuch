'use strict';

const Charts = (() => {
  const instances = {};
  const T = key => I18N.t(key);

  function available() {
    return typeof echarts !== 'undefined';
  }

  function mount(elId, option) {
    const el = document.getElementById(elId);
    if (!el) return null;
    if (!available()) {
      el.innerHTML = '<div class="warning-box">Chart library unavailable — tables & calculations still work.</div>';
      return null;
    }
    if (!instances[elId]) {
      instances[elId] = echarts.init(el, null, { renderer: 'canvas' });
    }
    instances[elId].setOption(option, true);
    return instances[elId];
  }

  function resizeAll() {
    Object.values(instances).forEach(chart => chart.resize());
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
      grid: { left: 130, right: 36, top: 30, bottom: 40, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'tok/s',
        nameTextStyle: { color: '#93a1c4' },
        axisLabel: { color: '#93a1c4', formatter: v => fmtCompact(v) }
      },
      yAxis: {
        type: 'category',
        data: [T('chart.prefill'), T('chart.decodeBase'), T('chart.decodeDspark')],
        axisLabel: { color: '#c7d2f0', width: 120, overflow: 'truncate' }
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
      [T('chart.rent'), cost.rent],
      [T('chart.amort'), cost.amort],
      [T('chart.maint'), cost.maint],
      [T('chart.power'), cost.power],
      [T('chart.ops'), cost.ops]
    ].filter(x => x[1] > 0);
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'item', formatter: p => `${p.name}<br>${money(p.value, currency)}（${p.percent}%）` },
      legend: { bottom: 0, textStyle: { color: '#93a1c4' } },
      series: [{
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        data: items.map(([name, value], i) => ({
          name,
          value: Math.round(value),
          itemStyle: { color: ['#6d8dff', '#22d3ee', '#fbbf24', '#34d399', '#f87171'][i % 5] }
        })),
        label: { color: '#c7d2f0', formatter: '{b}\n{d}%', overflow: 'break' },
        labelLine: { length: 12, length2: 12 }
      }]
    };
  }

  function profitCurveOption(curve, currency, breakEvenUtil) {
    const markLineData = [];
    if (breakEvenUtil !== null && breakEvenUtil >= 0 && breakEvenUtil <= 110) {
      const idx = curve.findIndex(c => c.u >= breakEvenUtil);
      if (idx >= 0) {
        markLineData.push({
          xAxis: idx,
          label: { formatter: T('chart.beMark', { v: Math.round(breakEvenUtil) }), color: '#fbbf24' },
          lineStyle: { color: '#fbbf24', type: 'dashed' }
        });
      }
    }
    return {
      ...base,
      legend: { top: 0, textStyle: { color: '#93a1c4' } },
      grid: { left: 80, right: 80, top: 40, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: curve.map(c => c.u + '%'),
        axisLabel: { color: '#93a1c4', interval: 3 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#93a1c4', formatter: v => money(v, currency, true) }
      },
      series: [
        { name: T('chart.revenue'), type: 'line', smooth: true, data: curve.map(c => c.revenue), itemStyle: { color: '#22d3ee' }, areaStyle: { color: 'rgba(34,211,238,.08)' } },
        { name: T('chart.cost'), type: 'line', smooth: true, data: curve.map(c => c.cost), itemStyle: { color: '#f87171' } },
        {
          name: T('chart.profit'), type: 'line', smooth: true, data: curve.map(c => c.profit),
          itemStyle: { color: '#34d399' }, areaStyle: { color: 'rgba(52,211,153,.08)' },
          markLine: { symbol: 'none', data: markLineData }
        }
      ]
    };
  }

  function tornadoOption(items, currency, pct) {
    const names = items.map(i => i.label);
    return {
      ...base,
      tooltip: {
        ...base.tooltip,
        trigger: 'axis',
        formatter: ps => {
          const idx = ps[0].dataIndex;
          const it = items[idx];
          return `${it.label}<br>−${pct}%: ${money(it.down, currency, true)}<br>+${pct}%: ${money(it.up, currency, true)}`;
        }
      },
      grid: { left: 170, right: 90, top: 20, bottom: 30, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#93a1c4', formatter: v => money(v, currency, true) }
      },
      yAxis: { type: 'category', data: names, axisLabel: { color: '#c7d2f0', width: 150, overflow: 'truncate' } },
      series: [
        {
          name: T('chart.down'),
          type: 'bar',
          stack: 't',
          data: items.map(i => Math.min(i.down, 0)),
          itemStyle: { color: '#f87171' },
          label: { show: true, position: 'left', color: '#f87171', formatter: p => p.value ? money(p.value, currency, true) : '' }
        },
        {
          name: T('chart.up'),
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
    if (compact && Math.abs(v) >= 1000) return sym + (v / 1e3).toFixed(2) + 'k';
    return sym + Math.round(v).toLocaleString();
  }

  return {
    available,
    mount,
    resizeAll,
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
