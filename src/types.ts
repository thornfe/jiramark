// SPDX-License-Identifier: MIT
export interface RenderOptions {
    formatLink?: (href: string, content: string) => string;
    formatAttachmentLink?: (href: string, content: string) => string;
    formatEmbedded?: (href: string, options: string[]) => string;
}

export interface ListItem { level: number; ordered: boolean; children: Node[] }
export interface TableCell { header: boolean; children: Node[] }
export type Node =
    | { kind: 'text'; value: string; literal: boolean }
    | { kind: 'plain'; value: string }
    | { kind: 'tag'; name: string; children: Node[] }
    | { kind: 'paragraph' | 'lines'; lines: Node[][] }
    | { kind: 'link' | 'attachment'; href: string; children: Node[] }
    | { kind: 'image'; href: string; options: string[] }
    | { kind: 'color'; color: string; children: Node[] }
    | { kind: 'quote'; children: Node[] }
    | { kind: 'panel'; style: string; title: string | null; children: Node[] }
    | { kind: 'list'; items: ListItem[] }
    | { kind: 'table'; rows: TableCell[][] };
export type WorkerResult = { tree: Node[]; error?: never } | { error: string; tree?: never };
