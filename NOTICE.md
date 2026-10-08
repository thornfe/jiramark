# Licensing and rewrite record

## Current source tree

The current parser, renderer, API wrappers, Worker, CLI, documentation, workflow,
and test sources are offered under the root MIT license. The package allowlist
contains runtime code, CLI, package metadata, README, LICENSE, and this notice.
It excludes development tests and dependencies.

## Upstream and test replacement

Earlier versions descended from Joyent's MPL-2.0 node-jiramark project, now hosted
at https://github.com/TritonDataCenter/node-jiramark. Their license and copyright
notices continue to apply to those versions; this notice does not relicense them.

The former upstream compatibility suite was temporarily retained and mechanically
migrated to Vitest. That suite, its helper functions, and its frozen-file hash
check have now been removed from the current source tree. Replacement MIT
contract tests use newly authored scenarios and behavioral properties. Existing
MIT regression tests remain. The methodology and coverage are in `test/README.md`.

## Method and remaining review

The previous implementation and tests were read during review before the rewrite.
This work is not a clean-room implementation. The runtime replacement uses cursor
scanning and document-tree rendering instead of the prior Ohm grammar and generic
grammar interpreter. The earlier compatibility baseline and today's tests are
engineering evidence, not proof of independent creation or legal clearance.

Runtime provenance still requires assessment before making an unqualified claim
that all licensing questions have been resolved. Removing old tests, resetting
Git history, or leaving a fork network does not establish relicensing rights.
Historical upstream material remains governed by its original license.
