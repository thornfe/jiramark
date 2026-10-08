// SPDX-License-Identifier: MIT
import { describe, expect, test } from 'vitest';
import jiramark from '../lib/index.js';

const { markupToHTML, markupToHTMLWithTimeout } = jiramark;

describe('references and extension callbacks', () => {
    test.each(['https', 'http', 'ftp', 'ftps', 'irc', 'file'])('supported %s addresses become links', scheme => {
        const address = `${scheme}://archive.example/manifest`;
        expect(markupToHTML(`[Manifest|${address}]`)).toBe(`<p><a href="${address}">Manifest</a></p>`);
    });

    test('bare-address punctuation stays outside the link', () => {
        expect(markupToHTML('Inspect (https://yard.example/map), then return.')).toBe(
            '<p>Inspect (<a href="https://yard.example/map">https://yard.example/map</a>), then return.</p>'
        );
    });

    test.each(['#storage', '//yard.example/zone'])('relative reference %s preserves its address', address => {
        expect(markupToHTML(`[Location|${address}]`)).toBe(`<p><a href="${address}">Location</a></p>`);
    });

    test.each(['javascript:run()', 'mailto:crew@example.test', 'custom:manifest'])
       ('unrecognized address %s remains visible text', address => {
            expect(markupToHTML(`[${address}]`)).toBe(`<p>[${address}]</p>`);
        });

    test('default attachments, pictures and user references can share a paragraph', () => {
        expect(markupToHTML('[Receipt|^receipt-73.pdf] !zone-73.png|thumbnail! [~night.crew]')).toBe(
            '<p><a href="#">Receipt</a> <img src="zone-73.png" /> @night.crew</p>'
        );
    });

    for (const [name, convert] of Object.entries({ sync: markupToHTML, worker: markupToHTMLWithTimeout })) {
        test(`${name} callbacks receive original addresses and rendered labels exactly once`, async () => {
            const calls = [];
            const options = {
                formatLink(href, html) { calls.push(['link', href, html]); return 'LINK'; },
                formatAttachmentLink(href, html) { calls.push(['file', href, html]); return 'FILE'; },
                formatEmbedded(href, settings) { calls.push(['image', href, settings]); return 'IMAGE'; }
            };
            const input = '[*Track*|https://cargo.example/?batch=9&slot=4] ' +
                '[Permit|^permit-9.pdf] !berth 9.png|align=left, width=240!';
            expect(await convert(input, options)).toBe('<p>LINK FILE IMAGE</p>');
            expect(calls).toEqual([
                ['link', 'https://cargo.example/?batch=9&slot=4', '<b>Track</b>'],
                ['file', 'permit-9.pdf', 'Permit'],
                ['image', 'berth 9.png', ['align=left', 'width=240']]
            ]);
        });
    }
});
