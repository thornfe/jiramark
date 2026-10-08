// SPDX-License-Identifier: MIT
import { describe, expect, test } from 'vitest';
import jiramark from '../lib/index.js';

const { markupToHTML } = jiramark;

describe('structured documents', () => {
    test('a shift report keeps headings, rows, links and follow-up prose separate', () => {
        const input = [
            'h2. Shift 47', '', '||Zone||State||', '|East|*ready*|',
            '|West|[inspect|https://ops.example/47]|', '', 'Signed off.'
        ].join('\n');
        expect(markupToHTML(input)).toBe(
            '<h2>Shift 47</h2>\n<table><tbody>\n' +
            '<tr><th>Zone</th><th>State</th></tr>\n' +
            '<tr><td>East</td><td><b>ready</b></td></tr>\n' +
            '<tr><td>West</td><td><a href="https://ops.example/47">inspect</a></td></tr>\n' +
            '</tbody></table>\n<p>Signed off.</p>'
        );
    });

    test('mixed-depth work items return to the parent level', () => {
        expect(markupToHTML('# Receive\n#* Weigh\n#* Seal\n# Dispatch')).toBe(
            '<ol>\n<li>Receive\n<ul>\n<li>Weigh</li>\n<li>Seal</li>\n</ul></li>\n' +
            '<li>Dispatch</li>\n</ol>'
        );
    });

    test.each(['*', '-'])('bullet %s supports continuation and paragraph termination', bullet => {
        expect(markupToHTML(`${bullet} Pack\n  with insulation\n${bullet} Label\n\nReleased`)).toBe(
            '<ul>\n<li>Pack<br />\nwith insulation</li>\n<li>Label</li>\n</ul>\n<p>Released</p>'
        );
    });

    test('a cell owns its list and the following cell remains separate', () => {
        expect(markupToHTML('|# Scan\n# Load|Queued|')).toBe(
            '<table><tbody>\n<tr><td><ol>\n<li>Scan</li>\n<li>Load</li>\n</ol></td>' +
            '<td>Queued</td></tr>\n</tbody></table>'
        );
    });

    test('multiline cell text uses line breaks without paragraph wrappers', () => {
        expect(markupToHTML('||Address|Pier 7\nLevel 2|')).toBe(
            '<table><tbody>\n<tr><th>Address</th><td>Pier 7<br />Level 2</td></tr>\n</tbody></table>'
        );
    });

    test('a titled panel has explicit wrapper, title and content classes', () => {
        expect(markupToHTML('{panel:title=Dock status}Capacity *limited*{panel}')).toBe(
            '<div class="panel ">\n<div class="panelHeader "><b>Dock status</b></div>\n' +
            '<div class="panelContent ">\n<p>Capacity <b>limited</b></p>\n</div>\n</div>'
        );
    });

    test('quotation can contain a panel without losing its closing boundary', () => {
        const html = markupToHTML('{quote}Advisory\n{panel:title=Wind}Use berth 8{panel}{quote}\nCleared');
        expect(html).toMatch(/^<blockquote>\n<p>Advisory<\/p>\n<div class="panel ">/);
        expect(html).toContain('<b>Wind</b>');
        expect(html).toContain('<p>Use berth 8</p>');
        expect(html).toMatch(/<\/div>\n<\/blockquote>\n<p>Cleared<\/p>$/);
    });

    test('a line quotation is distinct from the next ordinary paragraph', () => {
        expect(markupToHTML('bq. Weather _improving_\n\nResume work'))
            .toBe('<blockquote>Weather <i>improving</i></blockquote>\n<p>Resume work</p>');
    });

    test.each(['code', 'noformat'])('%s treats markup, pipes and macro names as opaque text', kind => {
        const html = markupToHTML(`{${kind}}\n{panel}*keep* | <raw>\n{${kind}}`);
        expect(html).toContain('<pre>{panel}*keep* | &#60;raw&#62;&#10;</pre>');
        expect(html).not.toContain('<b>keep</b>');
        expect(html).not.toContain('<table>');
        expect(html).not.toContain('panelHeader');
    });

    test.each(['code', 'noformat', 'quote', 'panel'])('an unclosed %s block reports a parse error', kind => {
        expect(() => markupToHTML(`Draft {${kind}}missing terminator`)).toThrow(/Unclosed/);
    });

    test('joining separately delimited sections preserves their individual rendering', () => {
        const sections = ['h3. Inventory', 'bq. Count verified', '# Lock\n# Sign', '|SKU|Z19|'];
        expect(markupToHTML(sections.join('\n\n')))
            .toBe(sections.map(section => markupToHTML(section)).join('\n'));
    });
});
