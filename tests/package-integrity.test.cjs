const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { expected, verifyInventory } = require('../scripts/verify-public-package.cjs');
test('checks exactly the approved package contents and rejects private or missing artifacts', () => {
  assert.doesNotThrow(() => verifyInventory(expected));
  assert.doesNotThrow(() => verifyInventory(expected.map(path => `package/${path}`)));
  assert.throws(() => verifyInventory(expected.slice(1)));
  assert.throws(() => verifyInventory([...expected, 'secrets.env']));
  assert.throws(() => verifyInventory([...expected, '.env']));
  assert.throws(() => verifyInventory([...expected, 'unexpected.js']));
});
test('verifies the sealed tar inventory without installing or executing package code', () => {
  const run = paths => spawnSync(process.execPath, ['scripts/verify-public-package.cjs', '--inventory-stdin'], { input: paths.join('\n'), encoding: 'utf8' });
  assert.equal(run(expected.map(path => `package/${path}`)).status, 0);
  assert.equal(run(expected.slice(1)).status, 1);
  assert.equal(run([...expected, 'private/.env']).status, 1);
  assert.equal(run(['x'.repeat(1024 * 1024 + 1)]).status, 1);
  assert.equal(spawnSync(process.execPath, ['scripts/verify-public-package.cjs', '--unknown'], { encoding: 'utf8' }).status, 1);
});
