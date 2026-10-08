// SPDX-License-Identifier: MIT
'use strict';

const { Worker } = require('node:worker_threads');

function parseInWorker(input) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(require.resolve('./worker'), { workerData: input });
        let done = false;
        const timer = setTimeout(() => finish(new Error('JIRA parsing timed out after 3 seconds')), 3000);
        function finish(error, value) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            worker.removeAllListeners('message');
            worker.terminate().catch(() => {});
            if (error) reject(error);
            else resolve(value);
        }
        worker.once('message', message => {
            if (message.error) finish(new Error(message.error));
            else finish(null, message.tree);
        });
        worker.once('error', error => finish(error));
        worker.once('exit', code => finish(new Error('Parser worker exited without a result (code ' + code + ')')));
    });
}
module.exports = { parseInWorker };
