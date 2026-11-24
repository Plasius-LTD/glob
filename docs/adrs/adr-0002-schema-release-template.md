# ADR 0002: Follow the schema release template without glob-specific credentials

Status: Accepted, 24 November 2026, under package Task #1 and site Task #2539,
Story #2193 and Feature #1662.

The owner requires glob to match `Plasius-LTD/schema` rather than introducing
its own npm secret. This supersedes ADR 0001's custom initial-registration
route and the earlier request for a dedicated bootstrap credential.

Copy `cd.yml` from schema main
`33c7ed9da9bf42c2320381485afaace3e5e91dae` exactly. `release-prepare.yml`
already matches the same template. Record both reviewed file digests in the
release contract tests so later divergence requires an explicit template review.
Keep the package's matcher tests and Node built-in test runner.

The template retains two-phase release preparation, exact-main CI and artifact
identity checks, GitHub-hosted production publication, sealed tarball/SBOM
verification, immutable tags, provenance and registry verification. npm uses
OIDC. There is no glob-specific dispatch input, npm secret, temporary npmrc,
or credential fallback. The release-preparation app retains its template-defined
credential; this decision creates no new secret.

Retire the obsolete guard and replace its tests with template identity,
no-custom-credential and actual publication-shell failure-propagation tests.
Remove only glob's site-auditor exception; other package decisions remain intact.

The failed v1.0.1 tag is preserved. A missing npm registration or trusted
publisher remains a publication blocker; it does not authorize local publishing
or a package-specific alternative. Verify the normal release and registry
provenance before consuming the package or marking publication complete.
