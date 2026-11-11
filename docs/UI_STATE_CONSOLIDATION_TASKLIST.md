# UI state consolidation tasklist

## Goal and boundaries

Make it possible to follow a recommendation from server facts, through a typed decision, to the screen it opens without rediscovering the same rules in several components. Preserve intentional differences between initial setup, Home recommendations, returning-user imports, and source management.

This is an incremental app refactor. Import preferences and durable operations remain server-owned; no new persisted state, consent mutation, API contract, or background worker was introduced. Existing account deletion/cancellation behavior is unchanged.

## 1. Home next action and import entry — implemented

- [x] Put unfinished-work and recovery precedence in `features/import-flow/importNextAction.ts`; Home consumes that decision instead of inspecting provider statuses and mailbox attempts independently.
- [x] Add `ImportEntryAction` in `features/import-flow/importEntryAction.ts`. An action carries its mailbox/provider, request-or-resume intent, connection purpose where needed, and import return destination. Card labels and sibling fields no longer determine navigation.
- [x] Add `features/navigation/importEntryDestination.ts` as the action-to-route adapter. Home handles refresh/analytics and opens the resolved destination through the existing navigation policy.
- [x] Keep Home presentation and optional recommendations in `components/dashboard/dashboardTrackingState.ts`. Remove the old string-action routing tree and unreachable background-check fallback from the Home screen.
- [x] Preserve the affected Gmail/Outlook inbox for retry and reconnect. When only aggregate reconnect state is known, show the inbox chooser instead of guessing a provider. Explicit mailbox parameters take precedence over legacy Gmail action names.
- [x] Share provider-stage presentation inside `postOnboardingImportJourney.ts`. Source-less `resume_export` resolves within exports; unrelated mailbox recovery or an active operation cannot consume that explicit intent.
- [x] Add regression scenarios at the decision and route/parser/journey boundary, and update the card action expectations.

### Ownership map

| Concern | Owner |
| --- | --- |
| Durable truth | Existing import preferences and operation query owners |
| Receipt-backed coverage and export opportunity | `features/import-flow/importJourneyState.ts` |
| General unfinished-work/recovery priority | `features/import-flow/importNextAction.ts` |
| Executable action contract | `features/import-flow/importEntryAction.ts` |
| Home copy, placement, optional invitations | `components/dashboard/dashboardTrackingState.ts` |
| Action to typed destination | `features/navigation/importEntryDestination.ts` |
| Route compatibility normalization | `features/import-flow/postOnboardingImportRoute.ts` |
| Selected source's current screen | `features/import-flow/postOnboardingImportJourney.ts` |
| Local back stack and user actions | Existing `usePostOnboardingImportController` |

### Decision order

The shared policy selects: submission, active durable operation, ready export, failed export, mailbox reconnect (or aggregate reconnect), failed mailbox import, tracking error, export processing, mailbox processing, waiting export, then optional guidance. Ties within one stage retain Uber-before-DoorDash and Gmail-before-Outlook ordering.

Home uses the active-operation surface above its guidance card. Without an active operation, the shared decision feeds its work/recovery card. Optional Home guidance retains its own order: tracking setup progress, receipt-informed export invitation, missing-history setup, optional tracking offer, healthy footer.

Two edge cases are now explicit: mailbox recovery beats passive export processing when there is no active durable operation, and a known failed mailbox is selected before a separate tracking error. Previously Home and the shared resolver disagreed on some of these combinations.

### Intentional journey differences

- Home recommends a next task; opening the source chooser explicitly does not force that recommendation.
- A chosen provider/mailbox remains selected even when another source has higher-priority work.
- `resume_export` without a provider chooses a resumable export, not a global next action. A new provider request does not silently submit anything.
- Downloaded-file, upload, confirmation, and file-help steps keep their existing overrides and local back history.
- Existing export coverage does not hide a newer request, ready file, failed attempt, or processing state.
- Initial onboarding completion and setup recommendations retain their existing policies; they are not redirected through Home's optional recommendation logic.
- Import routes carry `returnTo` through the existing allowlisted parser/controller close behavior. Ongoing-updates actions retain their existing screen/back behavior; this slice does not redesign that screen.
- Opening a retry/reconnect destination still requires the user's existing import/connection action. Navigation itself does not import receipts or grant ongoing-update consent.

### Verification and manual handoff

Regression coverage: `__tests__/features/homeImportEntry.test.ts`, `__tests__/features/homeDataGuidance.test.ts`, `__tests__/components/DashboardExportInvitation.test.tsx`, and the colocated returning-journey/route tests. Scenarios cover both inboxes, aggregate recovery, ready/failed/waiting exports with existing coverage, active operations, passive progress, unavailable preferences, explicit alternative-source selection, legacy parameters, and return destinations.

Final verification: `npm run type-check` and `npm run lint -- --max-warnings=0` passed. The final pass found a missing helper import and an unused import in Home; both were fixed, then only those failed checks were rerun. Tests are authored but not executed, per repository guidance that test runs are opt-in. No simulator/emulator checks are performed.

Manual handoff: tap Home retry/reconnect for each inbox; continue a ready export; back out to Home; explicitly choose another source while work is waiting. Confirm existing consent and download/upload handoff behavior remains unchanged.

## Remaining work — three follow-up steps

### 2. Separate shared facts from journey presentation

- [ ] Inventory `ImportFlowState`, `resolveImportSetupRecommendation`, initial-import and returning-import resolvers and their consumers.
- [ ] Extract a small shared facts model for receipt-backed coverage, per-inbox connection/attempt health, durable work, and tracking eligibility. Keep it derived from the existing queries, not another cache.
- [ ] Move labels, component types, opened sections, and optional recommendations out of the facts layer. Keep journey-specific policy explicit in separate resolvers.
- [ ] Extend the scenario matrix across Home, first setup, returning imports, and management. Record every intentional difference alongside a regression case.

Acceptance: the same provider facts have one derivation; remaining differences are named product decisions; the domain layer does not import presentation-component types. Initial setup still completes on useful coverage, explicit source choices remain available, and optional tracking consent stays independent.

### 3. Give operation side effects one session owner

- [ ] Audit `useImportOperation` consumers, especially Home and the root background owner, for repeated invalidations and announcements.
- [ ] Separate operation observation from session-level completion effects. Keep one owner for announcements and completion invalidation rather than per-hook-instance deduplication.
- [ ] Preserve navigation-policy handling for external completion and the critical upload/save blocker.
- [ ] Add regression scenarios for multiple observers, remount, foreground/background changes, account change/logout, and terminal operation states.

Acceptance: one terminal transition produces the intended invalidation/announcement once per session; observing a query does not independently navigate or announce; account changes cannot replay the previous account's effects.

### 4. Normalize recovery and simplify legacy orchestration

- [ ] Define one policy for initial loading, usable cached data during a refresh failure, unavailable data, missing operations, and retryability. Apply it across Home/import/setup without replacing usable data with an unnecessary outage screen.
- [ ] Reduce the older `useImportFlowController` and route adapters after mapping download/OAuth/notification compatibility. Retain compatibility only at entry boundaries.
- [ ] Consolidate duplicate destination builders where callers can use the typed action/destination contracts. Audit ongoing-updates return behavior separately before widening that contract.
- [ ] Add end-to-end resolver/route scenarios for stale cached preferences, OAuth callbacks, interrupted downloads, explicit provider overrides, and back/close fallbacks.

Acceptance: recovery semantics are consistent, legacy parameters normalize once, screens compose domain state, and no duplicate source of truth or navigation owner remains in migrated paths.

## Verification cadence for each follow-up

Implement the coherent slice and update its documentation/tests first. Run TypeScript and repository-wide lint once at the end. Fix failures and rerun only the affected check. Do not add routine intermediate checks, duplicate staged lint coverage, test-suite execution, or emulator work unless explicitly requested.
