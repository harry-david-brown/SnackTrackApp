# Import Flow Ordering UX Audit

## Purpose

This document records the UX gaps found while reviewing SnackTrack's complete import journey across:

- onboarding;
- the Import tab;
- Gmail connection and OAuth return;
- one-time Gmail receipt imports;
- Uber Eats and DoorDash export requests, readiness, and uploads;
- post-import completion prompts;
- Dashboard next-step messaging;
- Wrapped/post-Wrapped recommendations;
- Profile tracking and alert settings; and
- the API state and receipt-merge rules that drive those surfaces.

The motivating scenario is a user who imports an Uber Eats or DoorDash export before connecting Gmail. The audit focuses on every order in which a user can complete, skip, retry, or overlap those actions.

## Core conclusion

Asking an export-first user to perform a generic "Gmail history import" does not make sense.

Gmail can still provide value after an export, but the job has changed:

1. Find orders newer than the uploaded export.
2. Establish the baseline required for optional ongoing email tracking.

The backend already respects this distinction for supported receipts. Each provider's export is authoritative through its latest order date, and Gmail receipts at or before that provider's cutoff are skipped. The remaining problem is primarily how the application frames, sequences, and prioritizes the actions.

An export-first user should be able to understand that:

- their uploaded export already covers that provider's history through its latest included order;
- an email scan is for newer orders rather than re-importing the same history;
- ongoing email tracking is optional; and
- they may consider setup complete without connecting an email account.

## Findings

### 1. The application presents a fixed sequence instead of adapting to coverage

The Import screen presents and auto-opens tasks in this order:

1. Connect Gmail.
2. Import from Gmail.
3. Import provider exports.

Onboarding and the Import header reinforce the same Gmail-first narrative. That sequence is applied even when one or both provider exports have already been imported.

For an export-first user, the next Gmail action is therefore presented as an unfinished prerequisite rather than a different, optional job: checking for orders newer than the export and setting up future tracking.

Relevant owners:

- `app/(tabs)/upload.tsx`
- `features/import-flow/importFlowResolver.ts`
- `components/OnboardingScreen.tsx`

### 2. Provider-neutral Gmail wording is intentional, but DoorDash email support is still pending

The UI intentionally describes Gmail imports and ongoing tracking in provider-neutral language such as "delivery receipts" and "future orders." This is the desired product direction because DoorDash email import support is planned.

The current backend implementation only searches for and imports Uber/Uber Eats emails. DoorDash email import has not been implemented yet.

This should **not** be treated as a request to make the UI Uber-specific. Provider-neutral UI copy may remain. It is instead an implementation dependency and release-consistency risk to track until DoorDash email import ships. During development and QA, behavior should not be mistaken for complete multi-provider email support merely because the UI already uses the future-state wording.

Relevant owners:

- API Gmail sender query in `SnackTrackAPI/src/config/AppConfig.ts`
- Gmail synchronization in `SnackTrackAPI/src/services/import/GmailImportService.ts`
- Import and tracking copy throughout the app

### 3. "Any export" is repeatedly treated as "all history"

The Import screen correctly distinguishes `0 of 2`, `1 of 2`, and `2 of 2`. Several other surfaces reduce provider coverage to `hasExportData`, which becomes true after importing either provider.

Consequences include:

- one Uber Eats or DoorDash export can produce "Your full history is already here";
- one imported provider suppresses the Dashboard export recommendation;
- one imported provider hides the post-Wrapped export offer;
- the missing provider is no longer promoted outside the Import screen; and
- Wrapped coverage assessment stops distinguishing sparse or incomplete coverage once any export exists.

This is the largest inconsistency between the provider-specific model and the rest of the product.

Relevant owners:

- `components/dashboard/dashboardTrackingState.ts`
- `hooks/useExportUpsell.ts`
- `components/wrapped/postWrappedState.ts`
- `hooks/useWrappedJourneyController.ts`

### 4. Waiting for an export hides useful work that can happen in parallel

Dashboard gives an outstanding export request precedence over Gmail setup. Because an export may take hours, the user can be left on a passive waiting card while an immediately useful email connection or scan is hidden.

The DoorDash-only waiting state can be completely passive. The Uber state may only offer opening Gmail to check for the ready email, rather than explaining that the user can also set up receipt coverage while waiting.

Export waiting is a background condition, not necessarily the user's single next action.

Relevant owner:

- `components/dashboard/dashboardTrackingState.ts`

### 5. Gmail connection loses the intent that brought the user there

A user can connect Gmail for different reasons:

- import recent receipts;
- enable Uber export-ready alerts;
- recover an expired connection; or
- enable ongoing tracking.

After OAuth succeeds, the Import controller always opens the Gmail import task. It does not preserve the initiating intent.

For example:

`Enable export-ready alert -> Connect Gmail -> Unexpected Gmail receipt-import prompt`

The user does not first receive confirmation that export alerts are working or return to the export-waiting context.

Relevant owner:

- `hooks/useImportFlowController.ts`

### 6. Post-import actions are hard-coded instead of derived from remaining work

After Gmail completes, "Add Another Source" always opens the export card—even when both exports are already imported.

After an export completes, "Add Another Source" also opens the export card, even when the appropriate next action may instead be:

- import the missing provider;
- check email for orders newer than an existing export;
- decide whether to enable ongoing tracking; or
- finish without adding anything else.

Completion actions should be based on provider coverage, email coverage, connection health, pending requests, and tracking choice rather than the type of import that just finished.

Relevant owner:

- `hooks/useImportFlowController.ts`

### 7. A zero-result Gmail scan is misleading after an export

The app currently reports that no supported delivery receipts were found when `totalReceiptsProcessed` is zero. After an export, several materially different outcomes need to be distinguishable:

- no matching receipt emails were found;
- matching receipts were found but all were already covered by the export;
- matching receipts were found but none were newer;
- newer receipts were found but did not create new orders; or
- no currently supported provider emails were found.

The backend filters receipts against provider-specific export cutoffs, but the result contract and completion copy do not expose enough information to explain that outcome accurately.

Relevant owners:

- `SnackTrackAPI/src/services/import/GmailImportService.ts`
- `hooks/useImportFlowController.ts`

### 8. Export completion appears final before another setup step is introduced

After importing both exports, the user receives a strong completion state and can immediately view stats. Dashboard or Wrapped may later present Gmail import or tracking as "one last step."

Ongoing tracking is not represented alongside the Import checklist, so users can reasonably believe setup is complete and then encounter another prerequisite elsewhere.

The application needs a consistent distinction between:

- coverage complete;
- optional freshness setup available; and
- ongoing tracking active.

### 9. Provider-specific state is flattened into one ambiguous export status

The API persists Uber Eats and DoorDash lifecycle states independently, then also computes one aggregate export status. Aggregate priority currently favors ready, processing, requested, failed, completed, and not-started states in that order.

This can produce ambiguous combinations:

- Uber Eats completed + DoorDash failed becomes a generic export failure;
- Uber Eats requested + DoorDash failed primarily appears as requested;
- Wrapped and Profile cannot always say which provider needs attention; and
- tutorial mode can be chosen from aggregate state instead of the selected provider's state.

Provider-aware truth exists, but it is not consistently carried through every resolver and CTA.

Relevant owners:

- `SnackTrackAPI/src/routes/gmail.ts`
- `features/profile/profileSettingsState.ts`
- `components/dashboard/dashboardTrackingState.ts`
- `components/wrapped/postWrappedState.ts`

### 10. DoorDash ready/download progress is not durably provider-specific

Uber export readiness can be detected from Gmail and persisted as `file_ready`. DoorDash readiness is manually reported in the tutorial and mostly becomes a local handoff into the file picker.

That progress can be lost when the tutorial is closed or revisited. The local downloaded handoff also uses a global export version rather than a provider-specific version, which is fragile if Uber Eats and DoorDash workflows overlap.

Relevant owners:

- `hooks/useImportFlowController.ts`
- `components/upload/UberDataTutorial.tsx`
- export download handoff storage

### 11. Tutorial entry points do not consistently reflect provider state

The generic export tutorial may show an already imported, already requested, or failed provider without clearly labelling what the user is continuing.

These are different jobs and should not resolve to indistinguishable entry points:

- request a provider's first export;
- continue waiting for a requested export;
- upload an archive that is ready;
- retry a failed import;
- add the missing provider; and
- replace one provider with a newer archive.

### 12. Tracking requires a Gmail scan even when exports already provide history

The canonical tracking eligibility rule requires a completed one-time Gmail import. An export-first user therefore cannot move directly from complete historical coverage to a single choice about future tracking.

They must:

1. Connect Gmail.
2. Run a separately framed Gmail history import.
3. Consent to ongoing tracking.

The first scan may be technically useful as a baseline, but presenting it as another history import makes it seem redundant. Product behavior should eventually decide whether the baseline scan and tracking choice can be expressed as one coherent action without weakening explicit consent.

Relevant owner:

- `features/import-flow/trackingEligibility.ts`

### 13. Existing email data and the latest import status can disagree after a retry failure

The Import screen treats Gmail as complete when either the latest import completed or email-derived receipts exist. Tracking eligibility checks only whether the latest import status is completed.

If a user already has Gmail data and a later manual scan fails:

- Import can continue to show the task as complete;
- Dashboard can suppress the failure because email data exists;
- ongoing tracking can become ineligible because the latest status is failed; and
- another surface can ask the user to import Gmail history again.

This is a genuine disagreement between durable coverage and lifecycle metadata.

Relevant owners:

- `features/import-flow/importFlowResolver.ts`
- `features/import-flow/trackingEligibility.ts`
- `components/dashboard/dashboardTrackingState.ts`

### 14. Some tracking prerequisite failures are incorrectly presented as reconnection problems

Dashboard has fallback states that direct the user to reconnect Gmail whenever tracking is ineligible. The actual missing prerequisite may instead be the initial Gmail scan.

Profile distinguishes the underlying reason more accurately, but its "Import Gmail history first" wording still misframes the action for an export-first user.

Relevant owners:

- `components/dashboard/dashboardTrackingState.ts`
- `hooks/useProfileController.ts`

### 15. "Re-import from Gmail" becomes unclear once a baseline exists

After the first successful scan, a manual Gmail action is effectively a refresh or immediate check for newer receipts. Calling it "Re-import" suggests repeating the entire historical import and raises unnecessary duplication concerns.

The action's meaning should account for whether:

- a baseline scan has completed;
- exports already cover historical dates; and
- ongoing tracking is active.

### 16. Uber export-ready alerts can appear active with nothing to monitor

The Profile preference can show export-ready alerts as on when:

- no Uber export is currently requested;
- the user only uses DoorDash; or
- the current Uber export has already been imported.

Although preserving the consent choice is reasonable, a simple "On" status implies active monitoring. The UI does not distinguish a saved preference from an alert that currently has an applicable Uber request.

Relevant owners:

- `hooks/useProfileController.ts`
- profile settings presentation
- API monitoring effective state

### 17. Onboarding assumes a Gmail-first user

Onboarding describes receipts as the fast starting point and exports as something to add later. That does not acknowledge users who:

- already have an export archive;
- prefer not to connect Gmail;
- use only one provider;
- want historical stats without future monitoring; or
- want the most complete source first.

This framing establishes the fixed-sequence mental model before the user reaches Import.

Relevant owner:

- `components/OnboardingScreen.tsx`

### 18. Three different user jobs are all presented as generic imports

The application does not clearly separate:

1. **Historical coverage** — provider exports.
2. **Recent catch-up** — an email scan for orders newer than existing coverage.
3. **Future freshness** — optional ongoing email tracking.

Because these jobs are presented with overlapping "import," "history," and "tracking" language, users cannot easily tell why email still matters after an export or when they are genuinely finished.

This is the underlying mental-model problem behind most ordering gaps.

### 19. Gmail progress messaging contradicts itself

Dashboard says the user can leave while a Gmail scan finishes. The modal shown to the user who starts the scan says to keep the screen open and cannot be dismissed normally.

The product therefore gives conflicting guidance about whether the operation safely continues after navigating away or backgrounding the app.

Relevant owners:

- `components/dashboard/dashboardTrackingState.ts`
- `components/upload/ImportWorkflowModals.tsx`

## Cross-surface scenario matrix

| Scenario | Current result | UX gap |
| --- | --- | --- |
| Gmail first, no exports | Gmail is presented as the expected first step, followed by an export recommendation | Coherent, but still framed as a fixed sequence rather than one available path |
| Uber Eats export first | Gmail is still presented as an unfinished history-import step | Should be understood as newer-order catch-up and optional future tracking |
| DoorDash export first | Gmail is presented as generic delivery coverage | Provider-neutral wording is intentional, but DoorDash email support is not implemented yet |
| Both exports first | Import can look complete, then Gmail/tracking is introduced elsewhere | Coverage completion and freshness setup are not clearly separated |
| One provider imported | Upload shows `1 of 2`; Dashboard/Wrapped often behave as though exports are complete | Missing-provider opportunity disappears outside Import |
| Export requested and waiting | Dashboard prioritizes passive waiting | Useful parallel actions are hidden for hours |
| Gmail connected for export alerts | OAuth return opens Gmail import | Initiating intent is lost |
| Gmail scan finds only export-covered receipts | Completion can imply no receipts were found | Result contract cannot explain already-covered receipts |
| Gmail scan retry fails after prior success | Existing coverage, latest status, and tracking eligibility disagree | Different screens show contradictory completion/recovery states |
| Uber and DoorDash are in different lifecycle states | Aggregate status selects one condition | Provider needing attention may be hidden or unnamed |
| Both exports already imported and Gmail completes | "Add Another Source" still opens exports | Completion CTA has no valid remaining source |
| Ongoing tracking already active | Upload offers "Re-import from Gmail" | Manual refresh and historical import are not distinguished |

## Design constraints for the eventual solution

This audit does not choose the final UX. Any future plan should preserve these constraints:

- Keep Gmail connection, one-time scan completion, provider export coverage, export-ready consent, ongoing tracking consent, and connection health as independent states.
- Preserve explicit consent for ongoing email access.
- Keep Uber Eats and DoorDash export status provider-specific across every surface.
- Treat actual receipt coverage as authoritative when lifecycle metadata is stale.
- Allow imports in any order without making one valid path feel incomplete.
- Do not imply that one provider's export represents all provider history.
- Keep provider-neutral Gmail UI language because DoorDash email import is planned.
- Until DoorDash email support is implemented, maintain an explicit engineering/QA awareness that runtime support does not yet match the planned provider-neutral model.
- Compute next actions from remaining user value, not from a fixed checklist position or the import type that just completed.
- Distinguish "your history is covered" from "optional future updates are available."

## Canonical implementation areas for a future pass

### App

- `features/import-flow/importFlowResolver.ts`
- `features/import-flow/trackingEligibility.ts`
- `hooks/useImportFlowController.ts`
- `hooks/useExportUpsell.ts`
- `components/dashboard/dashboardTrackingState.ts`
- `components/wrapped/postWrappedState.ts`
- `hooks/useWrappedJourneyController.ts`
- `hooks/useProfileController.ts`
- `components/upload/*`
- `components/OnboardingScreen.tsx`
- `app/(tabs)/upload.tsx`

### API

- `src/routes/gmail.ts`
- `src/services/data/ImportPreferencesRepository.ts`
- `src/services/import/GmailImportService.ts`
- `src/services/import/OngoingTrackingService.ts`
- `src/services/import/CsvImportService.ts`
- `src/config/AppConfig.ts`

## Verification note

This was a source-level UX and state-model audit. No application or API behavior was changed, so no TypeScript check was required for this documentation-only addition.
