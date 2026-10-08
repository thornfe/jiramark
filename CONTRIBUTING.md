# Contributing

Open issues and pull requests at https://github.com/thornfe/jiramark.
Use Node.js 22.12+ or 24+, install with `pnpm install --frozen-lockfile`, and run
`pnpm run check` followed by `pnpm test` before submitting changes.

Use `pnpm test` for one run or `pnpm run test:watch` during development.
Add independently authored tests to the relevant contract suite; document the
behavior they protect. See `test/README.md` for coverage and sources.
Do not copy implementation, grammar, comments, or tests from the old MPL runtime
into the MIT sources. Preserve any applicable third-party notices.

New contributions to the runtime and tests are submitted under MIT.
See NOTICE.md for the rewrite's provenance and limitations.
