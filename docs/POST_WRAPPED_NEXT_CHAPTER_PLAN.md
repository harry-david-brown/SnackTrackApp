# Post-Wrapped “Next Chapter” Implementation Plan

## Objective

Replace the current one-purpose export modal after the lifetime slideshow with a state-aware post-Wrapped experience that:

1. gives users a clear reason to keep SnackTrack installed by offering ongoing spending tracking;
2. helps users improve incomplete history with an Uber data export;
3. asks for explicit permission before SnackTrack checks Gmail for Uber's data-ready email; and
4. presents the export proposition after every completed summary until an export has been successfully imported.

This document is the implementation checklist and source of truth for the work.

## Phase 1 — Client Foundation

Phase 1 establishes the repeat-summary rule and the two-step epilogue without
claiming that background monitoring is active before its consent and server
infrastructure exist.

- [x] Separate post-Wrapped export eligibility from dashboard reminder throttling.
- [x] Show the post-Wrapped export proposition whenever export state is loaded and incomplete.
- [x] Stop prior dismissals and snooze windows from suppressing future post-summary propositions.
- [x] Preserve existing snooze and dismissal limits for the dashboard card.
- [x] Add a pure resolver for export eligibility and imported-coverage assessment.
- [x] Add conservative, named sparse-coverage thresholds that can be tuned later.
- [x] Replace the single export modal with a sequential ongoing-value and export epilogue.
- [x] Route sparse histories to the Uber data-request tutorial as the primary action.
- [x] Keep existing-export upload available as the secondary action.
- [x] Keep completed-export users out of the historical export step while still showing ongoing value.
- [x] Add focused state-resolution and sparse-coverage tests.
- [x] Pass targeted tests, TypeScript checking, and linting.

Deferred beyond Phase 1:

- [x] Persist ongoing-monitoring consent. *(Phase 2)*
- [ ] Start background Gmail monitoring.
- [x] Detect an arriving Uber export email while the signed-in app is active and notify the user. *(Phase 3 subset)*
- [x] Persist export-request and processing states on the server. *(Phase 2)*
- [ ] Add production analytics for the epilogue funnel.

## Phase 2 — Durable Permission and Lifecycle State

Phase 2 records what the user explicitly allowed and establishes durable state
for later monitoring. It does not start a background Gmail scanner.

- [x] Store monitoring consent separately from Google OAuth credentials.
- [x] Record the consent decision, policy version, consent timestamp, and revocation timestamp.
- [x] Derive `enabled` versus `reconnect_required` from both consent and Gmail capability.
- [x] Add authenticated APIs to read preferences, update consent, and record an export request.
- [x] Persist export request, file-ready, processing, completed, and failed lifecycle states.
- [x] Store privacy-safe consent and export transition events without email or receipt content.
- [x] Backfill completed state when valid CSV/ZIP receipt data already exists.
- [x] Mark upload processing, success, and failure from the server import route.
- [x] Revoke monitoring permission when Gmail is disconnected.
- [x] Delete preference and lifecycle data automatically with account deletion.
- [x] Add an explicit, plain-language permission step to the post-Wrapped epilogue.
- [x] Add a contextual permission decision after the export-request tutorial.
- [x] Add Profile controls to grant, inspect, and revoke export-ready alert permission.
- [x] Keep existing receipts after permission revocation and explain this behavior.
- [x] Show requested, file-ready, processing, completed, failed, and reconnect states accurately.
- [x] Use server export completion to suppress post-Wrapped and dashboard export propositions.
- [x] Replace native/browser alerts with the standard mascot modal, including the sad error treatment.
- [x] Replace the export tutorial with an in-app Uber Eats/DoorDash provider chooser.
- [x] Break request and download/upload guidance into focused, one-action screenshot steps.
- [x] Add Back, Close, skip, progress, and tap-to-enlarge controls without recording skipped tutorials as requests.
- [x] Open each provider's official data-request page as an optional handoff from the in-app guide.
- [x] Show the download/upload guide after an export has been requested instead of repeating the request steps.
- [x] Add focused tutorial navigation and completion-semantics tests.
- [x] Add focused API-client and preference-hook tests.
- [x] Pass mobile TypeScript/lint checks and the API TypeScript build.

Deferred to Phase 3:

- [ ] Run scheduled Gmail monitoring only for `enabled` users.
- [x] Detect matching Uber export-delivery messages during active-app checks.
- [x] Move detected exports to `file_ready` without opening Uber's link.
- [x] Notify users in-app when manual download and upload are required.
- [ ] Add remote push notifications for detection while the app is closed.
- [ ] Add monitoring retries, idempotency, and operational metrics.

## Product Decisions

- [x] Ongoing spending tracking and historical export import are two distinct propositions.
- [x] Ongoing tracking is the universal proposition and remains relevant after an export is complete.
- [x] The export proposition is conditional on successful export completion.
- [x] Export eligibility is not limited to the user's first summary.
- [x] Every completed summary should present the export proposition while the user still has no successfully imported export.
- [x] Dismissing the post-summary export proposition applies only to the current summary session.
- [x] A previous dismissal must not permanently suppress the proposition on future summary completions.
- [x] Dashboard reminders may still be snoozed or capped separately to avoid persistent nagging.
- [x] Starting the tutorial or requesting an export does not count as export completion.
- [x] SnackTrack must receive explicit product-level permission before checking for matching export-ready email.
- [x] Google OAuth authorization alone must not be treated as permission for ongoing monitoring.
- [x] Users must be able to decline either proposition and leave the post-Wrapped experience.

## Target Experience

### Core Flow

1. User reaches the final archetype slide.
2. User taps **Done** or **Continue**.
3. SnackTrack presents the ongoing-tracking proposition.
4. If ongoing tracking is not enabled, the user can explicitly enable it or decline.
5. SnackTrack evaluates the user's export and Gmail-coverage state.
6. If no export has been successfully imported, SnackTrack presents the appropriate export proposition.
7. The user can request an export, upload an existing export, or finish.
8. If an export is complete, SnackTrack skips the historical export proposition.

### Experience Principles

- [ ] Keep the epilogue short enough that it does not weaken the archetype ending.
- [x] Present the propositions sequentially instead of placing two competing primary actions in one modal.
- [ ] Use concrete benefits instead of generic language such as “monitor your spending.”
- [ ] Make every permission request understandable without relying on the Google authorization screen.
- [ ] Never imply that SnackTrack knows emails were deleted; describe low coverage as a possibility.
- [ ] Never claim an export makes the user's history exhaustive.
- [ ] Preserve a clear, non-punitive exit at every step.

## State Model

The post-Wrapped experience should be driven by durable user state rather than first-view logic.

### Export States

- [x] Define `not_started`: no successfully imported export and no known request in progress.
- [x] Define `requested_monitoring_enabled`: user requested an export and allowed SnackTrack to detect its arrival.
- [x] Define `requested_monitoring_disabled`: user requested an export but did not allow monitoring.
- [x] Define `file_ready`: SnackTrack detected a likely export delivery but import is not complete.
- [x] Define `import_processing`: the export has been submitted and is being processed.
- [x] Define `completed`: at least one valid export has been successfully processed.
- [x] Define failure/retry behavior without incorrectly moving the user to `completed`.

### Ongoing-Tracking States

- [x] Define `not_offered`.
- [x] Define `declined`.
- [x] Define `enabled`.
- [x] Define revoked consent as `disabled`.
- [x] Define `reconnect_required` when Gmail access can no longer support the enabled behavior.
- [ ] Decide whether declining is session-only, snoozed, or remembered for future summaries.

### Post-Wrapped Display Rules

| State | Ongoing proposition | Export proposition |
|---|---|---|
| Tracking disabled, no completed export | Show | Show |
| Tracking enabled, no completed export | Confirm status or skip full pitch | Show |
| Tracking disabled, export completed | Show | Skip |
| Tracking enabled, export completed | Brief confirmation or finish | Skip |
| Export requested, monitoring enabled | Show tracking state as applicable | Show “we'll watch for it” status |
| Export requested, monitoring disabled | Show tracking state as applicable | Explain how to return and upload |
| Export processing | Show tracking state as applicable | Show processing status, not another request CTA |

- [x] Implement the currently supported rules in a pure, testable state resolver.
- [x] Keep post-summary display rules separate from dashboard upsell frequency rules.
- [x] Ensure replaying and completing Wrapped reevaluates current export-completion state every time.

## Proposition 1 — Ongoing Spending Tracking

### User Promise

SnackTrack should explain what keeping the app provides:

- [ ] Automatically add new eligible Uber Eats orders.
- [ ] Keep current-month spending updated.
- [ ] Show how spending changes over time.
- [ ] Support useful monthly recaps and/or spending alerts at launch.
- [ ] Improve the user's lifetime summary as new orders arrive.

Do not promise alerts or monitoring features that will not be available at launch.

### Proposed Copy Direction

**Eyebrow**

> YOUR NEXT CHAPTER

**Headline**

> Keep tracking from today

**Body**

> SnackTrack can add new Uber Eats orders and show how your spending changes over time.

**Primary action**

> Keep tracking my spending

**Secondary action**

> Not now

- [ ] Finalize copy after the exact launch feature set is confirmed.
- [ ] Provide alternate copy for users who already enabled tracking.
- [ ] Provide reconnect copy when authorization has expired or required access is missing.

## Proposition 2 — Improve Historical Coverage

### Normal-Coverage Variant

Use when the Gmail import appears reasonably representative:

> We built this from {orderCount} Uber Eats receipts in your inbox. Add your Uber data export to uncover older orders and fill in the gaps.

Suggested actions:

- **Request my Uber data**
- **Upload an export I already have**
- **Maybe later**

### Sparse-Coverage Variant

Use when the Gmail scan finds unusually limited history:

> We only found {orderCount} Uber Eats receipts in your inbox. Older emails may no longer be available, so your Uber data export is the best way to recover more history.

Suggested actions:

- **Get my Uber history**
- **Upload an export I already have**
- **Finish for now**

- [x] Route the sparse-coverage primary action directly into the export-request tutorial.
- [ ] Do not send sparse-coverage users back through another generic Gmail scan by default.
- [ ] Include a user-controlled “Does this look too low?” escape hatch where appropriate.
- [ ] Adjust copy for zero, one, and plural order counts.
- [ ] Adjust returning-user copy so repeated offers do not read like first-time onboarding.

### Repeat-Summary Variant

Suggested headline:

> Still missing some history?

- [ ] Distinguish first presentation from later summary completions for copy only.
- [ ] Do not use first presentation as an eligibility condition.
- [ ] Continue showing the export proposition after future summary completions until state is `completed`.

## Sparse-Coverage Classification

Sparse coverage should not be determined by receipt count alone.

Candidate inputs:

- Gmail import `totalEmailsFound`;
- Gmail import `totalReceiptsProcessed`;
- successfully imported receipt count;
- earliest and latest imported order dates;
- length of the represented date window;
- whether the user indicates that the result looks too low.

- [x] Define an initial conservative sparse-coverage rule with named, tunable thresholds.
- [ ] Prefer a server-provided coverage assessment if multiple clients will consume the state.
- [ ] Ensure the assessment is reproducible after the immediate import result is no longer in memory.
- [ ] Store only the minimum coverage metadata required for product behavior.
- [x] Add a neutral fallback when coverage cannot be assessed.
- [ ] Validate thresholds against low-, medium-, and high-volume test histories.
- [ ] Instrument the classification so thresholds can be tuned after launch.

## Explicit Email Monitoring Consent

### Consent Prompt

Implemented language direction:

> Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available?

The supporting explanation must state:

- SnackTrack checks only for Uber's matching data-ready email while the app is active.
- SnackTrack does not store the user's inbox.
- SnackTrack does not open Uber's link or download the archive.
- The user can turn monitoring off and disconnect Gmail.

Suggested actions:

- **Notify me**
- **Not now**

### Requirements

- [x] Use an explicit affirmative action; do not preselect consent.
- [x] Keep one-time Gmail import consent separate from ongoing-monitoring consent.
- [x] Record the consent version, timestamp, and user decision.
- [x] Make consent revocable from Profile.
- [x] Gate future scheduled monitoring on effective consent state.
- [x] Explain what happens to previously imported receipts after revocation.
- [x] Avoid logging email contents or other sensitive inbox details in analytics.
- [x] Confirm the current Gmail read-only scope and offline token mode can support later monitoring.
- [x] Add reconnect handling when background access expires or is revoked.
- [ ] Complete privacy and security review before enabling scheduled background checks or push notifications.

## Uber Export Arrival Handling

Uber's delivery email links to an authenticated download page rather than attaching the archive. SnackTrack therefore detects readiness but leaves authentication and downloading to the user.

- [x] Verify the observed Uber export-delivery format.
- [x] Record that the delivery email contains an authenticated download-page link, not the export archive.
- [x] Do not collect Uber credentials or attempt server-side downloading.
- [x] Detect the matching delivery email after explicit consent and an export request.
- [x] Notify the user to sign in to Uber, download the archive, and upload it manually.
- [x] Do not describe detection as completed import.
- [x] Provide `requested` and `file_ready` in-app statuses for users waiting on Uber.
- [x] Preserve the manual upload path.
- [ ] Prevent duplicate imports when the same export is detected or uploaded more than once.

## UX and Navigation Work

- [x] Replace the current single post-deck export modal with a short state-aware epilogue flow.
- [x] Implement Phase 1 as a sequential bottom-sheet modal.
- [ ] Preserve the final archetype as the emotional climax.
- [ ] Update the final slide CTA to transition naturally into the epilogue.
- [ ] Add normal-, sparse-, requested-, processing-, and completed-state UI.
- [x] Add an upload-existing-export secondary path.
- [x] Add a direct export-request tutorial path.
- [ ] Add explicit consent UI before enabling email monitoring.
- [ ] Add accessibility labels and screen-reader announcements for every state and action.
- [ ] Support reduced motion.
- [ ] Verify safe-area behavior and small-screen layouts.
- [ ] Ensure Android back and iOS dismiss gestures have predictable behavior.

## Existing Behavior to Change

The current app:

- uses `useExportUpsell` to decide whether the post-Wrapped export offer appears;
- can suppress the offer after dismissals and during a snooze window;
- treats the offer as a single export-focused modal;
- skips the post-deck offer when an export is already complete; and
- does not yet provide the separate ongoing-spending proposition.

Required changes:

- [x] Make post-Wrapped export eligibility depend on `hasCompletedExport`, not first-summary or prior-dismissal state.
- [x] Remove permanent dismissal as a post-Wrapped suppression condition.
- [x] Treat “Finish for now” as dismissal for the current epilogue session.
- [x] Retain separate snooze/cap behavior for dashboard reminders.
- [x] Separate the ongoing-value step from export eligibility.
- [x] Stop using one callback/state flag to represent both post-deck visibility and export-upsell visibility.

## Data and API Work

- [ ] Decide which state is authoritative on the server versus local device storage.
- [x] Persist export request status across devices and reinstallations.
- [x] Persist explicit ongoing-monitoring consent across devices.
- [x] Expose export completion based on successful processing, with existing CSV data as a compatibility backfill.
- [x] Expose enough Gmail coverage metadata to choose the correct proposition.
- [x] Add an API to grant and revoke ongoing-monitoring consent.
- [x] Add an API/status field for background monitoring capability.
- [x] Add export-arrival and import-processing lifecycle states for later automated detection.
- [ ] Define idempotency and deduplication behavior for detected exports.
- [x] Ensure account deletion removes consent and pending export state through cascading deletion; existing user deletion removes stored Gmail tokens.

## Analytics

Do not include restaurant names, email subjects, receipt contents, or other sensitive data in events.

- [ ] Track epilogue viewed.
- [ ] Track ongoing-tracking proposition viewed.
- [ ] Track ongoing-tracking accepted.
- [ ] Track ongoing-tracking declined.
- [x] Track monitoring consent granted.
- [x] Track monitoring consent declined.
- [x] Track monitoring consent revoked.
- [ ] Track export proposition viewed.
- [ ] Include normal/sparse/requested/processing state in export proposition events.
- [ ] Track export request tutorial started.
- [ ] Track existing-export upload selected.
- [x] Track export request marked complete by the user.
- [ ] Track export detected.
- [x] Track export import started, succeeded, and failed.
- [ ] Track post-Wrapped finish without accepting either proposition.
- [ ] Track whether the export proposition was shown after a first or repeat summary.
- [ ] Measure repeat-summary export conversion separately from first-summary conversion.
- [ ] Measure ongoing-tracking opt-in and subsequent retention.

## Automated Test Checklist

### State Resolution

- [x] No completed export always remains eligible for the post-summary export proposition.
- [x] A prior post-summary dismissal does not suppress the proposition after a later summary completion.
- [x] A dashboard snooze does not incorrectly suppress the post-summary proposition.
- [x] Completed export suppresses only the historical export proposition.
- [x] Completed export does not suppress the ongoing-tracking proposition.
- [ ] Export-requested states show status-specific messaging instead of the initial request pitch.
- [ ] Processing state cannot be mistaken for completion.
- [ ] Declining ongoing monitoring does not imply Gmail disconnection.
- [ ] Revoking Gmail access updates tracking state correctly.

### Coverage

- [x] Sparse classification handles zero receipts.
- [x] Sparse classification handles short date coverage.
- [x] Normal classification handles sufficient count and date coverage.
- [x] Unknown coverage uses neutral copy.
- [ ] User-reported low coverage can route directly to export guidance.

### Consent

- [x] No export-email checking begins before explicit consent and an export request.
- [ ] Consent is recorded only after the affirmative action.
- [x] Revocation stops future active-app checks.
- [ ] A consent-version change can require renewed consent when appropriate.
- [x] Export-email detection does not run for users who declined monitoring.

### Navigation

- [x] Final archetype transitions into the epilogue.
- [x] Users can leave without accepting either proposition.
- [x] Sparse coverage opens the export-request tutorial directly.
- [x] Existing-file action opens the upload surface.
- [x] Replaying Wrapped reevaluates state rather than using stale first-view state.

## Manual QA Checklist

- [ ] First summary, normal Gmail coverage, no export.
- [ ] First summary, sparse Gmail coverage, no export.
- [ ] Repeat summary after dismissing the previous export proposition.
- [ ] Repeat summary while waiting for an export.
- [ ] Repeat summary while an export is processing.
- [ ] Summary after export completion.
- [ ] Ongoing tracking already enabled.
- [ ] Ongoing tracking declined.
- [ ] Gmail connected with temporary access only.
- [ ] Gmail access expired or revoked.
- [ ] Monitoring consent revoked from settings.
- [ ] Matching export email moves the lifecycle to `file_ready` and shows one in-app alert.
- [ ] The alert routes to the manual download/upload guide.
- [ ] Duplicate export delivery does not create duplicate receipts.
- [ ] VoiceOver and TalkBack announce consent and skip actions clearly.
- [ ] Small iOS and Android screens show all actions without clipping.

## Rollout

- [ ] Confirm the exact ongoing-monitoring feature set available at launch.
- [ ] Put the new epilogue behind a feature flag if needed.
- [ ] Ship state tracking and analytics before broad rollout.
- [ ] Test internally with representative Gmail and export states.
- [ ] Conduct privacy/security review of export-email detection and future push notifications.
- [ ] Release to a limited cohort.
- [ ] Review completion, consent, retention, import-success, and complaint signals.
- [ ] Tune sparse-coverage thresholds and copy based on observed results.
- [ ] Roll out broadly after state transitions and revocation behavior are verified.

## Definition of Done

- [ ] Every completed summary presents the export proposition when no export has been successfully imported.
- [ ] Prior dismissal never permanently suppresses a future post-summary export proposition.
- [ ] Successfully imported exports stop the historical export proposition.
- [ ] Ongoing spending tracking is presented independently of export completion.
- [x] Export-email detection requires explicit, recorded permission.
- [ ] Users can revoke permission and monitoring stops.
- [ ] Sparse Gmail coverage routes users directly toward the export solution.
- [ ] Waiting, detected, processing, completed, and failed export states are not conflated.
- [ ] Automated tests pass.
- [ ] Manual QA passes on supported iOS and Android sizes.
- [ ] Analytics events are verified without sensitive email or receipt content.
- [ ] Product, privacy, and security reviews are complete.

## Likely Implementation Areas

### Mobile App

- `app/(tabs)/wrapped-journey.tsx`
- `components/wrapped/WrappedShareJourney.tsx`
- `components/wrapped/wrappedStyles.ts`
- `hooks/useExportUpsell.ts`
- `hooks/useGmailImport.ts`
- `app/(tabs)/upload.tsx`
- `components/gmail/GmailConnection.tsx`
- `services/gmailApi.ts`
- `types/api.ts`

### Backend

- Gmail authorization and connection-status endpoints
- Gmail import and future monitoring jobs
- User consent persistence
- Export request/detection/import status
- Coverage classification or coverage metadata
- Export deduplication
- Account deletion and token cleanup

## Open Questions to Resolve Before Implementation

- [ ] Which ongoing features are guaranteed for launch: automatic order import, monthly recap, alerts, or all three?
- [ ] What exact receipt-count and coverage-window thresholds define “sparse” initially?
- [ ] Can Uber export delivery be imported automatically, or only detected?
- [ ] How will SnackTrack know that the user has requested an export?
- [ ] Should ongoing-tracking decline be offered again after every summary or after a cooldown?
- [ ] Should users who enabled tracking see a brief confirmation after every summary or skip that step?
- [ ] Is server persistence required in the first release, or can any non-sensitive presentation state begin locally?
- [ ] What notification permission timing best supports export arrival and spending updates without stacking permission prompts?
