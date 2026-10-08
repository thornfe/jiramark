// SPDX-License-Identifier: MIT
'use strict';

function escape(value, preserveEntities = false) {
    let out = '';
    for (let i = 0; i < value.length;) {
        if (preserveEntities && value[i] === '&') {
            const entity = /^&#?[a-zA-Z0-9]+;/.exec(value.slice(i));
            if (entity) { out += entity[0]; i += entity[0].length; continue; }
        }
        const code = value.codePointAt(i);
        const char = String.fromCodePoint(code);
        out += code < 32 || code > 126 || /[&<>"']/.test(char) ? '&#' + code + ';' : char;
        i += char.length;
    }
    return out;
}

function render(tree, options = {}) {
    const inline = children => children.map(node).join('');
    const blocks = (children, separator = '\n') => children.map(node).join(separator);
    function node(n) {
        switch (n.kind) {
        case 'text': return escape(n.value, !n.literal);
        case 'plain': return n.value;
        case 'tag': return '<' + n.name + '>' + inline(n.children) + '</' + n.name + '>';
        case 'paragraph': return '<p>' + n.lines.map(inline).join('<br />\n') + '</p>';
        case 'lines': return n.lines.map(inline).join('<br />\n');
        case 'link': return options.formatLink ? options.formatLink(n.href, inline(n.children)) : '<a href="' + n.href + '">' + inline(n.children) + '</a>';
        case 'attachment': return options.formatAttachmentLink ? options.formatAttachmentLink(n.href, inline(n.children)) : '<a href="#">' + inline(n.children) + '</a>';
        case 'image': return options.formatEmbedded ? options.formatEmbedded(n.href, n.options) : '<img src="' + n.href + '" />';
        case 'color': return '<span' + (/^(?:[a-z]+|#[a-f0-9]{6})$/i.test(n.color) ? ' style="color: ' + n.color + '"' : '') + '>' + inline(n.children) + '</span>';
        case 'quote': return '<blockquote>\n' + blocks(n.children) + '\n</blockquote>';
        case 'panel': {
            const classes = n.style === 'panel' ? ['panel'] : [n.style === 'code' ? 'code' : 'preformatted', 'panel'];
            const className = suffix => classes.map(name => name + suffix + ' ').join('');
            const title = n.title === null ? '' : '<div class="' + className('Header') + '"><b>' + escape(n.title, true) + '</b></div>\n';
            return '<div class="' + className('') + '">\n' + title + '<div class="' + className('Content') + '">\n' + blocks(n.children) + '\n</div>\n</div>';
        }
        case 'table': return '<table><tbody>\n' + n.rows.map(row => '<tr>' + row.map(cell => {
            const name = cell.header ? 'th' : 'td';
            return '<' + name + '>' + blocks(cell.children, '<br />').replace(/<br \/>\n/g, '<br />') + '</' + name + '>';
        }).join('') + '</tr>').join('\n') + '\n</tbody></table>';
        case 'list': {
            let result = '';
            const stack = [];
            const close = () => { const entry = stack.pop(); result += (entry.item ? '</li>' : '') + '\n</' + entry.name + '>'; };
            for (const item of n.items) {
                const name = item.ordered ? 'ol' : 'ul';
                while (stack.length > item.level) close();
                if (stack.length === item.level && stack.at(-1).name !== name) close();
                while (stack.length < item.level) {
                    result += (result ? '\n' : '') + '<' + name + '>';
                    stack.push({ name, item: false });
                }
                const entry = stack.at(-1);
                if (entry.item) result += '</li>';
                result += '\n<li>' + blocks(item.children, '<br />\n'); entry.item = true;
            }
            while (stack.length) close();
            return result;
        }
        default: throw new Error('Unknown JIRA node: ' + n.kind);
        }
    }
    return blocks(tree);
}
module.exports = { render };
