# ADR-0001: Nonrecursive build-tool matching

Status: Accepted for implementation; site adoption remains gated.

The owner directed removal of picomatch after GHSA-fc5q-39xc-vjpf blocked the
feedback release. No existing Plasius library owns glob matching. Reuse the
published minimatch 11 engine, whose path-segment matching uses an NFA, in a
small compatibility adapter. Do not fork picomatch's backtracking regex parser.

The adapter owns input limits and the callable/isMatch/scan behavior required
by the current toolchain. Explicitly reject arbitrary regex generation; Vite
accepts explicit RegExp filters for its optional custom assets path. This
limited contract must be documented rather than advertised as a universal
picomatch replacement. Matching fixtures include negative cases and preserve
Vite filesystem denial rules. Unsupported options and resource limits throw;
they never silently discard selected files or allow denied ones.

Use the schema repository's governance, runtime and exact-main production
publication workflow. Use Node's built-in tests to avoid bringing picomatch
back into this package's test dependencies. Enforce >=80% source coverage and
an all-dependency audit. Consume only the published artifact in the site, then
run its complete build/test/security gates with no selection reduction.

Task: https://github.com/Plasius-LTD/glob/issues/1. Parent site Feature #1662,
Story #2193 and Task #2539. Both feedback rollout flags remain disabled; no
runtime capability or infrastructure is added by this package.

## Release workflow

The earlier custom first-registration decision is superseded by
[ADR-0002](adr-0002-schema-release-template.md), following the owner's
24 November instruction to match the schema template without new secrets.
There is no glob-specific bootstrap path or npm credential. Existing release
tags remain immutable; publication follows the standard schema OIDC workflow.
