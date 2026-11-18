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

## First publication

npm requires an existing package before configuring a trusted publisher. Version
1.0.0 alone can use the existing organisation registry credential inside the
same protected `cd.yml` production publish job. It still consumes the sealed,
attested tarball from exact-main CI; no dependency or package scripts execute
with that credential. The step requires the exact package name, stable tag and
an HTTP 404 for the entire package. Network/server errors or an existing package
fail closed. It does not act as a fallback for failed OIDC publication.

After the first release, bind `Plasius-LTD/glob` / `cd.yml` / `production` as the
npm trusted publisher. All later versions use OIDC exclusively. The bootstrap
credential never enters source, artifacts, logs or local publication. Remove
the one-version bootstrap after trusted publishing is configured and verified.
