'use strict';

// 浏览器中 data.js / engine.js / engine-fix.js 以全局函数互相调用；
// Node 的 CommonJS 模块作用域隔离了这些函数，这里把依赖挂到 global 再跑测试。

const data = require('../js/data.js');
const fix = require('../js/engine-fix.js');

global.computeModel = data.computeModel;
global.computeNode = fix.computeNode;
global.deepClone = data.deepClone;
global.applyGpuPreset = data.applyGpuPreset;
global.applyModelPreset = data.applyModelPreset;
global.blendedPrices = data.blendedPrices;
global.round1 = data.round1;
global.round2 = data.round2;

require('./test-engine.js');
