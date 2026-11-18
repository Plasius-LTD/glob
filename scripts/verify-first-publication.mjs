import { pathToFileURL } from "node:url";

const packages = new Map([
  ["Plasius-LTD/glob", "@plasius/glob"],
]);

/** One-time admission; never interpret an authentication or network failure as absence. */
export async function verifyFirstPublication(input, fetchRegistry = fetch) {
  if (
    !packages.has(input.repository) || packages.get(input.repository) !== input.packageName
    || input.version !== "1.0.0" || input.optIn !== "true" || input.credentialPresent !== true
    || input.ref !== "refs/heads/main" || input.eventName !== "workflow_dispatch"
    || input.workflowRef !== `${input.repository}/.github/workflows/cd.yml@refs/heads/main`
    || !/^[0-9a-f]{40}$/u.test(input.expectedCommitSha ?? "")
    || input.checkedOutSha !== input.expectedCommitSha || input.workflowSha !== input.expectedCommitSha
  ) {
    throw new Error("First-publication admission requires the approved package, initial version and exact main CD.");
  }
  const response = await fetchRegistry(`https://registry.npmjs.org/${input.packageName.replace("/", "%2f")}`, {
    signal: AbortSignal.timeout(10_000), redirect: "error", headers: { accept: "application/json" },
  });
  if (response.status !== 404) {
    throw new Error("First publication requires a confirmed absent package; existing packages require OIDC.");
  }
}

/** Keep credential values and upstream error details out of verifier inputs and logs. */
export async function runFirstPublication(env = process.env, verify = verifyFirstPublication, report = message => process.stderr.write(message)) {
  try {
    await verify({
      repository: env.GITHUB_REPOSITORY, packageName: env.PACKAGE_NAME, version: env.PACKAGE_VERSION,
      optIn: env.FIRST_PUBLICATION, credentialPresent: Boolean(env.NPM_BOOTSTRAP_CREDENTIAL?.trim()),
      ref: env.GITHUB_REF, workflowRef: env.GITHUB_WORKFLOW_REF, eventName: env.GITHUB_EVENT_NAME,
      expectedCommitSha: env.EXPECTED_SHA, checkedOutSha: env.ACTUAL_SHA, workflowSha: env.GITHUB_SHA,
    });
    return 0;
  } catch {
    report("First-publication verification failed; check approved admission and registry absence.\n");
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runFirstPublication();
}
