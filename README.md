# @thornfe/jiramark

Convert JIRA wiki markup to HTML in Node.js 22 or later. The runtime has no
third-party dependencies. This implementation uses a cursor-based parser,
a serializable document tree, and a separate HTML renderer.

## Install

```sh
pnpm add @thornfe/jiramark
```

## Use

```js
const { markupToHTML, markupToHTMLWithTimeout } = require('@thornfe/jiramark');

console.log(markupToHTML('h2. Release notes\n\n* Ready'));
console.log(await markupToHTMLWithTimeout('*Ready*'));
```

`markupToHTML(input, options?)` returns a string. `markupToHTMLWithTimeout(input,
options?)` returns a Promise of a string. Both require a string input. Invalid
arguments, unclosed named blocks, excessive nesting, and parsing timeouts produce
errors (Promise rejections for the asynchronous API).

The synchronous parser checks a five-second deadline while it runs; it still
blocks the calling thread. The asynchronous API creates a Worker per call and
terminates parsing after three seconds, including Worker startup. Limit concurrent
calls in applications processing many documents. Rendering and custom callbacks
run on the calling thread and are **not** covered by the parsing timeout.

Supported constructs include paragraphs, headings, inline emphasis, links,
attachments, images, user references, colors, lists, tables, and code, noformat,
quote and panel blocks. This is an approximation of JIRA wiki rendering, not a
complete implementation of every JIRA macro. Unrecognized inline markup is
rendered as text. Nesting is limited to 128 parser levels.

### Custom rendering

Both APIs accept the same optional callbacks:

```js
const options = {
  formatLink(href, htmlText) { return `<a href="${href}">${htmlText}</a>`; },
  formatAttachmentLink(filename, htmlText) { return `<span>${htmlText}</span>`; },
  formatEmbedded(filename, options) { return ''; }
};
```

Callbacks receive the original address/filename and already rendered link text.
Image options are an array of strings. Callbacks can call the parser again;
each conversion has its own state. Callbacks are never serialized into a Worker.
Treat callback HTML as trusted application code: validate addresses and escape
any values you add to attributes. The default attachment renderer links to `#`;
the default image renderer uses the source filename or URL directly.

Output includes `panel`, `code`, `preformatted`, and corresponding `Header` and
`Content` CSS classes. Add styles in your application as needed. Preserve the
returned HTML whitespace if comparing against historical snapshots.

### CLI

```sh
jira2html issue.txt
```

The CLI writes HTML to stdout. Usage errors exit with code 2; conversion and file
errors exit with code 1.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm test
```

Tests run with Vitest (`pnpm test` for a single run, `pnpm run test:watch` for watch
mode). Development uses Node.js 24; CI also checks the latest Node.js 22 release.
The MIT suites exercise text, composed documents, references, callback contracts,
and runtime failure boundaries. See [test design and provenance](test/README.md).
The former upstream compatibility suite has been removed; the new suite does not
claim one-for-one coverage of all its cases.

## License and provenance

The current runtime, CLI, and test sources are offered under [MIT](LICENSE).
The npm package uses an explicit file allowlist and excludes development tests.
The original MPL tests are no longer in the current source tree. This change does
not relicense upstream code or establish legal clearance for the runtime rewrite;
see [NOTICE.md](NOTICE.md) for provenance and the remaining review boundary.

Issues and pull requests: https://github.com/thornfe/node-jiramark
