'use strict';

// 浏览器中 data.js / engine.js 以全局函数互相调用；
// Node 的 CommonJS 模块作用域隔离了这些函数，这里把依赖挂到 global 再跑测试。

const data = require('../js/data.js');

global.deepClone = data.deepClone;
global.applyGpuPreset = data.applyGpuPreset;
global.applyModelPreset = data.applyModelPreset;
global.round2 = data.round2;

require('./test-engine.js');
