// SPDX-License-Identifier: MIT
'use strict';

const { parse } = require('./parser');
const { render } = require('./render');

function validate(str, ops) {
    if (typeof str !== 'string') throw new TypeError('str must be a string');
    if (ops !== undefined && (ops === null || typeof ops !== 'object' || Array.isArray(ops))) throw new TypeError('ops must be an object');
    for (const key of ['formatLink', 'formatAttachmentLink', 'formatEmbedded']) {
        if (ops && ops[key] !== undefined && typeof ops[key] !== 'function') throw new TypeError(key + ' must be a function');
    }
}

function markupToHTML(str, ops) {
    validate(str, ops);
    return render(parse(str), ops);
}

async function markupToHTMLWithTimeout(str, ops) {
    validate(str, ops);
    const { parseInWorker } = require('./worker-wrapper');
    const tree = await parseInWorker(str);
    return render(tree, ops);
}

module.exports = { markupToHTML, markupToHTMLWithTimeout };
