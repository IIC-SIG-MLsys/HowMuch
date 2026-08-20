'use strict';

// ---------------------------------------------------------------------------
// UI 修正：ECharts 在 display:none 容器中初始化会得到 0 尺寸，切到对应
// 标签页后需要触发一次 resize 才能正确渲染。这里在标签切换后补发 resize。
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    });
  });
});
