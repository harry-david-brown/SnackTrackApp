# SnackTrack Frontend Refactor Plan

## Objective

Refactor `SnackTrackApp` toward one predictable frontend architecture without rewriting the app or changing working product behavior unnecessarily. The end state should have:

- one authoritative owner for each server resource;
- TanStack Query managing ordinary server state;
- authentication context limited to session and stable user identity;
- composition-focused route and screen files;
- domain controllers for multi-step workflows;
- pure typed resolvers for complicated UI precedence;
- normalized and validated API boundaries;
- shared visual primitives using the canonical theme;
- quiet, reliable regression and journey tests.

## How to use this plan

- Check an item only after its implementation and verification are complete.
- Complete phases in order unless a dependency requires a documented adjustment.
- Keep every phase independently working and reviewable.
- Update the notes and decisions sections when assumptions change.
- Run focused tests continuously and the full verification suite at each phase boundary.

## Required skills and source material

- [x] `snacktrack-frontend-engineering` exists at `.agents/skills/snacktrack-frontend-engineering/`.
- [x] Read `.agents/skills/snacktrack-frontend-engineering/SKILL.md` and every reference it requires for the phase being implemented.
- [x] Use `snacktrack-codebase-navigation` before moving ownership across files.
- [x] Use `snacktrack-import-flow` for Gmail, export, consent, and ongoing-tracking work.

## Guardrails

- [x] Preserve existing user changes in the dirty worktree; inspect `git status` and the relevant diffs before editing.
- [x] Preserve user-visible behavior unless a checklist item explicitly changes it.
- [x] Do not run the legacy and target caches as equal writable authorities.
- [x] Migrate by complete resource or feature boundary, not isolated `useState` calls.
- [x] Add characterization tests before moving fragile behavior.
- [x] Do not add new module listener sets, request mutex refs, custom read deduplication, or AsyncStorage mirrors for ordinary server state.
- [x] Do not introduce broad abstractions until at least two stable consumers demonstrate the shared pattern.
- [x] Avoid backend changes unless the frontend cannot establish a reliable contract without one; document any required API work separately.

## Out of scope

- A visual redesign of SnackTrack.
- Rewriting every component solely to reduce file length.
- Changing import, metric, consent, or authentication product semantics.
- Removing intentional offline behavior without first documenting the product requirement.
- Refactoring API internals that are unrelated to frontend contract correctness.

---

## Phase 0 — Establish the baseline

### Working-tree and behavior baseline

- [x] Record all existing modified and untracked files before starting.
- [x] Identify which existing changes belong to the recent dashboard/carousel/import work.
- [x] Run and record `npm run type-check`.
- [x] Run and record `npm run lint`.
- [x] Run and record `npm run check:theme`.
- [x] Run and record `npm test -- --watchAll=false --runInBand --no-watchman`.
- [x] Record existing warnings, especially React `act(...)` warnings and unexpected console output.
- [x] Capture the current behavior of Dashboard, Upload, Summary/Wrapped, Profile, Receipts, login startup, and receipt clearing.

### State ownership inventory

- [x] Map authentication identity and session ownership in `contexts/UserContext.tsx` and token utilities.
- [x] Map analytics readers, writers, caches, preload behavior, and invalidation paths.
- [x] Map import preferences, Gmail health, export lifecycle, consent, and tracking readers/writers.
- [x] Map receipt list fetching, pagination, and refresh behavior.
- [x] Map `useExportUpsell`, AsyncStorage completion markers, and server-derived export coverage.
- [x] Map custom request deduplication and identify which calls will become query-owned.
- [x] Document which offline behaviors are intentional product requirements versus legacy safeguards.

### Phase completion criteria

- [x] Baseline checks and warnings are recorded below.
- [x] Every server resource has a documented current owner and proposed target owner.
- [x] No production behavior has changed.

---

## Phase 1 — Create the target query foundation

### Query client and keys

- [x] Move `QueryClient` construction out of `app/_layout.tsx` into a testable query infrastructure module.
- [x] Define intentional query defaults for retry, stale time, garbage collection, focus/reconnect behavior, and authentication failures.
- [x] Add typed query-key factories for analytics, wrapped analytics, receipts, import preferences, and Gmail status.
- [x] Ensure query keys include user identity and every input that changes the response.
- [x] Add a shared test wrapper that creates an isolated `QueryClient` per test.
- [x] Prevent test retries and cache leakage between tests.

### Contract and error conventions

- [x] Define the standard domain-query return shape and error conventions.
- [x] Preserve stable API error codes such as reconnect-required conditions.
- [x] Choose and document the transport-validation approach: explicit type guards/normalizers, runtime schemas, or generated/shared contracts.
- [x] Add a representative contract-normalization test before migrating consumers.

### Phase completion criteria

- [x] The app still behaves identically with the extracted query infrastructure.
- [x] Query infrastructure tests pass.
- [x] No feature has two writable server-state owners.

---

## Phase 2 — Migrate analytics as the first vertical slice

Analytics is the lower-risk proof of the target pattern before migrating the more complicated import state machine.

### Query and service boundary

- [x] Add summary and wrapped-summary query hooks with separate, intentional keys.
- [x] Normalize the summary response in `services/analyticsApi.ts` without leaking `any` into domain objects.
- [x] Preserve the distinction between the ordinary summary and wrapped-enriched summary.
- [x] Define invalidation helpers for receipt imports, receipt clearing, and other analytics-changing mutations.
- [x] Decide whether analytics must work offline; if yes, use one documented persistence mechanism with user binding and freshness rules.

### Consumer migration

- [x] Migrate the Dashboard from `state.analytics`/`loadAnalytics` to the analytics query hook.
- [x] Migrate Summary/Wrapped loading and preloading to query state.
- [x] Migrate Profile analytics display to query state.
- [x] Migrate startup/onboarding decisions that currently inspect context analytics.
- [x] Update Gmail and export import success paths to invalidate/refetch analytics rather than setting context state directly.
- [x] Update receipt clearing to invalidate or set canonical empty query data.

### Remove superseded analytics ownership

- [x] Remove analytics data, loading state, setters, and loaders from `UserContext` and `userTypes` after every consumer is migrated.
- [x] Remove the context analytics promise ref and duplicate preload path.
- [x] Remove analytics-specific use of custom request deduplication once query deduplication owns it.
- [x] Remove or narrow `utils/userAnalytics.ts` if it is no longer needed.
- [x] Remove or narrow analytics storage helpers in `utils/offlineCache.ts` based on the documented offline decision.
- [x] Replace obsolete tests with query-hook and consumer integration tests.

### Phase completion criteria

- [x] Authentication context contains no remotely fetched analytics state.
- [x] Summary and wrapped consumers share one query-owned source of truth.
- [x] Imports and receipt clearing update all analytics consumers without restarts or manual refreshes.
- [x] Focus/remount behavior does not cause duplicate requests.

---

## Phase 3 — Migrate import preferences and Gmail health

Read and follow `snacktrack-import-flow` before beginning this phase.

### Canonical import query

- [x] Add query hooks for import preferences and Gmail connection health.
- [x] Add mutations for monitoring consent, ongoing tracking consent, export requested, export-ready check, tracking check, Gmail import, and disconnect.
- [x] Write authoritative mutation responses directly to the relevant cache where safe.
- [x] Invalidate analytics, receipts, preferences, and Gmail health intentionally after each mutation.
- [x] Preserve initial-load data during background refetches.
- [x] Preserve reconnect-required and temporary-unavailable as different states.

### Remove competing frontend state

- [x] Replace `useImportPreferences` local fetching state with the canonical query hooks or convert it into a thin compatibility wrapper during migration.
- [x] Remove `exportResetListeners` and `resetCachedImportExportState` after all consumers use query invalidation.
- [x] Reconcile `useExportUpsell` with server export coverage and lifecycle.
- [x] Remove local completion markers that can outrank actual receipt-source coverage.
- [x] Keep only explicitly required local download-handoff state in AsyncStorage.
- [x] Ensure Gmail import request deduplication has one frontend UX guard while the API remains the durable concurrency authority.

### Resolver consistency

- [x] Confirm Dashboard, Upload, and post-summary propositions consume the same canonical preference object.
- [x] Keep surface-specific copy while sharing the same lifecycle truth.
- [x] Add table-driven tests for stale preference rows versus actual email/export coverage.
- [x] Add tests for disconnected, healthy, unavailable, and reconnect-required Gmail states.
- [x] Add tests for every export lifecycle and consent combination.

### Phase completion criteria

- [x] A mutation performed on one screen is reflected on every other screen without custom listeners.
- [x] Completed imports never render as recommended because of stale local state.
- [x] Automatic tracking does not render as a manual Gmail scan action.
- [x] Receipt clearing resets the intended onboarding and coverage state consistently.

---

## Phase 4 — Decompose the Upload flow

The current `app/(tabs)/upload.tsx` coordinates route parameters, Gmail flows, export lifecycle, consent, timers, scrolling, persistence, file picking, analytics refresh, and modal presentation. Refactor it by cohesive responsibility.

### Characterization

- [x] Add integration coverage for the current three-task checklist.
- [x] Cover connect/reconnect, Gmail import, sparse results, export request, alert consent, file ready, email handoff, picker auto-open, upload completion, and failure recovery.
- [x] Cover route parameters used to focus the export section or resume an import.

### Controller and view model

- [x] Introduce an import-flow controller or reducer exposing semantic state and actions.
- [x] Move route-parameter parsing into one typed boundary.
- [x] Move timers, one-time operation keys, scroll targeting, and cleanup into focused hooks/controllers.
- [x] Derive task completion, status badge, open task, and next action through a typed resolver.
- [x] Keep native file selection and upload progress in the upload feature boundary.
- [x] Ensure the controller does not mirror durable query data into writable local state.

### Screen composition

- [x] Extract the Connect Email task section.
- [x] Extract the Gmail Import task section.
- [x] Extract the Export Request/Ready/Upload task section.
- [x] Extract workflow modals or sheets with meaningful typed contracts.
- [x] Reduce `upload.tsx` to route handling, controller selection, section composition, and navigation outcomes.
- [x] Remove obsolete effects, refs, styles, and duplicated conditionals.

### Phase completion criteria

- [x] Upload behavior and copy remain correct across the complete state matrix.
- [x] The screen no longer directly coordinates unrelated server mutations.
- [x] Choosing an export file opens the native picker once without redundant screens.
- [x] Timers and subscriptions clean up safely on unmount.

---

## Phase 5 — Simplify Dashboard orchestration

- [x] Move automatic initial Gmail scanning into an appropriate domain controller/background owner rather than a dashboard rendering concern.
- [x] Move ongoing tracking freshness checks into an appropriate domain controller/background owner.
- [x] Remove request-control refs and suppressed dependency warnings made obsolete by query ownership.
- [x] Keep `resolveDashboardTrackingState` as the pure canonical card resolver.
- [x] Ensure retry, reconnect, enable-tracking, open-export, and open-Gmail actions remain semantic and tested.
- [x] Extract the top summary cards if they have stable shared behavior.
- [x] Remove unused dashboard styles left from previous quick-action implementations.
- [x] Verify “What we noticed” uses canonical analytics query data and preserves pause, reduced motion, inactive-app behavior, and one-card presentation.

### Phase completion criteria

- [x] Dashboard is primarily a composition layer.
- [x] Background work does not depend on repeatedly visiting the Dashboard.
- [x] Analytics and tracking state update without duplicate requests or visual flicker.

---

## Phase 6 — Establish shared visual primitives

Create primitives only after confirming stable patterns across at least two consumers.

- [x] Inventory repeated card, button, badge, icon-surface, section-header, modal, loading, empty, and error patterns.
- [x] Add a shared `Card` using canonical `Radius` and `Shadows` tokens.
- [x] Add primary, secondary, destructive, and icon-button primitives with pressed, disabled, and pending behavior.
- [x] Add a shared status badge with non-color completion semantics.
- [x] Add shared section-header and icon-surface primitives where reuse is demonstrated.
- [x] Consolidate the duplicate `alerts.ts` and `platformAlert.ts` facades behind one public import path.
- [x] Keep `AppAlertProvider` as the single branded short-alert implementation.
- [x] Migrate Dashboard and Upload first as representative consumers.
- [x] Migrate other screens incrementally after visual comparison.
- [x] Remove duplicated shadow/radius objects and unused style blocks.

### Accessibility and motion

- [x] Add roles, labels, states, disabled state, and adequate touch targets to every migrated control.
- [x] Verify font scaling and long currency/text values do not clip.
- [x] Verify color contrast and that status is not conveyed by color alone.
- [x] Respect reduced motion for all migrated animations.
- [x] Pause nonessential animation when the app is inactive.
- [x] Animate content rather than shadowed card containers to avoid dark transition halos.

### Phase completion criteria

- [ ] Repeated surfaces look and behave consistently across iOS and Android.
- [x] The theme check passes without new raw colors.
- [x] Migrated custom controls have explicit accessibility semantics.

---

## Phase 7 — Refactor remaining large screens by feature boundary

Do not split files purely by line count. Apply the same characterization → resolver → controller → composition sequence.

### Summary/Wrapped

- [x] Separate journey data selection from presentation and sharing.
- [x] Keep slide selection/building pure and independently tested.
- [x] Separate sharing/export effects from slide rendering.
- [x] Preserve audio, reduced motion, dismissal, and post-summary propositions.
- [x] Keep large message catalogs as data, not component control flow.

### Profile

- [x] Move receipt clearing, Gmail management, consent, and account actions into domain mutations/controllers.
- [x] Extract cohesive profile sections and modals.
- [x] Remove direct analytics/import cache manipulation.
- [x] Preserve destructive confirmation and recovery behavior.

### Receipts

- [x] Migrate receipt list and pagination to canonical query ownership.
- [x] Preserve filters, refresh, empty, loading, and error states.
- [x] Define stable receipt list keys and invalidation after imports/clearing.
- [x] Extract receipt presentation components where stable reuse exists.

### Authentication

- [x] Keep session identity and authentication actions in the auth context.
- [x] Separate login form state, provider-specific authentication, and modal presentation.
- [x] Remove analytics loading responsibilities from authentication flows.
- [x] Confirm logout clears query caches and user-bound persisted data safely.

### Development-only surfaces

- [x] Ensure test/error screens and debugging panels remain development-only.
- [x] Prevent development utilities from influencing production architecture or bundle behavior.

### Phase completion criteria

- [x] Route files compose features rather than encode multi-domain orchestration.
- [x] Each server resource has one query owner.
- [x] Each complicated view state has one pure resolver.

---

## Phase 8 — Strengthen contracts and error handling

- [x] Remove avoidable `any` from API response transformations.
- [x] Normalize analytics, receipt, auth, Gmail, and import-preference responses at service boundaries.
- [x] Add runtime validation for high-risk or externally variable response shapes where warranted.
- [x] Keep transport types separate from component/view-model types.
- [x] Standardize domain error parsing without exposing raw server/provider messages.
- [x] Route expected failures to intentional inline recovery or the branded modal.
- [x] Ensure unexpected/retryable failures are captured without logging sensitive data.
- [x] Remove direct `console.log`/`console.error` debugging from production feature paths.

### Phase completion criteria

- [x] Invalid transport data fails at the boundary with an actionable, safe error.
- [x] Components do not inspect raw Axios/provider error shapes.
- [x] Test runs are not flooded by expected logging.

---

## Phase 9 — Journey coverage and final cleanup

### Integration journeys

- [x] Cover login/session restoration → initial dashboard data.
- [x] Cover Gmail connect → historical import → analytics refresh.
- [x] Cover export request → monitoring consent → waiting → file ready.
- [x] Cover file-ready email handoff → native picker → upload → wrapped journey.
- [x] Cover all imports complete → ongoing tracking active.
- [x] Cover expired Gmail credentials → reconnect → recovery.
- [x] Cover clear receipts → onboarding and source-coverage reset.
- [x] Cover offline/reconnect behavior retained by the final architecture.

### Test hygiene

- [x] Remove duplicate tests that no longer have distinct purposes.
- [x] Fix all React `act(...)` warnings.
- [x] Mock expected logger output so passing tests are quiet.
- [x] Fail tests on unexpected console errors where practical.
- [x] Restore fake timers and query clients cleanly after each test.

### Dead-code cleanup

- [x] Remove superseded hooks, cache utilities, listener sets, request deduplication paths, refs, and compatibility adapters.
- [x] Remove stale styles and imports from decomposed screens.
- [x] Remove obsolete types and tests tied only to the legacy architecture.
- [x] Confirm no user-bound cached data survives logout unintentionally.
- [x] Search for disabled hook dependency rules and resolve or document every remaining case.

---

## Final verification

- [x] Run `npm run type-check` successfully.
- [x] Run `npm run lint` successfully.
- [x] Run `npm run check:theme` successfully.
- [x] Run `npm test -- --watchAll=false --runInBand --no-watchman` successfully.
- [ ] Test Dashboard, Upload, Summary, Profile, Receipts, login, logout, import, and clearing flows manually on Android.
- [x] Test the same critical flows on iOS or document what remains unverified.
- [x] Verify loading, empty, success, failure, reconnect, retry, and completed states.
- [ ] Verify reduced motion, font scaling, screen-reader labels, disabled states, and touch targets.
- [x] Review the final diff for duplicate state ownership and unrelated changes.
- [x] Update the `snacktrack-frontend-engineering` skill if implementation reveals a better canonical pattern.

## Final architecture acceptance criteria

- [x] `UserContext` owns authentication/session identity rather than analytics or import server data.
- [x] TanStack Query is the sole ordinary server-state cache for migrated resources.
- [x] No migrated resource has competing context, local, module-level, and AsyncStorage authorities.
- [x] Screens primarily compose feature components and controllers.
- [x] Multi-step workflows expose semantic actions through typed controllers/reducers.
- [x] Complicated cards and CTAs are selected by pure tested resolvers.
- [x] API services normalize or validate transport data before components receive it.
- [x] Repeated UI uses canonical theme tokens and shared primitives.
- [x] Accessibility and reduced-motion behavior are part of component contracts.
- [x] Critical user journeys have regression coverage.
- [x] The full frontend verification suite passes without unexpected warnings.

---

## Baseline record

Fill this in before Phase 1.

- Date: 2026-08-12
- Branch: `main` (31 commits ahead of `origin/main` at baseline)
- Existing modified/untracked files: newly added frontend skill and this plan; new dashboard carousel and tests; modified Dashboard, Profile, Wrapped, OnboardingContext, analytics/Gmail services, and API types. The API repository separately contained `docs/UBER_EXPORT_ITEM_RECONSTRUCTION.md` and `DashboardInsightService.ts` as untracked files. All were preserved.
- Type-check result: passed.
- Lint result: passed.
- Theme-check result: passed.
- Test suites/tests result: 27 suites and 314 tests passed at baseline. After query migration, 27 suites and 310 tests pass (obsolete custom-deduplication/listener tests were replaced).
- Existing warnings: Node `punycode` deprecation; expected debug/error output in upload, Gmail, API, and error-sanitization tests; `act(...)` warnings in `useNetworkStatus` tests; Jest occasionally reported an open handle after Query tests even though all assertions completed.
- Intentional offline behavior: export download handoff and Wrapped audio preference remain device-local. Ordinary analytics, receipts, Gmail status, import preferences, and export completion are not treated as offline authorities.

## Decisions and deviations

Record architectural decisions, scope changes, and intentionally retained legacy boundaries here.

| Date | Decision or deviation | Reason | Follow-up |
| --- | --- | --- | --- |
| 2026-08-12 | Use explicit normalizers rather than adding a runtime-schema dependency. | Keeps the migration narrow while failing malformed core analytics fields at the service boundary. | Apply the same boundary pattern to receipts, auth, Gmail, and import preferences as those contracts evolve. |
| 2026-08-12 | Do not persist analytics as an offline authority. | No documented offline analytics product requirement exists; stale completion/summary state caused cross-screen disagreement. | Consider an explicitly user-bound persisted query cache only if offline analytics becomes a product requirement. |
| 2026-08-12 | Keep export upsell impressions/dismissals local, but derive completion from server preferences and receipt-source coverage. | Presentation history is device UX state; completion is durable server state. | Remove the legacy `completedAt` field from existing storage opportunistically. |

## Progress notes

Use this section for concise phase handoffs so another agent can resume without rediscovering completed work.

### Phase 0

- Baseline captured. Current owners were traced across authentication context, analytics service/context/offline cache, import hooks/listeners, Gmail flow, receipt screen pagination, export upsell storage, and mutation reset paths.

### Phase 1

- Added centralized query-client defaults, user-bound query-key factories, invalidation helpers, and isolated test wrappers. Core analytics transport fields now pass through an explicit normalizer with malformed-response coverage.

### Phase 2

- Migrated Dashboard, startup routing, Wrapped, Profile, Upload completion, and Gmail success refreshes to query-owned analytics. Removed analytics data/loaders/setters, promise locking, preload orchestration, and offline writes from `UserContext`; logout now clears the query cache. Ordinary and wrapped summaries have separate keys.

### Phase 3

- Converted `useImportPreferences` into the canonical query/mutation adapter and Gmail health into a user-bound query. Removed export reset listeners and service-level Gmail request locking. Mutations write authoritative preference responses and invalidate dependent analytics/receipt state. Export completion now comes from canonical server lifecycle/coverage, not a device marker.

### Phase 4

- Added a typed route-parameter boundary, a pure task/lifecycle resolver, and a semantic import-flow controller. Extracted the Connect Email, Gmail Import, Export Upload, and workflow-modal sections; `upload.tsx` is now a 134-line composition route. File picking/progress remain in the native upload boundary, while controller timers and one-shot keys clean up on unmount.

### Phase 5

- Moved automatic initial Gmail scanning and ongoing-tracking freshness checks into an app-wide session controller. Dashboard now composes extracted summary cards, the canonical tracking resolver/card, and query-backed insights without request-control refs.

### Phase 6

- Added canonical Card, button variants, status badge, section header, and icon surface primitives. Dashboard, Upload, and Receipts use these primitives with explicit labels/states, minimum touch targets, non-color status icons, reduced-motion support, and inactive-app animation pausing.

### Phase 7

- Migrated receipt list pagination, refresh, loading, empty, and error handling to an infinite query with stable user/page-size keys, then extracted receipt presentation into `ReceiptCard`. Profile now composes a domain controller, summary/settings sections, and workflow modals. Wrapped data/navigation and media sharing are separate hooks, and login uses distinct email-form and provider controllers with modal presentation kept separate. Authentication context is limited to session identity/actions and stable profile fields.

### Phase 8

- Added safe domain-error handling and explicit analytics, receipt, authentication, Gmail, import-preference, CSV-import, and onboarding-reset normalization with malformed-response coverage. Components no longer inspect raw Axios/provider errors, and direct feature-path console debugging was removed. Unused database/debug/legacy validation services were removed from the production service graph.

### Phase 9

- Replaced legacy analytics deduplication coverage with query-cache ownership and normalization tests; removed the custom request-deduplication utility and duplicate upload suite; migrated hooks to isolated clients; and added regression journeys for session restoration, Gmail import invalidation, export-ready picker/upload handoff, active tracking, reconnect recovery, offline behavior, and receipt clearing. Sentry is mocked at the test adapter boundary so its SDK timer no longer leaves an open handle. The exact required command exits successfully with 31 passing suites / 312 passing tests and no unexpected feature or lifecycle warnings. Node still prints its known dependency-owned `punycode` deprecation.

### Manual verification still required

- Android emulator verification covered Dashboard, Upload, Summary, Profile, and Receipts with live account data. A 130% font-scale pass confirmed that the long profile email, large currency totals, navigation labels, and multi-line cards remain readable without clipping. The live pass exposed a receipts contract mismatch (the endpoint can omit `createdAt`); the boundary now falls back to `orderDate`, with regression coverage for the observed payload.
- End-to-end login/logout, provider OAuth, destructive receipt clearing, and screen-reader announcement behavior were not exercised manually. They remain covered at the controller/integration level, but the combined Android and accessibility checklist items stay unchecked until those device interactions are completed.
- No iOS simulator runtime was available. Cross-platform visual consistency therefore remains unchecked, with iOS explicitly documented as unverified per the final-verification allowance.
