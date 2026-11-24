const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

// Reviewed Schema PR 88, shared registration template (ADR-0003).
const templateDigests = {
  'cd.yml': '46474224bf92af3c81cbe51aee0891b5f97493d37e1fe322074a11d937f4febb',
  'release-prepare.yml': '35ec824d3de0a19f47d1b440cef847314b81f696839ab8a4232f8f16c37a4d95',
};
const workflow = readFileSync(join(__dirname, '../.github/workflows/cd.yml'), 'utf8');

test('release workflows match the reviewed schema template without package-specific drift', () => {
  for (const [name, digest] of Object.entries(templateDigests)) {
    const content = readFileSync(join(__dirname, '../.github/workflows', name));
    assert.equal(createHash('sha256').update(content).digest('hex'), digest, name);
  }
});

test('publication uses OIDC without package-specific credential inputs or fallback', () => {
  const name = '\n      - name: Register new package with standard npm credential\n';
  const step = workflow.split(name)[1]?.split('\n      - name:')[0];
  assert.ok(step);
  assert.match(step, /NPM_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  assert.doesNotMatch(workflow.replace(name + step, ''), /NPM_BOOTSTRAP|NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/);
  assert.match(workflow, /if: steps.release.outputs.should_publish_npm == 'true' && !inputs.first_publication/);
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
