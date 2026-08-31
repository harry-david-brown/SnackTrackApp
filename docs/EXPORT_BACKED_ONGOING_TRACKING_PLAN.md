# Export-Backed Ongoing Tracking Plan

## Goal

When receipt-backed provider export data already provide historical coverage,
SnackTrack should recommend ongoing Gmail monitoring instead of
requiring a redundant one-time Gmail history import. The first consented
tracking check starts from the end of each provider's export coverage, while
keeping export data authoritative and keeping the explicit Gmail-history
lifecycle independent.

## Product rules

- [x] Gmail history remains the lowest-friction way to establish initial stats.
- [x] Any receipt-backed provider export satisfies the historical prerequisite for ongoing tracking.
- [x] One provider export does not masquerade as complete provider coverage.
- [x] Connecting Gmail never grants monitoring consent or starts email reads by itself.
- [x] Granting ongoing-tracking consent starts a catch-up check without marking the one-time Gmail baseline complete.
- [x] Provider exports remain authoritative through each provider's latest exported order.
- [x] A successful catch-up with zero new orders is successful setup.
- [x] Declined or revoked tracking does not make imported history incomplete.
- [x] Once provider export data cover history, remove the separate one-time Gmail action and present email only as ongoing updates.

## API and persistence

- [x] Add an explicit `setting_up` tracking runtime state for the initial consented catch-up.
- [x] Derive the historical tracking baseline from either a completed Gmail baseline or receipt-backed provider export coverage.
- [x] Enforce the shared baseline rule in consent, user checks, and scheduled eligibility.
- [x] Return provider-specific earliest/latest export coverage dates and the effective tracking baseline source.
- [x] Query Gmail incrementally using the prior successful check or export/Gmail baseline, with a small lookback window.
- [x] Continue filtering parsed receipts against provider-specific export cutoffs.
- [x] Clear new tracking state through existing receipt-clear and fresh-account reset contracts.
- [x] Preserve stable reconnect, unavailable, not-eligible, and retry error contracts.

## App experience

- [x] Update transport types and normalization for coverage dates, baseline source, and `setting_up`.
- [x] Make the shared tracking resolver accept provider export coverage as a baseline.
- [x] Recommend connecting Gmail or enabling ongoing updates after a provider export is imported.
- [x] Remove the one-time Gmail card after provider export coverage exists.
- [x] Present a completed Gmail baseline as a passive source status and keep manual incremental checks in Gmail settings.
- [x] Recommend ongoing updates before optional deeper-history exports after Gmail-first setup.
- [x] Show catching-up, active, declined/paused, reconnect, temporary-unavailable, and error states intentionally.
- [x] Align Upload, Dashboard, Wrapped/Recap, Profile, and OAuth continuation behavior.
- [x] Keep provider-neutral copy while avoiding claims that unsupported providers are already monitored.
- [x] Announce asynchronous tracking setup success or failure through existing accessible UI patterns.

## Regression coverage and verification

- [x] Add API coverage for Gmail-baseline and export-backed eligibility, partial exports, setup success/failure, reset reconciliation, scheduler eligibility, and incremental search boundaries.
- [x] Add app resolver/journey coverage for export-first tracking setup and recovery precedence.
- [x] Update import-flow reference documentation to reflect the new canonical baseline rule.
- [x] Run the App TypeScript check only: `npm run type-check`.
- [x] Run the API TypeScript check only: `npm run build`.
- [x] Do not run tests, lint, or other suites unless explicitly requested.
