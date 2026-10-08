// SPDX-License-Identifier: MIT
import { describe, expect, test } from 'vitest';
import jiramark from '../lib/index.js';

const { markupToHTML } = jiramark;

describe('text contract', () => {
    test.each(['', '  ', '\n\t\n', '\u00a0\n'])('empty document %j has no markup', input => {
        expect(markupToHTML(input)).toBe('');
    });

    test.each(['\n', '\r\n', '\r'])('line separator %j has consistent paragraph semantics', newline => {
        const input = ['Intake', 'Validated', '', 'Archived'].join(newline);
        expect(markupToHTML(input)).toBe('<p>Intake<br />\nValidated</p>\n<p>Archived</p>');
    });

    test.each([1, 2, 3, 4, 5, 6])('heading level %i remains distinct from surrounding prose', level => {
        expect(markupToHTML(`Preface\nh${level}. Milestone ${level}\n\nEpilogue`))
            .toBe(`<p>Preface</p>\n<h${level}>Milestone ${level}</h${level}>\n<p>Epilogue</p>`);
    });

    test('untrusted text and Unicode are encoded without losing characters', () => {
        expect(markupToHTML('港 🚢 <dock> & "berth"'))
            .toBe('<p>&#28207; &#128674; &#60;dock&#62; &#38; &#34;berth&#34;</p>');
        expect(markupToHTML('Price &euro; &#8364;')).toBe('<p>Price &euro; &#8364;</p>');
    });

    test('formatting composes across an operational note', () => {
        const input = '*Urgent*: _inspect_ {{rack_09}}; -retired- +replacement+; CO~2~ x^3^ ??memo??';
        expect(markupToHTML(input)).toBe(
            '<p><b>Urgent</b>: <i>inspect</i> <code>rack_09</code>; ' +
            '<del>retired</del> <ins>replacement</ins>; CO~2~ x^3^ <cite>memo</cite></p>'
        );
    });

    test('nested emphasis and adjacent spans preserve their boundaries', () => {
        expect(markupToHTML('*Depot _west_* +open+-closed-'))
            .toBe('<p><b>Depot <i>west</i></b> <ins>open</ins><del>closed</del></p>');
    });

    test('subscript and superscript can annotate independent values', () => {
        expect(markupToHTML('Index ~12~ and power ^4^'))
            .toBe('<p>Index <sub>12</sub> and power <sup>4</sup></p>');
    });

    test('escape sequences keep delimiters literal', () => {
        expect(markupToHTML(String.raw`\*crate\* \[A7\] \{slot\} C:\\archive`))
            .toBe('<p>*crate* [A7] {slot} C:\\archive</p>');
    });

    test.each(['unmatched _delimiter', 'invoice_2026_09.csv', 'TKT-808', 'sum = 8 + 13'])
       ('ordinary punctuation remains text: %s', input => {
            expect(markupToHTML(input)).toBe(`<p>${input}</p>`);
        });

    test.each(['teal', '#12aBc9'])('color %s is represented as a span', color => {
        expect(markupToHTML(`Status: {color:${color}}available{color}`))
            .toBe(`<p>Status: <span style="color: ${color}">available</span></p>`);
    });

    test.each(['red;position:fixed', 'url(example)', '" onclick="boom'])
       ('unsupported color %j cannot escape its attribute', color => {
            expect(markupToHTML(`{color:${color}}reserved{color}`)).toBe('<p><span>reserved</span></p>');
        });
});
