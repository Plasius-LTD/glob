# Changelog

## [Unreleased]

- Align CD with the reviewed schema release template and remove glob-specific
  registration inputs, credentials and guards; retain standard OIDC publication,
  sealed-artifact verification and immutable release history.

## [1.0.1] - 2026-11-22

- Refresh supported npm dependency and security tooling baselines; preserve runtime API contracts (weekly maintenance, 2026-11-22).

- Reject excessive globstar depth before the matching engine can silently omit files.

- **Added**
  - Bounded nonrecursive matching and the build-tool compatibility surface required to remove picomatch from the site.
  - Explicit, temporary first-registration admission with exact-main verification, credential isolation and tested cleanup before permanent OIDC handover.

[Unreleased]: https://github.com/Plasius-LTD/glob/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Plasius-LTD/glob/releases/tag/v1.0.1
