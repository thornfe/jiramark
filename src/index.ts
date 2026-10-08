// SPDX-License-Identifier: MIT

import { parse } from './parser';
import { render } from './render';
import { parseInWorker } from './worker-wrapper';
import type { RenderOptions } from './types';
export type { RenderOptions } from './types';

function validate(str: string, ops?: RenderOptions) {
    if (typeof str !== 'string') throw new TypeError('str must be a string');
    if (ops !== undefined && (ops === null || typeof ops !== 'object' || Array.isArray(ops))) throw new TypeError('ops must be an object');
    for (const key of ['formatLink', 'formatAttachmentLink', 'formatEmbedded'] as const) {
        if (ops && ops[key] !== undefined && typeof ops[key] !== 'function') throw new TypeError(key + ' must be a function');
    }
}

export function markupToHTML(str: string, ops?: RenderOptions): string {
    validate(str, ops);
    return render(parse(str), ops);
}

export async function markupToHTMLWithTimeout(str: string, ops?: RenderOptions): Promise<string> {
    validate(str, ops);
    const tree = await parseInWorker(str);
    return render(tree, ops);
}
