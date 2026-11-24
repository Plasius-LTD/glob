# Changelog

## [Unreleased]

- Bind first registration to 1.0.2 after the failed 1.0.1 OIDC attempt, preserving
  the existing release tag, exact-main gates and one-day credential boundary.

## [1.0.1] - 2026-11-22

- Refresh supported npm dependency and security tooling baselines; preserve runtime API contracts (weekly maintenance, 2026-11-22).

- Reject excessive globstar depth before the matching engine can silently omit files.

- **Added**
  - Bounded nonrecursive matching and the build-tool compatibility surface required to remove picomatch from the site.
  - Explicit, temporary first-registration admission with exact-main verification, credential isolation and tested cleanup before permanent OIDC handover.

[Unreleased]: https://github.com/Plasius-LTD/glob/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Plasius-LTD/glob/releases/tag/v1.0.1
