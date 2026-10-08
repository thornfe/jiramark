#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs';
import { markupToHTMLWithTimeout } from './index';

async function main() {
    if (process.argv.length !== 3) {
        console.error('Usage: jira2html <file>');
        process.exitCode = 2;
        return;
    }
    try {
        console.log(await markupToHTMLWithTimeout(readFileSync(process.argv[2], 'utf8')));
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
main();
