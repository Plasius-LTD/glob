'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { main: privacy } = require('./verify-private-artifacts.cjs');
const { comparePackageArtifactAllowlist, findPrivateArtifactViolations } = require('./private-artifact-policy.cjs');
const expected = Object.freeze(['LICENSE', 'README.md', 'dist/index.cjs', 'dist/index.cjs.map', 'dist/index.d.cts', 'dist/index.d.ts', 'dist/index.js', 'package.json']);

function verifyInventory(paths) {
  assert.equal(findPrivateArtifactViolations(paths).length, 0, 'Private artifacts are prohibited');
  const result = comparePackageArtifactAllowlist(paths, expected);
  assert.equal(result.missingPaths.length, 0, 'Package inventory is incomplete');
  assert.equal(result.unexpectedPaths.length, 0, 'Package contains unreviewed files');
}

async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--inventory-stdin') {
    const input = readFileSync(0);
    assert.ok(input.byteLength <= 1024 * 1024, 'Package inventory is too large');
    verifyInventory(input.toString('utf8').split('\n').filter(Boolean));
    console.log('Sealed package inventory check passed');
    return;
  }
  assert.equal(args.length, 0, 'Unsupported package check arguments');
  assert.equal(privacy(), 0, 'Repository must satisfy the baseline private-artifact policy');
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
  assert.equal(packed.length, 1);
  verifyInventory(packed[0].files.map(file => file.path));
  const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(metadata.files, ['dist']);
  assert.equal(metadata.dependencies.minimatch, '11.0.9');
  assert.equal(require('../dist/index.cjs')('**/*.ts')('src/test.ts'), true);
  const module = await import('../dist/index.js');
  assert.equal(module.default('**/*.ts')('src/test.ts'), true);
  assert.equal(module.isMatch('.env', '**/.env', { dot: true }), true);
  console.log('Package allowlist and CJS/ESM runtime checks passed');
}
if (require.main === module) main().catch(() => { console.error('Package verification failed; inventory or runtime did not satisfy the policy'); process.exitCode = 1; });
module.exports = { verifyInventory, main, expected };
