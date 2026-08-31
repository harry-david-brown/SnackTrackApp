# Import Flow UX Resolution Plan — Findings 6–15

## Scope

This plan addresses findings **#6 through #15** from [`IMPORT_FLOW_ORDERING_UX_AUDIT.md`](./IMPORT_FLOW_ORDERING_UX_AUDIT.md):

- #6: Post-import actions are hard-coded instead of derived from remaining work.
- #7: A zero-result Gmail scan is misleading after an export.
- #8: Export completion appears final before another setup step is introduced.
- #9: Provider-specific state is flattened into one ambiguous export status.
- #10: DoorDash ready/download progress is not durably provider-specific.
- #11: Tutorial entry points do not consistently reflect provider state.
- #12: Tracking requires a Gmail scan even when exports already provide history.
- #13: Existing email data and the latest import status can disagree after a retry failure.
- #14: Some tracking prerequisite failures are incorrectly presented as reconnection problems.
- #15: “Re-import from Gmail” becomes unclear once a baseline exists.

Findings #1, #3, #4, and #5 were implemented under [`IMPORT_FLOW_ORDERING_UX_RESOLUTION_PLAN.md`](./IMPORT_FLOW_ORDERING_UX_RESOLUTION_PLAN.md). Finding #2 remains intentionally excluded: Gmail-facing UI should stay provider-neutral because DoorDash email receipt support is planned, even though runtime support has not landed yet.

Checkboxes marked complete identify groundwork already delivered while resolving findings #1–#5. Unchecked items are the remaining implementation plan and should be updated as work lands.

## Desired product model

The application should communicate three separate outcomes:

1. **History coverage** — which providers have imported order history.
2. **Email baseline and catch-up** — whether SnackTrack has successfully checked connected email and what that check found beyond export coverage.
3. **Future freshness** — whether the user explicitly enabled ongoing email tracking and whether it is currently healthy.

Completing either provider export is a real success. Completing both provider exports means export history coverage is complete. Email setup may still add recent orders and future updates, but it must be presented as optional value rather than a hidden prerequisite that makes prior completion feel false.

## Shared state and UX rules

- [x] Keep Gmail identity, credential health, Gmail scan lifecycle, provider coverage, provider lifecycle, consent, and tracking runtime as independent state axes.
- [x] Derive provider coverage from actual receipt sources when lifecycle metadata is stale.
- [x] Use a typed next-action resolver instead of hard-coded post-import destinations.
- [x] Carry provider identity through Dashboard, Import, Wrapped, Profile, and tutorial actions.
- [x] Split durable Gmail baseline completion from the status of the latest scan attempt.
- [x] Expose enough Gmail result metadata to distinguish no matches, export-covered matches, unchanged matches, and newly imported orders.
- [x] Introduce one shared tracking-recovery resolver so every surface maps the same prerequisite to the same action.
- [x] Treat a provider's durable lifecycle as server state and a device's downloaded-file handoff as short-lived device state.
- [x] Keep optional email catch-up and ongoing tracking visually separate from historical coverage completion.
- [x] Never start a Gmail scan, grant consent, or enable tracking merely because a user connected Gmail or completed an export.

## Phase 1 — Establish the durable Gmail baseline and result contracts

This phase should land before the remaining copy and flow work. Findings #7, #8, #12, #13, #14, and #15 otherwise depend on ambiguous state.

### 1.1 Separate baseline completion from the latest attempt

- [x] Add a sticky server-side baseline field, preferably `gmail_baseline_completed_at`, rather than deriving baseline completion from the mutable latest status.
- [x] Keep the latest scan attempt independently representable with:
  - [x] status (`never_started`, `importing`, `completed`, or `failed`);
  - [x] started/completed timestamp or current `updatedAt` semantics;
  - [x] stable error code; and
  - [x] imported/updated result counts where useful.
- [x] Set `gmail_baseline_completed_at` after any successful explicit baseline/catch-up scan, including a valid scan that finds zero supported receipts.
- [x] Do not clear baseline completion when a later manual scan fails.
- [x] Ensure scheduled/background tracking updates tracking runtime only and cannot create, complete, fail, or erase the explicit baseline lifecycle.
- [x] Clear baseline and latest-attempt state together during the existing authoritative clear/reset operation.
- [x] Backfill existing accounts conservatively from a previously completed import status or a durable successful manual-import audit record.
- [x] Preserve zero-result successful baselines during backfill; do not infer baseline solely from the existence of Gmail receipts.

### 1.2 Make the preferences response explicit

- [x] Add a backward-compatible Gmail baseline object to the preferences response, for example:
  - [x] `hasCompleted`;
  - [x] `completedAt`; and
  - [x] `latestAttempt` with status, timestamp, and error code.
- [x] Keep legacy `gmailImport` fields temporarily as a one-way compatibility projection.
- [x] Normalize the new fields at the app transport boundary before exposing them to resolvers.
- [x] Document the legacy fields as compatibility-only and stop using them for new UI decisions.
- [x] Define the migration/removal condition for the legacy projection once every app consumer has moved.

### 1.3 Expand the Gmail import result contract

- [x] Replace the overloaded `totalReceiptsProcessed` interpretation with explicit counts whose names match their stage:
  - [x] Gmail messages examined;
  - [x] supported receipt messages parsed;
  - [x] receipts excluded because an export already covers their provider/date;
  - [x] receipts eligible after export cutoffs;
  - [x] new orders;
  - [x] updated orders; and
  - [x] unchanged orders.
- [x] Ensure counts reconcile arithmetically after parsing, cutoff filtering, and deduplication.
- [x] Keep the response free of raw email contents or unnecessary user data.
- [x] Return a successful result for a valid zero-result scan while still marking the baseline complete.
- [x] Preserve stable machine-readable errors for reconnect-required, temporary provider failure, and import failure.
- [x] Add a pure app-side result classifier so modal title, body, and next action come from one discriminated outcome.

### 1.4 Foundation acceptance criteria

- [x] A successful zero-result scan remains a completed baseline.
- [x] A later failed scan does not erase an earlier successful baseline or existing Gmail-derived coverage.
- [x] Tracking eligibility no longer depends on whether the most recent retry succeeded.
- [x] The app can explain whether nothing matched, everything was export-covered, or nothing changed.
- [x] Old app versions can continue reading the compatibility fields during rollout.

## Finding #6 — Derive every post-import action from remaining value

### Delivered groundwork

- [x] Add `resolveImportSetupRecommendation` as the canonical semantic next-action resolver.
- [x] Use the resolver after Gmail completion and export completion.
- [x] Target a specific missing provider rather than reopening a generic export card.
- [x] Offer optional email catch-up after export-first coverage.
- [x] Allow “View My Stats” or “Done” when no further setup is required.

### Remaining work

- [x] Feed the new Gmail baseline/latest-attempt model into the resolver instead of the mutable legacy completion flag.
- [x] Feed the result classifier from finding #7 into the post-Gmail handoff so its recommendation matches what the scan actually found.
- [x] Ensure a passive requested export remains progress and is not returned as the only post-import action.
- [x] Make an active-tracking state suppress redundant setup CTAs while retaining an optional manual “Check for new orders” action in Gmail settings.
- [x] Add table-driven cases for Gmail success/failure after zero, one, and two imported providers.

### Acceptance criteria

- [x] No completion button routes to an already-complete source as its default next action.
- [x] A user with one imported provider is offered the other provider when it is the best remaining historical action.
- [x] A user with both exports can finish without being sent to Gmail.
- [x] Optional freshness remains discoverable without being labelled required.

## Finding #7 — Explain zero-result Gmail scans accurately

### Implementation plan

- [x] Implement the expanded result counts from Phase 1 in `GmailImportService` and the Gmail route response.
- [x] Define pure result outcomes for at least:
  - [x] no supported receipt emails found;
  - [x] supported receipts found but all were already covered by provider exports;
  - [x] eligible receipts found but all matched existing orders unchanged;
  - [x] existing orders updated without new orders;
  - [x] new orders imported; and
  - [x] completed with a non-fatal partial warning, if the service supports that state.
- [x] Use provider-neutral result language while DoorDash email support is pending.
- [x] For export-covered matches, say that the user's export already includes those orders rather than claiming that no receipts exist.
- [x] For unchanged matches, say that SnackTrack checked successfully and the stats were already current.
- [x] Preserve the existing history and show an actionable recovery for a failed scan.
- [x] Reuse the same result summary on Import, Dashboard-triggered checks, and any Wrapped-triggered check.

### Acceptance criteria

- [x] Every successful zero-new-order result explains why no stats changed.
- [x] “No receipts found” appears only when no supported receipt messages were actually found.
- [x] Export-covered receipts are not counted as newly processed orders.
- [x] Result copy and numeric counts cannot contradict one another.

## Finding #8 — Separate coverage completion from optional freshness setup

### Implementation plan

- [x] Introduce a shared presentation model with independent summary fields for:
  - [x] provider history coverage;
  - [x] email baseline/catch-up availability; and
  - [x] ongoing tracking state.
- [x] Keep the strong completion treatment when both provider exports are imported.
- [x] Label the follow-on email proposition as optional, such as “Keep future orders current,” instead of “one last step.”
- [x] Update Import completion, Dashboard, Wrapped, and Profile to use the same completion vocabulary.
- [x] Never convert an optional freshness action into an incomplete checklist badge.
- [x] When tracking is active, show it as a separate ongoing benefit rather than another completed import source.
- [x] When tracking is declined or skipped, preserve historical completion without recurring completion-pressure copy.

### Acceptance criteria

- [x] Both exports imported is consistently described as complete export history coverage.
- [x] The application never later contradicts that success by saying history setup is incomplete.
- [x] Email catch-up and tracking are understandable benefits but remain skippable.
- [x] Users can tell whether their history is covered and whether future updates are active at the same time.

## Finding #9 — Finish the provider-specific state migration

### Delivered groundwork

- [x] Preserve independent Uber Eats and DoorDash lifecycle objects in the preferences response.
- [x] Derive zero-, one-, and two-provider coverage explicitly.
- [x] Update Import, Dashboard, Wrapped, Profile, and export upsells to name the affected provider.
- [x] Retain aggregate export status only as a compatibility field for existing consumers.

### Remaining work

- [x] Inventory all remaining consumers of aggregate `export.status`, `export.updatedAt`, and broad `hasExportData` decisions.
- [x] Classify each remaining use as genuinely aggregate, Uber-specific compatibility behavior, or an accidental provider flattening.
- [x] Migrate `ExportReadyNotifier` and download-handoff consumers to the Uber provider object explicitly.
- [x] Remove aggregate status from new resolver and component contracts.
- [x] Document a versioned deprecation path for the aggregate API fields; do not remove them until supported clients have migrated.
- [x] Add mixed-state cases for completed + failed, requested + failed, ready + completed, and simultaneous requested states.

### Acceptance criteria

- [x] Every provider-specific badge, message, and action identifies Uber Eats or DoorDash.
- [x] One provider's failure never hides the other provider's completion.
- [x] Aggregate compatibility fields do not drive current app behavior.
- [x] Simultaneous provider workflows can progress independently.

## Finding #10 — Make ready and download handoffs provider-specific

### Server lifecycle

- [x] Add an authenticated provider-specific operation for explicit user confirmation that an archive is ready.
- [x] Validate the provider and permitted transition before setting `file_ready`.
- [x] Record how readiness was established, distinguishing server-detected email readiness from user-confirmed readiness if product analytics or copy needs that distinction.
- [x] Keep Uber's detected readiness and DoorDash's user-confirmed readiness semantically honest; neither means SnackTrack downloaded the archive.
- [x] Return the updated provider lifecycle and invalidate/refetch import preferences after the mutation.
- [x] Define idempotent behavior for repeated ready confirmation and a stable invalid-transition error.

### Device download handoff

- [x] Replace the global Uber-only storage key with a user-and-provider-scoped key.
- [x] Version each handoff from that provider's lifecycle `updatedAt` or a dedicated operation identifier, not aggregate export state.
- [x] Allow Uber Eats and DoorDash handoffs to coexist without overwriting each other.
- [x] Keep “downloaded” device-local unless a cross-device product requirement is established; it describes possession of a local file, not server coverage.
- [x] Clear the selected provider's handoff after successful upload, provider restart, reset, or lifecycle version change.
- [x] Migrate or safely ignore the old Uber-only storage key and remove it after compatibility is no longer needed.

### Acceptance criteria

- [x] Closing and reopening the DoorDash tutorial preserves the durable ready state.
- [x] Uber Eats and DoorDash can both be ready without corrupting either handoff.
- [x] A downloaded flag for an old request cannot leak into a newer provider request.
- [x] The UI never implies SnackTrack downloaded an archive automatically.

## Finding #11 — Resolve tutorial entry from the selected provider lifecycle

### Delivered groundwork

- [x] Route tutorial actions with a selected provider.
- [x] Show provider lifecycle labels in the chooser.
- [x] Avoid choosing a provider tutorial solely from aggregate export status.

### Remaining work

- [x] Add one pure tutorial-entry resolver that maps the selected provider to a semantic job:
  - [x] `not_started` → request the first export;
  - [x] `requested` → waiting guidance and “I have it now” confirmation;
  - [x] `file_ready` → download/open-email guidance followed by upload;
  - [x] `import_processing` → non-actionable processing status;
  - [x] `failed` → retry upload with the existing-history-preserved explanation; and
  - [x] `completed` → replace with a newer archive.
- [x] Make every Profile, Dashboard, Import, and Wrapped entry point call that resolver.
- [x] Keep the selected provider when moving backward, closing/reopening, or returning from Gmail.
- [x] Prevent generic “help me request it” steps from appearing for a completed or file-ready provider.
- [x] Give every tutorial action an accurate accessibility label and pending/disabled state.

### Acceptance criteria

- [x] Every entry point opens the same correct step for the same provider state.
- [x] Processing states cannot start a duplicate upload.
- [x] Failed states offer retry rather than restarting the request tutorial.
- [x] Completed states clearly describe updating from a newer archive.

## Finding #12 — Turn tracking setup into one coherent optional journey

### Product behavior

- [x] Preserve the technical baseline requirement for safe incremental tracking, but stop presenting it as another full history import after exports.
- [x] Present one user-initiated “Keep future orders current” journey with these explicit stages:
  - [x] explain what email access adds after existing exports;
  - [x] connect or reconnect Gmail for the `ongoing_tracking` purpose when needed;
  - [x] run an explicit one-time baseline/catch-up scan;
  - [x] explain the scan result; and
  - [x] separately ask for ongoing tracking consent.
- [x] Allow the user to stop after the scan or skip the whole freshness journey.
- [x] Never infer ongoing consent from connection, baseline success, or an existing export.
- [x] Keep the API prerequisite that consent cannot activate tracking before a successful baseline.
- [x] Consider an orchestration endpoint only if it preserves two explicit user decisions and produces a clearer atomic error contract; do not combine consent invisibly.

### Cross-surface behavior

- [x] Route Dashboard, Wrapped, Profile, and Import tracking actions into the same guided journey.
- [x] Resume the journey at the correct stage after OAuth using the existing Gmail connection purpose.
- [x] If the baseline succeeds but consent is declined, show history/catch-up success and tracking off.
- [x] If consent succeeds, refetch preferences before showing tracking active.
- [x] If the baseline fails, preserve historical export completion and offer the correct retry/reconnect action.

### Acceptance criteria

- [x] An export-first user never sees “Import Gmail history first.”
- [x] The baseline check has a clear purpose: find newer orders and establish where future checks begin.
- [x] Tracking is enabled only after separate explicit consent.
- [x] Both-export users can dismiss freshness setup and remain fully complete for historical coverage.

## Finding #13 — Preserve established email coverage across retry failures

### Implementation plan

- [x] Migrate `resolveImportCoverage`, `resolveTrackingEligibility`, Dashboard, Import, Wrapped, and Profile to the new baseline/latest-attempt fields.
- [x] Make baseline completion sticky across later retry failures.
- [x] Render the latest failure as a secondary recovery state such as “Last Gmail check failed” while retaining prior imported data and baseline completion.
- [x] Keep tracking eligibility based on successful baseline completion plus current credential capability—not the latest manual attempt status alone.
- [x] Preserve the last successful counts/timestamp separately from the latest failed-attempt timestamp if both are shown.
- [x] Ensure a failed manual check does not pause active tracking unless the failure also changes credential health or tracking runtime.
- [x] Ensure reconnect-required failures update connection/tracking capability without deleting prior coverage.

### Acceptance criteria

- [x] Import, Dashboard, Wrapped, and Profile agree that an established baseline still exists after a retry failure.
- [x] The latest failure remains visible and actionable rather than being suppressed by existing data.
- [x] Existing receipt-derived stats remain visible.
- [x] Tracking eligibility and recovery match the actual credential/runtime condition.

## Finding #14 — Map every tracking prerequisite to the right recovery

### Delivered groundwork

- [x] Define machine-readable `gmail_history_required` and `gmail_reconnect_required` eligibility reasons.
- [x] Make the Dashboard distinguish “check email first” from reconnect-required in its current branches.

### Remaining work

- [x] Rename the baseline prerequisite reason to product-neutral language such as `gmail_baseline_required` while supporting the old value during migration if needed.
- [x] Add any missing capability reasons needed to distinguish loading, temporary Gmail unavailability, reconnect required, and eligible.
- [x] Add a shared recovery resolver returning semantic action, Gmail purpose, title, and body intent.
- [x] Map outcomes consistently:
  - [x] baseline required → start/resume the baseline catch-up journey;
  - [x] reconnect required → reconnect with `ongoing_tracking` purpose;
  - [x] temporarily unavailable → retain credentials and offer retry later;
  - [x] tracking runtime error → show the runtime-specific recovery; and
  - [x] eligible → show the explicit consent action.
- [x] Replace duplicated Dashboard, Wrapped, Profile, and Import branches with the shared result.
- [x] Remove “Import Gmail history first” and any reconnect copy used for a non-credential prerequisite.

### Acceptance criteria

- [x] Reconnect appears only when connection health requires it.
- [x] Export-first users are directed to a baseline/catch-up check, not a redundant history import.
- [x] Temporary Gmail outages do not destroy credentials or masquerade as revocation.
- [x] Every surface chooses the same recovery action for the same eligibility reason.

## Finding #15 — Use maintenance language after the first baseline

### Delivered groundwork

- [x] Keep completed Gmail history passive on Import and move the optional “Check for new orders” maintenance action into Gmail settings.
- [x] Use “Check for newer orders” when exports exist but no baseline scan has completed.

### Remaining work

- [x] Base the copy on durable baseline completion rather than the existence of Gmail receipts alone.
- [x] Standardize the semantic jobs and labels:
  - [x] first scan without export coverage → “Import from Gmail”;
  - [x] first scan after export coverage → “Check for newer orders”;
  - [x] later manual scan → “Check for new orders” in Gmail settings; and
  - [x] active tracking → “Check now” as an optional manual refresh.
- [x] Replace remaining “Import Gmail History,” “Gmail history,” and “re-import” language in Profile, Wrapped, receipts empty states, help copy, and completion modals where it describes a baseline or refresh.
- [x] Keep true historical language only where the action genuinely imports uncaptured historical email receipts.
- [x] Ensure pending and result copy use “checking” rather than implying a destructive replacement import.

### Acceptance criteria

- [x] A returning user never sees “re-import” for a safe incremental Gmail check.
- [x] Copy distinguishes the first baseline from later maintenance.
- [x] Active tracking does not make the manual check look required.
- [x] No label suggests that checking Gmail will duplicate or replace export detail.

## Cross-workstream implementation sequence

- [x] 1. Add and migrate the durable Gmail baseline/latest-attempt database model.
- [x] 2. Expand and normalize the Gmail import result contract.
- [x] 3. Add pure Gmail result and tracking-recovery resolvers.
- [x] 4. Migrate tracking eligibility and all consumers to the baseline model.
- [x] 5. Update post-import outcomes and completion/freshness presentation.
- [x] 6. Add the guided optional tracking setup journey.
- [x] 7. Add provider-specific ready confirmation and handoff storage.
- [x] 8. Centralize provider tutorial entry resolution.
- [x] 9. Remove remaining aggregate export decisions and ambiguous Gmail copy.
- [x] 10. Update this document's checkboxes and running status after each coherent slice.

## Required state matrix

| Existing history | Gmail baseline | Latest Gmail attempt | Tracking | Expected UX |
| --- | --- | --- | --- | --- |
| No sources | Never completed | None | Off | Offer source choice; Gmail action may be “Import from Gmail” |
| One export | Never completed | None | Off | Show `1 of 2`; email is “Check for newer orders,” not missing history |
| Both exports | Never completed | None | Off | History coverage complete; optional “Keep future orders current” |
| Any export | Completed, zero matches | Success | Off | Baseline complete; explain that no supported newer receipts were found |
| Any export | Completed | Success, all export-covered | Off | Explain that the export already covers the matching receipts |
| Any export | Completed | Success, unchanged | Off | Explain that Gmail was checked and stats were already current |
| Any source | Completed | Failed | Off | Preserve coverage; show “Last check failed” with correct recovery |
| Any source | Completed | Success | Consent not offered | Offer optional ongoing tracking consent |
| Any source | Completed | Success | Active | Show future updates active; manual check remains optional |
| Any source | Completed | Reconnect required | Paused/reconnect | Preserve history and offer reconnect |

| Uber Eats lifecycle | DoorDash lifecycle | Expected provider behavior |
| --- | --- | --- |
| Completed | Failed | Preserve Uber completion; identify DoorDash retry |
| Requested | Failed | Show Uber waiting progress and DoorDash recovery separately |
| File ready | Completed | Open the Uber download/upload journey |
| Completed | File ready | Open the DoorDash download/upload journey |
| File ready | File ready | Preserve two independent provider handoffs |
| Import processing | Any | Disable duplicate upload for the processing provider |
| Completed | Completed | Offer provider-specific archive updates only as maintenance actions |

## Regression coverage

- [ ] Repository/service coverage for baseline persistence, retry failure, backfill, reset, and background-sync isolation.
- [ ] Route-contract coverage for expanded result counts and backward-compatible preference fields.
- [x] Pure result-classifier cases for every zero/new/updated/unchanged outcome.
- [x] Pure tracking eligibility and recovery cases for baseline, reconnect, unavailable, runtime error, and eligible states.
- [x] Provider tutorial resolver cases for every lifecycle and both providers.
- [x] Provider-scoped handoff storage cases for simultaneous and version-changed requests.
- [ ] Component/controller coverage for completion, optional freshness, consent, retry, and OAuth resume behavior.
- [ ] Journey coverage for Gmail-first, one-export-first, both-exports-first, later retry failure, and two simultaneous provider workflows.

## Verification during implementation

- [x] Run `npm run type-check` in `SnackTrackApp` after app changes.
- [x] Run `npm run build` in `SnackTrackAPI` after API or database changes; this is the API TypeScript check.
- [x] Do not run tests, lint, theme validation, CI, or other full suites unless explicitly requested.
- [x] Inspect app and API diffs for duplicate state owners, stale compatibility branches, unscoped storage keys, and unrelated changes.
- [x] Confirm migrations are idempotent for fresh and existing databases.
- [x] Confirm mutation responses update or invalidate import preferences, receipt data, analytics, and summary state only after durable writes commit.

## Running status

| Workstream | Status | Notes |
| --- | --- | --- |
| Finding #6: derived post-import actions | Complete | Post-import routing uses remaining provider, baseline, connection, and tracking value. |
| Finding #7: truthful zero-result scans | Complete | The API exposes stage-specific counts and the app uses one result classifier. |
| Finding #8: coverage versus freshness | Complete | Historical coverage and optional future updates are presented independently. |
| Finding #9: provider-specific state | Complete | Current UI consumers use provider lifecycle and receipt-derived provider coverage. |
| Finding #10: provider-specific ready/download | Complete | Ready confirmation is durable and device handoffs are provider/version scoped. |
| Finding #11: lifecycle-aware tutorials | Complete | One resolver maps every provider lifecycle to request, waiting, download, processing, retry, or update. |
| Finding #12: coherent tracking setup | Complete | The guided journey preserves an explicit baseline check and a separate consent decision. |
| Finding #13: baseline versus retry failure | Complete | Sticky baseline state survives later failures while the latest failure remains actionable. |
| Finding #14: correct tracking recovery | Complete | Baseline, reconnect, temporary outage, and eligible states resolve to distinct recovery. |
| Finding #15: Gmail maintenance language | Complete | First scan, catch-up, and later manual checks now use distinct language. |
| TypeScript verification | Complete | App type-check and API build pass. No tests or other suites were run. |

## Canonical owner map

### App

- Import coverage and next actions: `features/import-flow/importJourneyState.ts`.
- Import card state: `features/import-flow/importFlowResolver.ts`.
- Tracking eligibility, recovery, and future-update presentation: `features/import-flow/trackingEligibility.ts`.
- Import orchestration and result modals: `hooks/useImportFlowController.ts`.
- Gmail response types and normalization: `services/gmailApi.ts` and `services/normalizers/gmailNormalizers.ts`.
- Dashboard: `components/dashboard/dashboardTrackingState.ts` and `DashboardTrackingCard.tsx`.
- Wrapped: `components/wrapped/postWrappedState.ts`, `WrappedShareJourney.tsx`, and `hooks/useWrappedJourneyController.ts`.
- Profile: `features/profile/profileSettingsState.ts` and `hooks/useProfileController.ts`.
- Provider tutorial and handoff: `components/upload/UberDataTutorial.tsx`, `components/upload/ExportReadyNotifier.tsx`, and `utils/exportDownloadHandoff.ts`.

### API

- Preferences contract and Gmail routes: `src/routes/gmail.ts`.
- Durable import/baseline lifecycle: `src/services/data/ImportPreferencesRepository.ts` and startup schema migrations in `src/services/data/PostgresService.ts`.
- Gmail scan counts and result classification inputs: `src/services/import/GmailImportService.ts`.
- Background tracking isolation: `src/services/import/OngoingTrackingService.ts`.
- Provider lifecycle transitions: `src/services/data/ImportPreferencesRepository.ts` and the authenticated provider route/service boundary.

## Implementation note

The plan was implemented across `SnackTrackApp` and `SnackTrackAPI`. App pure-resolver and provider-handoff regression files were added or updated, but no tests, lint, theme validation, CI, or full suites were run. The unchecked regression items above remain future coverage work because the API currently has no matching TypeScript test harness and the new controller journey was not executed as a test suite in this task.
