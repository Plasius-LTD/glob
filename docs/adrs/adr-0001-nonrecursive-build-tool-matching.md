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

Reuse the existing default-off first-registration boundary from site ADR 0197,
narrowed to `Plasius-LTD/glob` / `@plasius/glob@1.0.0`. An explicit
`first_publication=true` dispatch is forwarded through both CD phases. A
reviewed dependency-free guard verifies the repository/package/version, exact
main checkout and workflow SHA, and a bounded anonymous registry HTTP 404.
Network errors, redirects, existing packages and failed OIDC never enable it.

Only a dedicated one-day granular `NPM_BOOTSTRAP_TOKEN` in the production
GitHub environment may register the package. Do not use the inherited
organisation `NPM_TOKEN`. Preserve the existing sealed tarball, exact-main CI,
provenance, registry-byte verification, no-script publication and temporary
0600 configuration cleanup. The site auditor binds the unchanged publication
step and this package's own guard digest. Test admission, rejection, secret
isolation and cleanup before publication.

After registration, revoke/remove that credential and bind the exact repository,
`cd.yml` and `production` npm trusted publisher. Remove the bootstrap route and
verify a normal OIDC release before closing the task. No local publication.
