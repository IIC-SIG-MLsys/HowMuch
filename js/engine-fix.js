'use strict';

// ---------------------------------------------------------------------------
// 引擎修正：data.js 的 computeNode 把“TB/s”当成了“GB/s”，导致解码吞吐
// 被低估 1000 倍。此文件在全局层重定义 computeNode，供 engine.js 调用。
// ---------------------------------------------------------------------------

function computeNode(state) {
  const g = state.gpu, m = state.model, o = state.opt;
  const mm = computeModel(m);
  const bytesPerTok = mm.activeBytes + mm.kvBytesPerReq;
  // bandwidthGBps 字段实际单位为 TB/s（如 H200=4.8、B300=8.0），故 ×1e12
  const basePerGpu = (g.bandwidthGBps * 1e12) / bytesPerTok;
  const effPerGpu = basePerGpu * o.bwUtilPct / 100;
  const dsparkPerGpu = effPerGpu * (o.dsparkOn ? o.dsparkSpeedup : 1);
  const nodeDecode = dsparkPerGpu * state.gpusPerNode;
  const nodeDecodeNoDspark = effPerGpu * state.gpusPerNode;

  const flopsPerTok = 2 * m.activeParamsB * 1e9;
  const nodePrefill = g.fp8TFLOPS * 1e12 / flopsPerTok * state.gpusPerNode * o.prefillEffPct / 100;

  const nodeTheoretical = (g.bandwidthGBps * 1e12) / bytesPerTok * state.gpusPerNode;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeNode };
}
