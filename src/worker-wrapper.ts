// SPDX-License-Identifier: MIT

import { Worker } from 'node:worker_threads';
import type { Node, WorkerResult } from './types';

export function parseInWorker(input: string): Promise<Node[]> {
    return new Promise<Node[]>((resolve, reject) => {
        const worker = new Worker(require.resolve('./worker'), { workerData: input });
        let done = false;
        const timer = setTimeout(() => finish(new Error('JIRA parsing timed out after 3 seconds')), 3000);
        function finish(error: Error | null, value?: Node[]) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            worker.removeAllListeners('message');
            worker.terminate().catch(() => {});
            if (error) reject(error);
            else resolve(value!);
        }
        worker.once('message', (message: WorkerResult) => {
            if (message.error) finish(new Error(message.error));
            else finish(null, message.tree);
        });
        worker.once('error', error => finish(error));
        worker.once('exit', code => finish(new Error('Parser worker exited without a result (code ' + code + ')')));
    });
}
