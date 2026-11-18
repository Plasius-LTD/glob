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
compiled pattern and 4,096 units per candidate. Inputs exceeding a limit throw
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
publication is permitted. A failed integration holds release; the vulnerable
implementation is not an acceptable production rollback.

The first 1.0.0 registration requires an explicit default-off dispatch and a
dedicated one-day production `NPM_BOOTSTRAP_TOKEN`, under the existing reviewed
first-registration process. The inherited organisation token is ineligible.
The exact-main guard accepts only anonymous registry 404, preserves the sealed
tarball/provenance, and cleans its temporary credential configuration on exit.
After registration, revoke/remove the credential, configure the exact
repository/`cd.yml`/`production` OIDC binding and remove the bootstrap path.
Verify a normal OIDC release before closing the task. See ADR-0001.
