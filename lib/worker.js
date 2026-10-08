// SPDX-License-Identifier: MIT
'use strict';

const { parentPort, workerData } = require('node:worker_threads');
const { parse } = require('./parser');
try {
    parentPort.postMessage({ tree: parse(workerData) });
} catch (error) {
    parentPort.postMessage({ error: error.message });
}
