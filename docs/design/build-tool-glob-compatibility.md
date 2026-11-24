# Replace picomatch in Plasius build tooling

The owner requested removal of picomatch, including a replacement package if
needed, and confirmed that direction after GHSA-fc5q-39xc-vjpf was withdrawn. No existing Plasius
package owns filesystem pattern matching. Use the schema package's governance
and release template for a new `@plasius/glob` package.

Use published minimatch 11's nonrecursive matcher for matching. Do not copy or
rename picomatch's regex compiler. The compatibility entry supports the APIs
actually called by Vite, Vitest, Rollup pluginutils, fdir and tinyglobby: callable
pattern/array matchers, `isMatch`, and `scan` (base, parts and magic/negation
classification). Preserve dotfiles, ignore patterns, extglobs, braces, fixed
path handling, case folding, negation and the coverage `contains` option.
Bound pattern count, length, nesting, expansion and candidate length. Reject
unsupported options and oversized inputs explicitly rather than silently
returning a match or omitting files.

Regex generation is deliberately outside the matching contract: reintroducing
an arbitrary glob-to-RegExp compiler would restore the failure class being
removed. Vite's optional custom `assetsInclude` glob prefilter uses `makeRe`;
the current site has no such custom globs. Expose an explicit throwing `makeRe`
compatibility method and test that path. Hosts needing custom asset filters must
use reviewed explicit RegExp filters, which Vite accepts directly. The package
must not claim complete picomatch API compatibility.

Before site adoption, test matching/scan cases independently, reproduce the
advisory and pathological nonmatch patterns in a bounded child process, and
validate positive and negative matches for Vite's default filesystem deny
rules. Run actual tinyglobby discovery, Rollup filters, the entire backend and
frontend test/coverage suites and production builds. Compare discovered test
files and coverage inclusion with the existing baseline; changed selection is
a failure to investigate, not permission to lower a gate.

Publish only through `.github/workflows/cd.yml` on `main`, using `production`.
Then replace every resolved picomatch implementation with the published adapter
using npm's package alias override. Lockfile package names and tarballs must
identify `@plasius/glob`; no picomatch source, tarball or hidden nested copy may
remain. Keep npm audit and OSV blocking. The old vulnerable dependency is not
an acceptable rollback; hold the release if compatibility fails.

Tracking: site Feature #1662 / Story #2193 / Task #2539. Inherit the feedback
rollout flags; they remain disabled. This build dependency adds no user-facing
capability or runtime service. Package CI runs on Node's built-in test runner
so its own validation does not require the dependency being replaced.

Release preparation and publication match the reviewed schema template, as
recorded in ADR 0002. Use its standard main/production OIDC path with no
glob-specific credential or first-registration route. Retire glob's site
auditor exception; unrelated arcade admissions remain unchanged.

Reject expanded patterns above 16 globstar segments before matching. Count
the compiled globstar tokens so escaped stars and `noglobstar` remain literal.
This prevents the engine recursion guard from silently omitting files.
