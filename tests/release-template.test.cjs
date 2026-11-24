const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

// Approved schema main 33c7ed9da9bf42c2320381485afaace3e5e91dae (ADR-0002).
const templateDigests = {
  'cd.yml': 'dbc8888336e4ea248b0a33c509430c4beaf0e73476e28904a30e262990b71706',
  'release-prepare.yml': '03f2f1a4c753713aa35d70dfd3be4ad75a76febafa68439e1952165140568f57',
};
const workflow = readFileSync(join(__dirname, '../.github/workflows/cd.yml'), 'utf8');

test('release workflows match the reviewed schema template without package-specific drift', () => {
  for (const [name, digest] of Object.entries(templateDigests)) {
    const content = readFileSync(join(__dirname, '../.github/workflows', name));
    assert.equal(createHash('sha256').update(content).digest('hex'), digest, name);
  }
});

test('publication uses OIDC without package-specific credential inputs or fallback', () => {
  assert.doesNotMatch(workflow, /first_publication|NPM_BOOTSTRAP|NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/);
  const ci = readFileSync(join(__dirname, '../.github/workflows/ci.yml'), 'utf8');
  assert.doesNotMatch(ci, /verify-first-publication/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /name: Enforce exact-main release identity/);
});

test('the template publication shell passes the sealed artifact and propagates npm failures', () => {
  const step = workflow.split('\n      - name: Publish package through npm OIDC\n')[1]?.split('\n      - name:')[0] ?? '';
  const body = step.split('        run: |\n')[1]?.split('\n').map(line => line.replace(/^ {10}/u, '')).join('\n');
  assert.ok(body);
  for (const status of [0, 17]) {
    const result = spawnSync('bash', ['-c', `npm() { printf '%s\\n' "$@"; return ${status}; }\n` + body], {
      encoding: 'utf8', env: { PATH: process.env.PATH, TARBALL: 'sealed.tgz', DIST_TAG: 'latest' },
    });
    assert.equal(result.status, status, result.stderr);
    assert.deepEqual(result.stdout.trim().split('\n'), [
      'publish', './sealed.tgz', '--ignore-scripts', '--access', 'public', '--provenance',
      '--registry', 'https://registry.npmjs.org', '--tag', 'latest',
    ]);
  }
});
