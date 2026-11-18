const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const matcher = require('../src/index.cjs');
const matching = require('./fixtures/matching.json');
const scanning = require('./fixtures/scanning.json');

test('preserves the recorded matching contract for build-tool patterns', () => {
  const failures = [];
  for (const row of matching) {
    const actual = matcher.isMatch(row.input, row.pattern, row.options);
    if (actual !== row.expected) failures.push({ ...row, actual });
  }
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 30), null, 2));
});

test('preserves scanner base and parts used to prune directory traversal', () => {
  for (const { pattern, expected } of scanning) {
    const actual = matcher.scan(pattern, { parts: true });
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]])), expected, pattern);
  }
});

test('handles arrays, ignores, leading negation, basename and Windows candidates', () => {
  assert.equal(matcher([])('anything'), false);
  assert.equal(matcher(['*.js', '*.ts'])('a.ts'), true);
  assert.equal(matcher(['*.js', '*.ts'], { ignore: '*.test.*' })('a.test.ts'), false);
  assert.equal(matcher('!!*.js')('a.js'), true);
  assert.equal(matcher('*.js', { matchBase: true })('src/a.js'), true);
  assert.equal(matcher('src/*.js', { windows: true })('src\\a.js'), true);
  assert.equal(matcher('#file')('#file'), true);
});

test('retains the Vite filesystem deny protections without denying ordinary files', () => {
  const denied = matcher(['**/.env', '**/.env.*', '**/*.{crt,pem}', '**/.git/**'], { dot: true, nocase: true, matchBase: false });
  for (const path of ['.env', '.ENV.local', 'a/.env', 'a/.env.production', 'a/key.pem', 'a/cert.CRT', '.git/config', 'a/.git/HEAD']) assert.equal(denied(path), true, path);
  for (const path of ['a/env.ts', 'a/.environment', 'a/key.ts', 'a/.github/workflows/ci.yml', 'a/git/config']) assert.equal(denied(path), false, path);
});

test('rejects unsupported compiler behavior and bounded inputs explicitly', () => {
  for (const pattern of ['', null, 12, '*'.repeat(1025), '+('.repeat(9) + 'a' + ')'.repeat(9)]) assert.throws(() => matcher(pattern));
  assert.throws(() => matcher(Array(257).fill('*')), RangeError);
  assert.throws(() => matcher(Array(20).fill('a'.repeat(1024))), RangeError);
  assert.throws(() => matcher('*', { unknownOption: true }), TypeError);
  assert.throws(() => matcher('*', { dot: 'yes' }), TypeError);
  assert.throws(() => matcher('*')('a'.repeat(4097)), RangeError);
  assert.throws(() => matcher('*')(null), TypeError);
  assert.throws(() => matcher('{a,b}'.repeat(10)), RangeError);
  assert.throws(() => matcher.makeRe('**/*.png'), /RegExp/);
});

test('adversarial extglobs complete within a bounded process without regex backtracking', () => {
  const source = `const assert=require('node:assert/strict'); const m=require('./src/index.cjs');
    for(const n of [32,128,1024]) {
      assert.equal(m('+(*a)')('a'.repeat(n)+'!'),false);
      assert.equal(m('*(*a)')('a'.repeat(n)+'!'),false);
      assert.equal(m('+(*a)')('a'.repeat(n)),true);
      assert.equal(m('+(*a|*b)')('a'.repeat(n)+'!'),false);
      assert.equal(m('a*'.repeat(20)+'a')('a'.repeat(n)+'!'),false);
    }`;
  const child = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', source], { cwd: require('node:path').resolve(__dirname, '..'), encoding: 'utf8', timeout: 3000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
});
