// SPDX-License-Identifier: MIT
import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jiramark from '../lib/index.js';

const { markupToHTML, markupToHTMLWithTimeout } = jiramark;
const root = fileURLToPath(new URL('../', import.meta.url));

test('long non-ASCII documents are accepted without a token-count cutoff', () => {
    const input = '中文'.repeat(12000);
    expect(markupToHTML(input)).toBe('<p>' + '&#20013;&#25991;'.repeat(12000) + '</p>');
});

test('rendering callbacks can re-enter conversion without losing outer options', () => {
    const calls = [];
    const html = markupToHTML('[first|https://one.example] [second|https://two.example]', {
        formatLink(href, content) {
            calls.push(href);
            return '<aside>' + markupToHTML(content) + '</aside>';
        }
    });
    expect(html).toBe('<p><aside><p>first</p></aside> <aside><p>second</p></aside></p>');
    expect(calls.length).toBe(2);
    expect(markupToHTML('[https://third.example]')).toBe('<p><a href="https://third.example">https://third.example</a></p>');
});

test('Worker rendering uses caller closures for all three extension points', async () => {
    const prefix = 'custom:';
    const calls = [];
    const options = {
        formatLink(href, content) { calls.push(href); return prefix + content; },
        formatAttachmentLink(href, content) { calls.push(href); return prefix + content; },
        formatEmbedded(href, settings) { calls.push(href); return prefix + settings.join(','); }
    };
    const input = '[site|https://example.test] [^report.pdf] !chart.png|thumbnail!';
    const sync = markupToHTML(input, options);
    const async = await markupToHTMLWithTimeout(input, options);
    expect(async).toBe(sync);
    expect(calls.length).toBe(6);
});

test('concurrent Worker calls retain separate callbacks', async () => {
    const output = await Promise.all(Array.from({ length: 4 }, (_, i) =>
        markupToHTMLWithTimeout('[https://example.test]', { formatLink: () => String(i) })));
    expect(output).toStrictEqual(['<p>0</p>', '<p>1</p>', '<p>2</p>', '<p>3</p>']);
});

test('errors reject and do not poison subsequent conversions', async () => {
    expect(() => markupToHTML(null)).toThrow(/string/);
    await expect(markupToHTMLWithTimeout(null)).rejects.toThrow(/string/);
    await expect(markupToHTMLWithTimeout('x', { formatLink: 'invalid' })).rejects.toThrow(/function/);
    await expect(markupToHTMLWithTimeout('{code}unterminated')).rejects.toThrow(/Unclosed/);
    await expect(markupToHTMLWithTimeout('[https://example.test]', {
        formatLink() { throw new Error('callback failed'); }
    })).rejects.toThrow(/callback failed/);
    expect(await markupToHTMLWithTimeout('recovered')).toBe('<p>recovered</p>');
});

test('missing color and hostile text do not become executable HTML', () => {
    expect(markupToHTML('{color}safe{color}')).toBe('<p><span>safe</span></p>');
    const output = markupToHTML('<script>alert("x")</script>');
    expect(!output.includes('<script>')).toBeTruthy();
    expect(output.includes('&#60;script&#62;')).toBeTruthy();
    expect(!markupToHTML('{panel:title=<img src=x onerror=alert(1)>}x{panel}').includes('<img')).toBeTruthy();
    expect(!markupToHTML('[javascript:alert(1)]').includes('<a')).toBeTruthy();
});

test('opaque code retains linebreaks and escapes existing entities', () => {
    expect(markupToHTML('{code}\n<&amp;>\n{code}').includes('&#60;&#38;amp;&#62;&#10;')).toBeTruthy();
});

test('nesting is rejected explicitly rather than overflowing the JS stack', () => {
    // Mixed named blocks exercise recursive document parsing.
    let block = 'x';
    for (let i = 0; i < 150; i++) block = (i % 2 ? '{panel}' : '{quote}') + block + (i % 2 ? '{panel}' : '{quote}');
    expect(() => markupToHTML(block)).toThrow(/nesting/);
});

test('Worker deadline terminates an expensive parse and allows process exit', () => {
    const script = `
        const { markupToHTMLWithTimeout } = require(${JSON.stringify(root)});
        markupToHTMLWithTimeout('~a '.repeat(100000)).then(
            () => { process.exitCode = 2; },
            error => { if (!/timed out/.test(error.message)) process.exitCode = 3; }
        );
    `;
    const child = spawnSync(process.execPath, ['-e', script], { timeout: 10000, encoding: 'utf8' });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr).toBe(0);
});

test('CLI usage and file errors have stable exit codes', () => {
    const cli = path.join(root, 'bin/jira2html');
    const usage = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
    expect(usage.status).toBe(2);
    expect(usage.stderr).toMatch(/Usage:/);
    const missing = spawnSync(process.execPath, [cli, path.join(root, 'no-such-fixture')], { encoding: 'utf8' });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/ENOENT/);
});
