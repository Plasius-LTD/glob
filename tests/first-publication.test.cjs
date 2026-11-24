const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, existsSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const sha = 'a'.repeat(40);
const valid = {
  repository: 'Plasius-LTD/glob', packageName: '@plasius/glob', version: '1.0.2',
  optIn: 'true', credentialPresent: true, ref: 'refs/heads/main',
  workflowRef: 'Plasius-LTD/glob/.github/workflows/cd.yml@refs/heads/main',
  eventName: 'workflow_dispatch', expectedCommitSha: sha, checkedOutSha: sha, workflowSha: sha,
};

test('first registration admits only the exact initial package and bounded anonymous 404', async () => {
  const { verifyFirstPublication } = await import('../scripts/verify-first-publication.mjs');
  let calls = 0;
  await verifyFirstPublication(valid, async (url, options) => {
    calls++;
    assert.equal(url, 'https://registry.npmjs.org/@plasius%2fglob');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, { accept: 'application/json' });
    assert.ok(options.signal instanceof AbortSignal);
    return { status: 404 };
  });
  assert.equal(calls, 1);
  for (const override of [
    { repository: 'Other/glob' }, { repository: 'Plasius-LTD/other' }, { packageName: '@plasius/other' },
    { version: '1.0.0' }, { version: '1.0.1' }, { version: '1.0.3' }, { version: '1.0.2-beta.0' }, { optIn: false }, { optIn: 'false' },
    { credentialPresent: false }, { credentialPresent: 'true' }, { ref: 'refs/heads/feature' },
    { workflowRef: valid.workflowRef.replace('cd.yml', 'other.yml') },
    { eventName: 'push' }, { expectedCommitSha: undefined }, { expectedCommitSha: 'short' },
    { checkedOutSha: 'b'.repeat(40) }, { workflowSha: 'b'.repeat(40) },
  ]) await assert.rejects(verifyFirstPublication({ ...valid, ...override }, () => { throw new Error('must not request'); }), /admission/);
  for (const status of [200, 301, 302, 401, 403, 410, 429, 500, undefined]) {
    await assert.rejects(verifyFirstPublication(valid, async () => ({ status })), /confirmed absent/);
  }
  for (const reason of [new TypeError('network'), new TypeError('redirect'), new DOMException('expired', 'TimeoutError')]) {
    await assert.rejects(verifyFirstPublication(valid, async () => { throw reason; }));
  }
});

test('the guard passes only credential presence and redacts failures, including the CLI', async () => {
  const { runFirstPublication } = await import('../scripts/verify-first-publication.mjs');
  const env = {
    GITHUB_REPOSITORY: valid.repository, PACKAGE_NAME: valid.packageName, PACKAGE_VERSION: valid.version,
    FIRST_PUBLICATION: 'true', NPM_BOOTSTRAP_CREDENTIAL: 'synthetic-test-credential', GITHUB_REF: valid.ref,
    GITHUB_WORKFLOW_REF: valid.workflowRef, GITHUB_EVENT_NAME: valid.eventName, EXPECTED_SHA: sha, ACTUAL_SHA: sha, GITHUB_SHA: sha,
  };
  assert.equal(await runFirstPublication(env, async input => assert.deepEqual(input, valid)), 0);
  let output = '';
  assert.equal(await runFirstPublication(env, async () => { throw new Error('private-detail'); }, message => { output += message; }), 1);
  assert.match(output, /verification failed/);
  assert.doesNotMatch(output, /private-detail|synthetic-test-credential/);
  const child = spawnSync(process.execPath, [join(__dirname, '../scripts/verify-first-publication.mjs')], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /verification failed/);
  assert.doesNotMatch(child.stderr, /private-detail|synthetic-test-credential/);

});

test('first registration uses explicit default-off dispatch and isolates the temporary credential', () => {
  const workflow = readFileSync(join(__dirname, '../.github/workflows/cd.yml'), 'utf8');
  const step = workflow.split('\n      - name: Publish first package with temporary credential\n')[1]?.split('\n      - name:')[0] ?? '';
  assert.match(workflow, /first_publication:\n\s+description:[^\n]+\n\s+required: false\n\s+type: boolean\n\s+default: false/u);
  assert.ok(workflow.includes('--arg first_publication "${FIRST_PUBLICATION}"'));
  assert.ok(workflow.includes('"first_publication": $first_publication'));
  assert.ok(workflow.includes("if: steps.release.outputs.should_publish_npm == 'true' && !inputs.first_publication"));
  assert.ok(step.includes("if: steps.release.outputs.should_publish_npm == 'true' && inputs.first_publication"));
  assert.ok(step.includes('NPM_BOOTSTRAP_CREDENTIAL: ${{ secrets.NPM_BOOTSTRAP_TOKEN }}'));
  assert.doesNotMatch(step, /continue-on-error/);
  assert.doesNotMatch(workflow.replace('\n      - name: Publish first package with temporary credential\n' + step, ''), /NPM_BOOTSTRAP_CREDENTIAL|NPM_BOOTSTRAP_TOKEN|NODE_AUTH_TOKEN|NPM_TOKEN|_authToken/);
});

test('the actual first-publication shell cleans its private config on success, failure and refused admission', () => {
  const workflow = readFileSync(join(__dirname, '../.github/workflows/cd.yml'), 'utf8');
  const step = workflow.split('\n      - name: Publish first package with temporary credential\n')[1]?.split('\n      - name:')[0] ?? '';
  const body = step.split('        run: |\n')[1]?.split('\n').map(line => line.replace(/^ {10}/u, '')).join('\n');
  assert.ok(body);
  const mocks = `
node() { [ "$1" = scripts/verify-first-publication.mjs ] || return 99; return "$GUARD_STATUS"; }
git() { if [ "$1" = fetch ]; then return "$FETCH_STATUS"; elif [ "$1" = rev-parse ]; then if [ "$2" = HEAD ]; then printf '%s' "$EXPECTED_SHA"; else printf '%s' "$REMOTE_SHA"; fi; else return 99; fi; }
npm() {
  [ "$1" = publish ] && [ "$2" = ./sealed.tgz ] && [ "$3" = --ignore-scripts ] || return 98
  [ "$NPM_BOOTSTRAP_CREDENTIAL" = synthetic-test-credential ] || return 97
  [ "$(cat "$NPM_CONFIG_USERCONFIG")" = '//registry.npmjs.org/:_authToken=\${NPM_BOOTSTRAP_CREDENTIAL}' ] || return 96
  case "$(ls -l "$NPM_CONFIG_USERCONFIG")" in -rw-------*) ;; *) return 95 ;; esac
  printf '%s' "$*" > "$PUBLISH_MARKER"
  return "$PUBLISH_STATUS"
}
`;
  for (const [guard, fetch, publish, remote, expected, published] of [
    ['0', '0', '0', sha, 0, true], ['0', '0', '17', sha, 17, true],
    ['1', '0', '0', sha, 1, false], ['0', '1', '0', sha, 1, false], ['0', '0', '0', 'b'.repeat(40), 1, false],
  ]) {
    const directory = mkdtempSync(join(tmpdir(), 'glob-first-release-'));
    const marker = join(directory, 'published');
    try {
      const result = spawnSync('bash', ['-c', mocks + body], { encoding: 'utf8', env: {
        ...process.env, RUNNER_TEMP: directory, EXPECTED_SHA: sha, REMOTE_SHA: remote,
        GUARD_STATUS: guard, FETCH_STATUS: fetch, PUBLISH_STATUS: publish,
        NPM_BOOTSTRAP_CREDENTIAL: 'synthetic-test-credential', TARBALL: 'sealed.tgz', DIST_TAG: 'latest', PUBLISH_MARKER: marker,
      } });
      assert.equal(result.status, expected, result.stderr);
      assert.equal(existsSync(marker), published);
      if (published) assert.match(readFileSync(marker, 'utf8'), /--access public --provenance --registry https:\/\/registry.npmjs.org --tag latest/);
      assert.deepEqual(readdirSync(directory).filter(name => name !== 'published'), []);
      assert.doesNotMatch(result.stdout + result.stderr, /synthetic-test-credential/);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});
