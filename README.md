# @plasius/glob

Bounded glob matching for Plasius build tools, backed by published minimatch 11's
nonrecursive engine. No picomatch code or dependency is included.

```js
import glob, { isMatch, scan } from "@plasius/glob";
const sourceFile = glob("src/**/*.ts", { ignore: "**/*.test.ts" });
sourceFile("src/main.ts"); // true
isMatch(".env", "**/.env", { dot: true }); // true
scan("src/**/*.ts", { parts: true }).base; // "src"
```

CommonJS consumers can use `const glob = require("@plasius/glob")`. The default
export is callable, with `isMatch`, `scan` and an explicitly unsupported
`makeRe` property. This is a compatibility adapter for the recorded Vite,
Vitest, tinyglobby, fdir and Rollup use cases, not the entire picomatch API.

Supported matching options are `dot`, `nocase`, `nobrace`, `noextglob`,
`noglobstar`, `nonegate`, `matchBase`/`basename`, `contains`, `windows` and
`ignore` (a pattern or array). `posix` is accepted for existing callers; the
engine supports POSIX character classes. `returnIndex` is accepted for the
anymatch wrapper, which owns the index result; this predicate returns booleans.
The scanner supports `parts` and `nonegate` and returns prefix/base/glob and
negation/magic classification. Unknown options throw rather than silently
changing selection. Inputs are never logged by the matcher.

Extended or bare parenthesized groups cannot span path separators; use brace
alternatives or a pattern array for those paths. Such groups throw explicitly.

Limits are 256 patterns including ignores, 1,024 UTF-16 code units per pattern,
8,192 aggregate pattern units, eight nesting levels, 256 expansions per
compiled pattern, 16 globstar segments per expanded pattern (including those
added for `contains`), and 4,096 units per candidate. Inputs exceeding a limit throw
`RangeError`; invalid types and unsupported APIs/options throw `TypeError`.
The engine still has finite CPU and memory costs: do not treat these limits as
permission to process unlimited hostile matching requests on a public endpoint.

`makeRe()` always throws. Generating arbitrary backtracking regular expressions
would restore the failure class this package removes. Vite's optional custom
`assetsInclude` filter must use explicitly reviewed RegExp values instead of
glob strings when this adapter is installed. The current Plasius site has no
custom asset glob filters. This restriction is covered by tests.

For the approved site integration, npm's override maps the dependency name
`picomatch` to the published `@plasius/glob` package. The alias remains a module
specifier used by upstream tools; package metadata, tarball and implementation
must identify this package. Validate the complete build/test/coverage and
security gates after replacement. Never use the alias to conceal picomatch
source or an unresolved advisory.

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run test:coverage`, `npm run audit:npm` and `npm run pack:check`.
Tests use Node's built-in runner, 9,920 recorded match cases, scanner cases,
bounded adversarial processes, filesystem-denial checks and package integrity
checks. The requirement fixtures were generated from synthetic paths against
the existing toolchain; no private paths, credentials or feedback data are used.

See [Task #1](https://github.com/Plasius-LTD/glob/issues/1), the
[design](docs/design/build-tool-glob-compatibility.md) and
[ADR-0001](docs/adrs/adr-0001-nonrecursive-build-tool-matching.md).
Releases run exclusively through protected main/production `cd.yml`. No local
publication is permitted. A failed integration holds release; returning to
picomatch is outside the owner's approved removal plan.

The release workflow matches the reviewed `Plasius-LTD/schema` template at
`ad0bd3c96bc45c1f615fd8aaec924399c7a123b9`. Both CD phases use its standard
main/production, sealed-artifact, provenance and npm OIDC checks. Glob adds no
npm secret, first-publication input or credential fallback. Configure npm trust
for `Plasius-LTD/glob`, workflow `cd.yml`, environment `production`, with direct
publishing allowed. See [ADR-0002](docs/adrs/adr-0002-schema-release-template.md).
Publication remains incomplete until the registry and provenance are verified.
