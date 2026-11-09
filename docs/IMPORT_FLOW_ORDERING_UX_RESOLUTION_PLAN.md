# Import Flow Ordering UX Resolution Plan

## Scope

This plan addresses findings **#1, #3, #4, and #5** from [`IMPORT_FLOW_ORDERING_UX_AUDIT.md`](./IMPORT_FLOW_ORDERING_UX_AUDIT.md):

- #1: The application presents a fixed sequence instead of adapting to coverage.
- #3: "Any export" is repeatedly treated as "all history."
- #4: Waiting for an export hides useful work that can happen in parallel.
- #5: Gmail connection loses the intent that brought the user there.

Finding #2 is intentionally excluded. Provider-neutral Gmail UI language remains the desired product direction because DoorDash email import support is planned.

All checkboxes begin unchecked and should be updated as implementation progresses.

## Desired outcome

Users may import data in any order without the application treating a valid choice as the wrong path.

The application should independently answer four questions:

1. What historical coverage already exists for Uber Eats and DoorDash?
2. Is any provider workflow currently waiting, ready, processing, or failed?
3. What is the next action that can add meaningful value now?
4. Why did the user connect or reconnect Gmail, and where should they return afterward?

An export request that is waiting should remain visible as progress while another useful action can still be presented. One imported provider should never be described as both providers being complete.

## Shared implementation principles

- [x] Keep provider coverage, provider lifecycle, Gmail connection, Gmail scan completion, consent, and tracking runtime as independent state axes.
- [x] Treat receipt-derived provider coverage as authoritative for imported history.
- [x] Use provider lifecycle only to describe request, readiness, processing, and failure progress.
- [x] Derive next actions in typed pure resolvers rather than JSX, effects, or local completion flags.
- [x] Preserve explicit consent for export-ready alerts and ongoing tracking.
- [x] Keep route files as composition layers and multi-step behavior in the import-flow controller.
- [x] Consume navigation and OAuth intents exactly once.
- [x] Do not add another persistent client-side copy of server import preferences.
- [x] Keep provider-neutral Gmail UI wording; this plan does not make it Uber-specific.

## Phase 1 — Establish shared provider coverage and next-action models

This foundation resolves the root causes shared by findings #1 and #3 before individual screens are changed.

### 1.1 Define canonical derived coverage

- [x] Add or extract a pure provider-coverage selector from `ImportPreferencesResponse`.
- [x] Return explicit Uber Eats and DoorDash coverage instead of a single `hasExportData` completion boolean.
- [x] Expose at least:
  - [x] `uberEatsImported`;
  - [x] `doorDashImported`;
  - [x] `importedProviderCount`;
  - [x] `allProvidersImported`;
  - [x] `missingProviders`;
  - [x] `hasAnyExportData`; and
  - [x] `hasEmailCoverage`.
- [x] Reconcile a provider's imported state from durable receipt coverage when lifecycle metadata is stale.
- [x] Keep `hasAnyExportData` available for questions that genuinely mean "at least one export," but prevent it from answering "are exports complete?"

### 1.2 Define a canonical next valuable action

- [x] Introduce a typed pure resolver that selects a semantic next action from the independent state axes.
- [x] Keep user-facing copy out of the shared domain action when surfaces need different phrasing.
- [x] Support semantic actions for:
  - [x] connect or reconnect Gmail for a stated purpose;
  - [x] run the first email scan;
  - [x] run a post-export catch-up scan;
  - [x] request a specific missing provider export;
  - [x] continue a specific provider workflow;
  - [x] upload a ready provider export;
  - [x] recover a provider or Gmail failure;
  - [x] enable ongoing tracking; and
  - [x] no further setup required.
- [x] Make the resolver aware of whether work is actionable now versus merely waiting in the background.
- [x] Ensure the resolver never returns a provider action without identifying the provider.

### 1.3 Define priority rules

- [x] Give urgent, user-actionable recovery states precedence over optional recommendations.
- [x] Keep a ready-to-download or ready-to-upload archive prominent.
- [x] Treat an actively running import as in progress, not as another action to start.
- [x] Do not let a passive requested/waiting export suppress an unrelated action that can add value immediately.
- [x] Prefer a missing-provider action when the user has imported only one provider and has no more urgent recovery step.
- [x] Treat both providers imported as complete historical export coverage.
- [x] Treat optional email catch-up/tracking setup as optional when historical export coverage already exists.

### 1.4 Add resolver regression coverage

- [x] Add table-driven tests for no sources, Gmail-only, Uber-only, DoorDash-only, and both-provider coverage.
- [x] Cover stale lifecycle metadata versus actual provider receipt coverage.
- [x] Cover each provider independently in requested, ready, processing, failed, and completed states.
- [x] Cover mixed provider combinations, including completed + requested and completed + failed.
- [x] Cover connected, disconnected, reconnect-required, unscanned, scanned, tracking-active, and tracking-declined Gmail states.
- [x] Assert that every selected action includes the correct provider and purpose.

## Plan for finding #1 — Replace the fixed sequence with adaptive import guidance

### 2.1 Update the Import resolver

- [x] Replace `initialOpenTask`'s hard-coded Gmail-first ordering with the canonical next-action result.
- [x] Keep explicit route intents higher priority than automatic card expansion.
- [x] Map semantic actions to the appropriate Import card without automatically executing consent-sensitive work.
- [x] Do not auto-open Gmail connection or scan when both exports are imported and the user has not expressed an email/tracking goal.
- [x] When an export already exists, frame the Gmail scan state as catch-up/freshness rather than missing historical setup.
- [x] When one provider is imported, keep the missing provider immediately visible and actionable.
- [x] When no useful action remains, allow all cards to remain collapsed instead of inventing another required step.

### 2.2 Make Import task presentation contextual

- [x] Derive the Gmail task title, description, status, and button label from coverage and scan state.
- [x] Distinguish at least:
  - [x] first email import;
  - [x] catch-up scan after an export;
  - [x] manual check after an earlier scan;
  - [x] reconnect required; and
  - [x] optional tracking setup available.
- [x] Keep export task progress at `0 of 2`, `1 of 2`, or `2 of 2`.
- [x] At `1 of 2`, name the missing provider in the expanded task and primary action.
- [x] At `2 of 2`, present imports as historically covered while keeping newer-archive updates available as secondary maintenance actions.
- [x] Ensure completion badges do not imply that Gmail connection, historical coverage, and ongoing tracking are the same kind of completion.

### 2.3 Update onboarding and Import header framing

- [x] Replace "Start with email, then optionally add exports" with source-choice language that permits either starting point.
- [x] Explain the difference between fast email coverage and detailed provider exports without declaring one mandatory.
- [x] Make clear that future tracking is optional and separate from building historical stats.
- [x] Keep provider-neutral email language in anticipation of DoorDash email support.

### 2.4 Make post-import handoffs use the same resolver

- [x] Replace hard-coded "Add Another Source" destinations with the canonical next action.
- [x] After the first provider export, offer the missing provider when it is the best remaining historical action.
- [x] After both provider exports, do not route "Add Another Source" back to an already complete export card.
- [x] After export-first coverage, present email as optional catch-up/freshness setup.
- [x] Provide a clean "Done" or "View My Stats" path whenever no additional setup is required.
- [x] Preserve the user's explicit choice to remain on Import.

### 2.5 Acceptance criteria for finding #1

- [x] A user can start with Gmail, Uber Eats, DoorDash, or an already-downloaded archive without seeing language that implies they chose the wrong order.
- [x] Export-first users are not asked to repeat their generic "history import."
- [x] Users with both exports can finish without connecting Gmail.
- [x] Optional email catch-up and tracking remain discoverable without being shown as incomplete historical coverage.
- [x] Direct navigation intents still open the promised task exactly once.

## Plan for finding #3 — Stop treating one provider as complete export coverage

### 3.1 Replace broad completion decisions

- [x] Inventory every app use of `coverage.hasExportData`, aggregate `export.status === 'completed'`, and `hasCompletedExport`.
- [x] Classify each use as one of:
  - [x] any export data exists;
  - [x] a specific provider is imported; or
  - [x] both supported providers are imported.
- [x] Replace completion and suppression decisions with explicit provider coverage.
- [x] Retain aggregate status only for backward-compatible transport or genuinely aggregate reporting—not provider-specific UI decisions.

### 3.2 Correct Dashboard behavior

- [x] Remove "Your full history is already here" when only one provider is imported.
- [x] Name existing and missing provider coverage where useful.
- [x] Continue recommending the missing provider after the first provider succeeds.
- [x] Suppress missing-provider recommendations only after both providers are imported or the user explicitly dismisses the applicable recommendation.

### 3.3 Correct Wrapped and export upsell behavior

- [x] Replace `hasCompletedExport` with provider-progress semantics in `useExportUpsell`.
- [x] Do not hide the Wrapped export opportunity after only one provider is imported.
- [x] Make the Wrapped action target the missing provider when exactly one is absent.
- [x] Preserve existing snooze/dismiss behavior without allowing an Uber dismissal to accidentally suppress a materially different DoorDash opportunity unless that is an explicit product decision.
- [x] Keep coverage assessment meaningful for one-provider datasets instead of returning `unknown` solely because any export exists.

### 3.4 Correct Profile and tutorial behavior

- [x] Choose tutorial mode from the selected provider's lifecycle status.
- [x] Label imported, requested, ready, failed, and missing providers in the provider chooser.
- [x] Prevent an aggregate completed status from hiding another provider's pending or failed state.
- [x] Route "update export" to a provider-specific update flow.

### 3.5 API compatibility and contract cleanup

- [x] Confirm all required provider fields are already returned by the preferences endpoint.
- [x] If a missing field is needed, add it at the API normalization boundary with a backward-compatible response.
- [x] Document the aggregate export status as compatibility-only if it remains in the contract.
- [x] Avoid changing database lifecycle storage unless a concrete provider state cannot currently be represented.

### 3.6 Acceptance criteria for finding #3

- [x] Uber-only and DoorDash-only accounts consistently show `1 of 2` semantics across Import, Dashboard, Wrapped, and Profile.
- [x] The missing provider remains discoverable and actionable outside Import.
- [x] Both-provider completion is the only state described as complete export coverage.
- [x] Mixed provider failures and requests identify the affected provider.
- [x] Existing users with stale aggregate metadata resolve from durable provider receipt coverage.

## Plan for finding #4 — Separate background progress from the next useful action

### 4.1 Change the Dashboard state contract

- [x] Replace the single mutually exclusive Dashboard card result with a model that can represent:
  - [x] one primary actionable recommendation; and
  - [x] an optional compact background-progress status.
- [x] Keep file-ready, active processing, and actionable failure states eligible to become the primary card when urgency warrants it.
- [x] Render passive requested/waiting states as progress without consuming the only "Next step" slot.
- [x] Keep the provider named in every export progress state.

### 4.2 Define parallel-work behavior

- [x] While Uber Eats is requested, allow Gmail setup/import, DoorDash request, or other meaningful setup to remain available.
- [x] While DoorDash is requested, allow Gmail setup/import, Uber Eats request, or other meaningful setup to remain available.
- [x] While both exports are requested, allow email setup when it can still add value.
- [x] Do not show a second action when the user truly has nothing useful to do while waiting.
- [x] Avoid encouraging duplicate export requests for a provider already waiting.

### 4.3 Update the Dashboard component

- [x] Add a compact, non-tappable progress presentation using existing card, status, and theme primitives.
- [x] Ensure the progress presentation does not visually compete with the primary CTA.
- [x] Give screen readers a concise announcement of both the pending provider state and available next action.
- [x] Ensure passive statuses do not expose button semantics.
- [x] Preserve reduced-motion behavior and current activity presentation.

### 4.4 Update action routing

- [x] Route missing-provider recommendations with an explicit provider.
- [x] Route Gmail recommendations with an explicit purpose.
- [x] Keep waiting-status actions limited to valid operations such as checking Gmail manually or continuing a ready download.
- [x] Ensure repeated Dashboard focus/refetch does not re-run an action.

### 4.5 Acceptance criteria for finding #4

- [x] A waiting export remains visible without hiding useful Gmail or missing-provider setup.
- [x] DoorDash waiting no longer leaves the Dashboard unnecessarily actionless.
- [x] A file becoming ready immediately promotes the correct provider action.
- [x] A provider failure identifies that provider and offers the correct recovery.
- [x] The Dashboard never recommends requesting a provider already requested or imported.

## Plan for finding #5 — Preserve Gmail connection purpose across OAuth

### 5.1 Define a typed Gmail connection purpose

- [x] Add a closed `GmailConnectionPurpose` union, such as:
  - [x] `receipt_import`;
  - [x] `export_ready_alerts`;
  - [x] `ongoing_tracking`;
  - [x] `connection_recovery`; and
  - [x] `manage_connection` if needed by Profile.
- [x] Require Gmail connection entry points to provide a purpose instead of calling an unqualified connect action.
- [x] Keep the purpose separate from consent state; returning from OAuth must not grant consent by itself.

### 5.2 Round-trip the purpose safely

- [x] Add the validated purpose to the signed OAuth state or another signed, allow-listed round-trip field.
- [x] Return the validated purpose in the success and error callback URLs.
- [x] Forward it through `app/oauth-callback.tsx` when the standalone callback route is used.
- [x] Parse and normalize it once at the Import route/controller boundary.
- [x] Reject or fall back safely for unknown purpose values.
- [x] Do not permit arbitrary post-OAuth paths or unvalidated redirect targets.

### 5.3 Resume the correct flow after connection

- [x] For `receipt_import`, open the Gmail scan task but continue to require an explicit import press.
- [x] For `export_ready_alerts`, confirm connection/alert readiness and return to the applicable Uber waiting state.
- [x] For `ongoing_tracking`, return to the tracking consent/recovery action without silently enabling tracking.
- [x] For `connection_recovery`, return to the exact failed or paused operation that requested reconnection.
- [x] For cancellation or OAuth error, preserve the originating context and show the appropriate retry action.
- [x] Consume the return purpose once so refocus, remount, or back navigation cannot repeat the handoff.

### 5.4 Refresh authoritative state after OAuth

- [x] Refresh Gmail connection health after success.
- [x] Refresh import preferences because monitoring/tracking effective state may change after durable access is restored.
- [x] Update or invalidate the canonical query caches rather than maintaining a parallel success flag.
- [x] Wait for authoritative state before displaying success or resuming the next action.
- [x] Preserve existing receipts and lifecycle state on OAuth failure.

### 5.5 Acceptance criteria for finding #5

- [x] Connecting Gmail for receipt import returns to receipt import.
- [x] Connecting Gmail for Uber export-ready alerts returns to the waiting/alert context.
- [x] Reconnecting Gmail for ongoing tracking returns to tracking setup or recovery.
- [x] Reconnecting from a failed import returns to that import's retry state.
- [x] OAuth cancellation does not advance or complete any unrelated task.
- [x] OAuth completion never starts an import or grants background consent automatically.
- [x] The purpose survives the in-app browser callback and standalone deep-link callback paths.

## Cross-workstream implementation sequence

- [x] 1. Add the shared provider-coverage selector and semantic next-action types.
- [x] 2. Add table-driven characterization coverage for current mixed-provider and ordering states.
- [x] 3. Replace `hasExportData` completion decisions in Import and export upsell logic.
- [x] 4. Make Import auto-expansion and task copy adaptive.
- [x] 5. Split Dashboard primary action from background provider progress.
- [x] 6. Migrate Wrapped and Profile to provider-specific completion and actions.
- [x] 7. Add typed Gmail connection purposes at every entry point.
- [x] 8. Round-trip and consume OAuth purpose exactly once.
- [x] 9. Make post-import completion actions use the canonical next-action resolver.
- [x] 10. Remove superseded broad booleans, duplicate precedence branches, and obsolete route handling.
- [x] 11. Update this plan's checkboxes and implementation notes as each coherent slice lands.

## State matrix that must be covered

| Email state | Uber Eats export | DoorDash export | Expected emphasis |
| --- | --- | --- | --- |
| Disconnected | Not started | Not started | Offer a source choice; do not force Gmail |
| Connected, unscanned | Not started | Not started | Offer first scan and provider exports |
| Disconnected | Completed | Not started | Show `1 of 2`; missing provider primary, email freshness optional |
| Disconnected | Not started | Completed | Show `1 of 2`; missing provider primary, email freshness optional |
| Disconnected | Completed | Completed | Historical coverage complete; email freshness optional |
| Connected, unscanned | Completed | Completed | Offer catch-up/future setup, not history replacement |
| Scanned | Completed | Not started | Missing provider remains available |
| Unscanned | Requested | Not started | Show waiting progress plus a useful email or DoorDash action |
| Unscanned | Not started | Requested | Show waiting progress plus a useful email or Uber Eats action |
| Unscanned | Requested | Requested | Show both waiting; email setup remains available if useful |
| Any | File ready | Any | Promote the ready provider download/upload action |
| Any | Failed | Completed | Name Uber Eats recovery; preserve DoorDash completion |
| Any | Completed | Failed | Name DoorDash recovery; preserve Uber Eats completion |
| Reconnect required | Requested with alerts | Any | Reconnect with `export_ready_alerts` purpose |
| Reconnect required | Completed | Completed | Reconnect only if the user chooses optional future tracking |
| Scanned, tracking active | Completed | Completed | Show complete coverage and active freshness; no setup nag |

## Verification and definition of done

### Code and architecture

- [x] One provider-coverage selector is authoritative for app completion decisions.
- [x] One semantic next-action resolver owns cross-surface action selection.
- [x] Dashboard, Import, Wrapped, and Profile use the shared derived truth.
- [x] Aggregate export status no longer drives provider-specific UI.
- [x] OAuth purpose is typed, validated, signed, and consumed once.
- [x] No new AsyncStorage or module-level cache is introduced for server state or OAuth intent.
- [x] Obsolete booleans, branches, route parameters, and copy are removed.

### UX and accessibility

- [x] Every actionable export state names its provider.
- [x] Passive progress is visually and semantically distinct from an actionable card.
- [x] Buttons expose correct labels, roles, disabled/pending states, and adequate touch targets.
- [x] Expanded/collapsed task state remains accessible.
- [x] OAuth success, cancellation, and recovery outcomes are announced clearly.
- [x] Copy remains truthful for zero, one, and two imported providers.

### Regression coverage to add, but not run unless explicitly requested

- [x] Pure tests for provider coverage and next-action selection.
- [x] Dashboard resolver/component cases for simultaneous progress and action.
- [x] Import resolver/controller cases for adaptive auto-expansion.
- [x] Wrapped and Profile cases for one-provider coverage.
- [x] OAuth controller cases for every connection purpose, cancellation, failure, remount, and duplicate callback.
- [x] Journey coverage for Gmail-first, export-first, mixed-provider, and waiting-in-parallel flows.

### Required verification during implementation

- [x] Run `npm run type-check` in `SnackTrackApp` after app changes.
- [x] Run `npm run build` in `SnackTrackAPI` only if the OAuth/API contract changes.
- [x] Run lint and fix changed-file errors and warnings before finishing. Do not run tests, theme validation, or full suites unless explicitly requested.
- [x] Inspect both repository diffs for duplicated state owners, stale copy, accidental unrelated changes, and whitespace errors.

## Running status

| Workstream | Status | Notes |
| --- | --- | --- |
| Shared coverage and next-action model | Complete | Receipt-derived provider coverage, provider opportunity, and setup recommendation resolvers are canonical. |
| Finding #1: adaptive ordering | Complete | Import auto-expansion, copy, onboarding, and completion handoffs now adapt to existing coverage. |
| Finding #3: provider-specific completion | Complete | Dashboard, Wrapped, Profile, tutorials, and export upsells distinguish zero, one, and two providers. |
| Finding #4: parallel progress and action | Complete | Dashboard renders requested exports as compact progress while preserving an immediate primary action. |
| Finding #5: OAuth purpose preservation | Complete | A validated purpose is signed by the API, returned through both callback paths, and consumed once by the Import controller. |
| Final TypeScript verification | Complete | App `npm run type-check` and API `npm run build` pass. No tests or other suites were run. |

## Implemented owner map

- Provider coverage and semantic setup recommendation: `features/import-flow/importJourneyState.ts`.
- Import card state and adaptive auto-expansion: `features/import-flow/importFlowResolver.ts`.
- Import orchestration, post-import handoffs, and one-shot intent consumption: `hooks/useImportFlowController.ts`.
- Dashboard primary action plus background progress: `components/dashboard/dashboardTrackingState.ts` and `DashboardTrackingCard.tsx`.
- Wrapped provider opportunity: `hooks/useWrappedJourneyController.ts` and `components/wrapped/postWrappedState.ts`.
- Profile provider progress and targeted tutorial: `features/profile/profileSettingsState.ts`.
- OAuth purpose transport: `features/import-flow/gmailConnectionPurpose.ts`, `hooks/useGmailImport.ts`, `services/gmailApi.ts`, `app/oauth-callback.tsx`, and `SnackTrackAPI/src/routes/gmail.ts`.

The API continues accepting older auth-URL requests that omit a purpose and defaults them to `receipt_import`. The aggregate export status remains in the response for compatibility, but provider-specific UI now uses provider lifecycle plus receipt-derived coverage.
