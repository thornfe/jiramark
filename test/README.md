# Test design and provenance

These test sources are offered under MIT. The replacement contract suites were
written around synthetic logistics documents, behavioral invariants, API errors,
and resource lifecycle checks. They do not import the former MPL suite, its
fixtures, its assertion helpers, or generated snapshots from the old renderer.

## Inputs to the design

- The public API and supported-feature scope in the project README.
- [Atlassian wiki markup syntax](https://confluence.atlassian.com/doc/confluence-wiki-markup-251003035.html): headings, lists, tables, text formatting, and references.
- [Code block macro](https://confluence.atlassian.com/doc/code-block-macro-139390.html) and [panel macro](https://confluence.atlassian.com/doc/panel-macro-51872380.html): block roles and parameters.
- Defects identified in this project's review: iteration limits, shared callback
  state, function serialization into Workers, missing color options, and timeout
  cleanup. These motivated the existing MIT regression tests.

The public documentation describes syntax, not this package's exact HTML. The
literal HTML assertions define this package's contract; they are handwritten,
not copied from Atlassian's examples or generated from implementation output.
This does not claim full conformance with Confluence or every JIRA renderer.

## Coverage map

| File | Boundary exercised |
| --- | --- |
| `text-contract.test.mjs` | Blank input, newline normalization, heading levels, escaping, Unicode, inline formatting, literals, colors |
| `document-contract.test.mjs` | Composed documents, mixed lists, table cells, titles, nested blocks, opaque text, malformed blocks, section composition |
| `reference-contract.test.mjs` | URI families, punctuation, relative links, attachment/image/user references, callback arguments in both APIs |
| `rewrite.test.mjs` | Long input, callback isolation/re-entry, concurrent Workers, error recovery, injection handling, depth/deadline limits, CLI errors |

The old suite was used earlier as a compatibility baseline. Its 247 assertions
are no longer shipped or required. The replacement is not a one-for-one
translation, and passing it does not establish identical coverage of every old
case. New defects should receive narrowly scoped, independently authored tests.

The authoring session had previously seen the old source and tests. This is a
record of the replacement methodology, not a claim of clean-room development or
a legal determination about the runtime's provenance.
