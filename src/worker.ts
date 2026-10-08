// SPDX-License-Identifier: MIT

import { parentPort, workerData } from 'node:worker_threads';
import { parse } from './parser';
import type { WorkerResult } from './types';
if (!parentPort) throw new Error('Parser must run in a Worker');
try {
    parentPort.postMessage({ tree: parse(workerData) } satisfies WorkerResult);
} catch (error) {
    parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) } satisfies WorkerResult);
}
