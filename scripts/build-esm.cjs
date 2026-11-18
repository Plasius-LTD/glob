'use strict';
const { writeFileSync } = require('node:fs');
writeFileSync('dist/index.js', 'import matcher from "./index.cjs";\nexport default matcher;\nexport const { isMatch, scan, makeRe } = matcher;\n');
writeFileSync('dist/index.d.ts', 'import matcher from "./index.cjs";\nexport default matcher;\nexport const isMatch: typeof matcher.isMatch;\nexport const scan: typeof matcher.scan;\nexport const makeRe: typeof matcher.makeRe;\n');
