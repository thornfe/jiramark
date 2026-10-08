// SPDX-License-Identifier: MIT

import type { Node, ListItem, TableCell } from './types';

const FORMATS: Record<string, string> = { '??': 'cite', '*': 'b', '_': 'i', '~': 'sub', '^': 'sup', '-': 'del', '+': 'ins', '{{': 'code' };
const MACRO = /^[ \t\u00a0]*(\{(code|noformat|quote|panel)(?::([^}]*))?\})/;
const BULLET = /^[ \t\u00a0]*([#*-](?:[ \t\u00a0]*[#*-])*)[ \t\u00a0]+(?=\S)/;
const URL = /^(?:https?|ftps?|file|irc):\/\/[a-zA-Z0-9!#-/:;=?@_~]+/;
const ADDRESS = /^(?:(?:https?|ftps?|file|irc):\/\/|\/\/|#)[a-zA-Z0-9!#-/:;=?@_~]+$/;

function text(value: string, literal = false): Node { return { kind: 'text', value, literal }; }
function tag(name: string, children: Node[]): Node { return { kind: 'tag', name, children }; }

class Parser {
    private deadline: number;
    private depth: number;
    constructor() {
        this.deadline = Date.now() + 5000;
        this.depth = 0;
    }

    check() {
        if (Date.now() > this.deadline) throw new Error('JIRA parsing timed out after 5 seconds');
        if (this.depth > 128) throw new Error('JIRA nesting exceeds 128 levels');
    }

    nested<T>(fn: () => T): T {
        this.depth++;
        try { this.check(); return fn(); } finally { this.depth--; }
    }

    closing(source: string, start: number, marker: string): number {
        let pos = start;
        while ((pos = source.indexOf(marker, pos)) !== -1) {
            this.check();
            let slashes = 0;
            for (let i = pos - 1; i >= 0 && source[i] === '\\'; i--) slashes++;
            if (!(slashes % 2) && pos > start && !/\s/.test(source[pos - 1]) &&
                (marker.length > 1 || !/[a-zA-Z0-9]/.test(source[pos + marker.length] || ''))) return pos;
            pos += marker.length;
        }
        return -1;
    }

    inline(source: string, disabled = new Set<string>()): Node[] {
        return this.nested(() => {
            const out: Node[] = [];
            let plain = '';
            let adjacent = true;
            const flush = () => { if (plain) { out.push(text(plain)); plain = ''; } };
            for (let i = 0; i < source.length;) {
                this.check();
                const rest = source.slice(i);
                if (rest[0] === '\\' && /[\[\]{}\\*_~^+?\-]/.test(rest[1] || '')) {
                    plain += rest[1]; i += 2; adjacent = false; continue;
                }
                const user = /^\[~([^\]|]+)\]/.exec(rest);
                if (user) { flush(); out.push(text('@' + user[1], true)); i += user[0].length; adjacent = false; continue; }
                if (rest[0] === '[') {
                    let end = i + 1;
                    while (end < source.length && (source[end] !== ']' || source[end - 1] === '\\')) end++;
                    if (end < source.length) {
                        const body = source.slice(i + 1, end);
                        const bar = body.lastIndexOf('|');
                        const href = (bar < 0 ? body : body.slice(bar + 1)).trim();
                        const attachment = href.startsWith('^');
                        if (ADDRESS.test(href) || (attachment && /^[a-zA-Z0-9!#-/:;=?@_~]+$/.test(href.slice(1).trim()))) {
                            const address = attachment ? href.slice(1).trim() : href;
                            flush();
                            out.push({ kind: attachment ? 'attachment' : 'link', href: address,
                                children: bar < 0 ? [text(address.replace(/^#/, ''), true)] : this.inline(body.slice(0, bar), disabled) });
                            i = end + 1; adjacent = false; continue;
                        }
                    }
                }
                const embed = /^!([a-zA-Z0-9!#-/:;=?@_~ ]+?)(?:\|([^!]+))?!/.exec(rest);
                if (embed) {
                    flush(); out.push({ kind: 'image', href: embed[1], options: embed[2] ? embed[2].split(/,\s*/) : [] });
                    i += embed[0].length; adjacent = false; continue;
                }
                const color = /^\{color(?::([^}]*))?\}/.exec(rest);
                if (color) {
                    const end = source.indexOf('{color}', i + color[0].length);
                    if (end !== -1) {
                        flush(); out.push({ kind: 'color', color: color[1] || '', children: this.inline(source.slice(i + color[0].length, end), disabled) });
                        i = end + 7; adjacent = true; continue;
                    }
                }
                const url = URL.exec(rest);
                if (url) {
                    const href = url[0].replace(/[.)!,']+$/, '');
                    flush(); out.push({ kind: 'link', href, children: [text(href, true)] });
                    i += href.length; adjacent = false; continue;
                }
                const marker = rest.startsWith('{{') ? '{{' : rest.startsWith('??') ? '??' : rest[0];
                const eligible = adjacent || i === 0 || /[\s([{,:;!?]/.test(source[i - 1]);
                if (FORMATS[marker] && !disabled.has(marker) && (eligible || marker === '{{') &&
                    (marker === '{{' || !/\s/.test(source[i + marker.length] || ' ')) && !rest.startsWith(marker + marker)) {
                    const close = marker === '{{' ? '}}' : marker;
                    const end = this.closing(source, i + marker.length, close);
                    if (end !== -1) {
                        flush(); out.push(tag(FORMATS[marker], this.inline(source.slice(i + marker.length, end), new Set([...disabled, marker]))));
                        i = end + close.length; adjacent = true; continue;
                    }
                }
                plain += source[i++]; adjacent = false;
            }
            flush();
            return out;
        });
    }

    blockRange(source: string, pos: number) {
        const match = MACRO.exec(source.slice(pos));
        if (!match) return null;
        const start = pos + match[0].length;
        const kind = match[2];
        const close = '{' + kind + '}';
        let end;
        if (kind === 'code' || kind === 'noformat') {
            end = source.indexOf(close, start);
        } else {
            const stack = [kind];
            const tokens = /\{(code|noformat|quote|panel)(?::[^}]*)?\}/g;
            tokens.lastIndex = start;
            let token;
            end = -1;
            while ((token = tokens.exec(source))) {
                this.check();
                if (token[1] === stack.at(-1) && !token[0].includes(':')) {
                    stack.pop();
                    if (!stack.length) { end = token.index; break; }
                } else if (token[1] === 'code' || token[1] === 'noformat') {
                    const rawClose = '{' + token[1] + '}';
                    const rawEnd = source.indexOf(rawClose, tokens.lastIndex);
                    if (rawEnd < 0) break;
                    tokens.lastIndex = rawEnd + rawClose.length;
                } else {
                    stack.push(token[1]);
                    if (stack.length + this.depth > 128) throw new Error('JIRA nesting exceeds 128 levels');
                }
            }
        }
        if (end < 0) throw new Error('Unclosed JIRA block: ' + kind);
        return { match, start, end, finish: end + close.length };
    }

    macro(source: string, pos: number): { node: Node; end: number } | null {
        const range = this.blockRange(source, pos);
        if (!range) return null;
        const { match, start, end } = range;
        const body = source.slice(start, end);
        let node: Node;
        if (match[2] === 'quote') node = { kind: 'quote', children: this.document(body) };
        else {
            const raw = match[2] !== 'panel';
            const title = (match[3] || '').split('|').find(part => part.startsWith('title='));
            node = { kind: 'panel', style: match[2], title: title === undefined ? null : title.slice(6),
                children: raw ? [tag('pre', [text(body.replace(/^\n{1,3}/, ''), true)])] : this.document(body) };
        }
        return { node, end: range.finish };
    }

    // Find a boundary without splitting opaque blocks or inline references.
    boundary(source: string, start: number, pipes = false): number {
        for (let i = start; i < source.length; i++) {
            this.check();
            if (source[i] === '\\') { i++; continue; }
            const range = this.blockRange(source, i);
            if (range) { i = range.finish - 1; continue; }
            if (pipes && (source[i] === '[' || source[i] === '!')) {
                const closing = source[i] === '[' ? ']' : '!';
                const end = source.indexOf(closing, i + 1);
                if (end >= 0 && !source.slice(i, end).includes('\n')) { i = end; continue; }
            }
            if (source[i] === '\n' || (pipes && source[i] === '|')) return i;
        }
        return source.length;
    }

    list(source: string, start: number): { node: Node; end: number } {
        let pos = start;
        const items: ListItem[] = [];
        while (pos < source.length) {
            this.check();
            const marker = BULLET.exec(source.slice(pos));
            if (!marker) break;
            pos += marker[0].length;
            const begin = pos;
            let end = this.boundary(source, pos);
            pos = end;
            while (pos < source.length && source[pos] === '\n') {
                const rest = source.slice(pos + 1);
                if (!rest || /^[ \t\u00a0]*\n/.test(rest) || BULLET.test(rest)) break;
                end = this.boundary(source, pos + 1);
                pos = end;
            }
            const content = source.slice(begin, end).replace(/\n[ \t\u00a0]+/g, '\n');
            items.push({ level: marker[1].replace(/\s/g, '').length,
                ordered: marker[1].endsWith('#'), children: this.document(content, 'item') });
            if (source[pos] === '\n') pos++;
            if (/^[ \t\u00a0]*\n/.test(source.slice(pos))) break;
        }
        return { node: { kind: 'list', items }, end: pos };
    }

    table(source: string, start: number): { node: Node; end: number } {
        const rows: TableCell[][] = [];
        let cells: TableCell[] = [];
        let pos = start;
        while (source[pos] === '|') {
            this.check();
            const run = /^\|+/.exec(source.slice(pos))![0];
            pos += run.length;
            if (pos === source.length || source[pos] === '\n') {
                if (cells.length) { rows.push(cells); cells = []; }
                if (source[pos] === '\n') pos++;
                if (source[pos] !== '|') break;
                continue;
            }
            const begin = pos;
            let end = this.boundary(source, pos, true);
            while (source[end] === '\n' && source[end + 1] !== '|' && source[end + 1] !== '\n' && end + 1 < source.length) {
                end = this.boundary(source, end + 1, true);
            }
            cells.push({ header: run.length > 1, children: this.document(source.slice(begin, end), 'cell') });
            pos = end;
            if (source[pos] === '\n') {
                rows.push(cells); cells = []; pos++;
                if (source[pos] !== '|') break;
            }
        }
        if (cells.length) rows.push(cells);
        return { node: { kind: 'table', rows }, end: pos };
    }

    document(source: string, mode: 'document' | 'item' | 'cell' = 'document'): Node[] {
        return this.nested(() => {
            const nodes: Node[] = [];
            let paragraph: Node[][] = [];
            let pos = 0;
            const flush = () => {
                if (paragraph.length) {
                    nodes.push({ kind: mode === 'document' ? 'paragraph' : 'lines', lines: paragraph }); paragraph = [];
                }
            };
            while (pos < source.length) {
                this.check();
                const rest = source.slice(pos);
                if (mode === 'document' && /^[ \t\u00a0\n]*$/.test(rest)) { flush(); break; }
                const blank = /^[ \t\u00a0]*\n/.exec(rest);
                if (blank) { flush(); pos += blank[0].length; continue; }
                const macro = this.macro(source, pos);
                if (macro) { flush(); nodes.push(macro.node); pos = macro.end; if (source[pos] === '\n') pos++; continue; }
                if (BULLET.test(rest)) {
                    flush(); const list = this.list(source, pos); nodes.push(list.node); pos = list.end; continue;
                }
                if (rest[0] === '|') {
                    flush(); const table = this.table(source, pos); nodes.push(table.node); pos = table.end; continue;
                }
                const heading = /^(h[1-6])\.[ \t\u00a0]+/.exec(rest);
                const quote = /^bq\.[ \t\u00a0]*/.exec(rest);
                let end = source.indexOf('\n', pos);
                if (end < 0) end = source.length;
                // Named blocks can interrupt text in the middle of a line.
                for (let i = pos; i < end; i++) {
                    if (source[i] === '\\') { i++; continue; }
                    if (/^\{(?:code|noformat|panel|quote)(?::|\})/.test(source.slice(i))) { end = i; break; }
                }
                if (heading || quote) {
                    flush(); const match = (heading || quote)!;
                    nodes.push(tag(heading ? heading[1] : 'blockquote', this.inline(source.slice(pos + match[0].length, end))));
                } else {
                    const line = source.slice(pos, end);
                    // Compatibility snapshots retain apostrophes in plain ASCII paragraphs.
                    paragraph.push(/^[a-zA-Z0-9 \t\u00a0:.'&,;#]+$/.test(line) && !/&(?!(?:#?[a-zA-Z0-9]+);)/.test(line)
                        ? [{ kind: 'plain', value: line }] : this.inline(line));
                }
                pos = end;
                if (source[pos] === '\n') pos++;
            }
            flush();
            return nodes;
        });
    }
}

export function parse(input: string): Node[] {
    if (typeof input !== 'string') throw new TypeError('str must be a string');
    return new Parser().document(input.replace(/\r\n?/g, '\n'));
}
