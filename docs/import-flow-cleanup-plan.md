# Import Flow Cleanup Plan

Checkboxes reflect the completed implementation and verification work.

## Phase 1 — Establish the canonical model

- [x] Document the five independent actions: connect Gmail, import Gmail history, upload provider export, enable Uber export alerts, and enable ongoing tracking.
- [x] Define the shared state precedence for disconnected, reconnect-required, connected-unimported, importing, completed, failed, and tracking states.
- [x] Confirm that exports are always optional and can happen before or after Gmail.
- [x] Define ongoing-tracking eligibility as: historical Gmail scan completed and Gmail access healthy/durable.
- [x] Treat a successful Gmail scan with zero receipts as completed.

## Phase 2 — Remove hidden Gmail imports

- [x] Remove the automatic historical scan from `ImportBackgroundController`.
- [x] Remove the Dashboard's `gmail_auto_scan_pending` state and replace it with an explicit “Import Gmail receipts” action.
- [x] After Gmail connects, automatically open the Gmail import card without starting it.
- [x] Remove `connectAndImportGmail`.
- [x] Remove `resumeAutoImport` and its handled-flow tracking.
- [x] Remove `autoImportGmail` and `autoImportFlowId` route parameters.
- [x] Remove automatic-import behavior from the OAuth callback.
- [x] Change the API auth URL contract so OAuth never implies an import.
- [x] Update existing resolver and hook regression cases for explicit import behavior.

## Phase 3 — Separate historical imports from ongoing checks

- [x] Give manual historical imports and background tracking distinct repository operations.
- [x] Ensure only a manual import can set historical status to `importing`.
- [x] Ensure only a manual import can mark historical status `completed` or `failed`.
- [x] Make background checks update tracking timestamps, runtime status, and errors only.
- [x] Preserve `triggerType` in Gmail sync audit records.
- [x] Ensure a failed background check cannot turn a completed historical-import card into a failed card.
- [x] Ensure a successful background check cannot silently complete an unstarted historical import.
- [x] Keep the shared per-user import lock for both operations.

## Phase 4 — Unify ongoing-tracking eligibility

- [x] Create one shared app resolver for tracking eligibility and recovery actions.
- [x] Use it in Upload, Dashboard, Recap, and Profile.
- [x] Remove Profile's requirement that an export be completed.
- [x] Prevent Recap from offering tracking before the historical Gmail scan finishes.
- [x] Enforce the same prerequisite in the API when tracking consent is granted.
- [x] Return a stable API error code when prerequisites are missing.
- [x] Keep reconnect-required handling separate from import completion.
- [x] Verify declined and revoked tracking remain explicit user choices.

## Phase 5 — Add provider-specific export lifecycle state

- [x] Introduce durable lifecycle records for Uber Eats and DoorDash independently.
- [x] Track request, waiting, ready, processing, imported, and failed states per provider.
- [x] Make the export-request endpoint require a provider.
- [x] Keep Uber export-ready monitoring explicitly Uber-specific.
- [x] Derive `0 of 2`, `1 of 2`, and `2 of 2` from provider coverage.
- [x] Preserve actual receipt coverage as the authoritative imported state.
- [x] Backfill imported-provider state from existing receipt types.
- [x] Map legacy `file_ready` state to Uber.
- [x] Handle ambiguous legacy requested states conservatively rather than assuming a provider.
- [x] Allow a missing provider's request status to persist after the other provider is imported.
- [x] Ensure a failed update to one provider does not damage the other provider's completed state.

## Phase 6 — Make completion behavior consistent

- [x] Navigate a healthy first Gmail import directly to a freshly restarted Recap; keep sparse/zero results and later manual checks explicit.
- [x] Remove automatic Recap navigation after the second export.
- [x] Create one post-import result pattern for Gmail, Uber Eats, and DoorDash.
- [x] Show new, updated, unchanged, and total receipt counts where available.
- [x] Keep explicit result actions for sparse/zero imports while healthy first imports continue directly to stats.
- [x] Add a successful-zero-results Gmail state with retry and export options.
- [x] Keep the user on Upload unless they explicitly choose to leave.
- [x] Announce asynchronous success and failure to accessibility services.

## Phase 7 — Align every user-facing surface

- [x] Update the Upload header to mention Uber Eats and DoorDash.
- [x] Clarify that connecting Gmail does not start an import.
- [x] Change Uber-only export recommendations on Dashboard to provider-neutral copy.
- [x] Update Recap export offers to support both providers.
- [x] Update Profile prerequisites and settings descriptions.
- [x] Correct Help & Support's claim that importing begins automatically.
- [x] Update receipt-list empty states for connected-but-scanned and zero-result cases.
- [x] Rename generic `monitoring` presentation to “Uber export-ready alerts.”
- [x] Clarify whether export-ready alerts work only while SnackTrack is open.
- [x] Review onboarding copy for the same terminology.
- [x] Remove obsolete automatic-import comments, types, and tests.

## Phase 8 — Verification and completion

- [x] Inspect the final diff for duplicate state owners and obsolete automatic-import code.
- [x] Confirm Gmail-first, export-first, and mixed-order journeys resolve identically.
- [x] Confirm importing one provider leaves the other actionable.
- [x] Confirm reconnecting Gmail never starts an import.
- [x] Confirm ongoing tracking never changes historical-import lifecycle state.
- [x] Confirm provider-specific receipt replacement and cutoff behavior remain unchanged.
- [x] Update relevant regression test files without running test suites.
- [x] Run App TypeScript check: `npm run type-check`.
- [x] Run API TypeScript check: `npm run build`.
- [x] Run no tests, lint, or additional checks unless explicitly requested.
