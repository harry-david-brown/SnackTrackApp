# Simplified import journey — release and device walkthrough

## Release order

1. Deploy the API with migration 036 (`automatic_updates_offer`) before the app. The new authenticated `POST /gmail/preferences/tracking/offer-seen` endpoint acknowledges actual automatic-offer exposure without changing consent. Repeated acknowledgments preserve the first timestamp.
2. Deploy the app after the API is available. Old clients may still request bundled automatic updates; new email-import entry points explicitly use a one-time import.
3. Fresh onboarding reset deletes/recreates import preferences, clearing offer exposure. Existing grants, declines, revocations, devices, receipts, jobs, and provider request state are not migrated into a new consent model.

## Changed behavior

- Initial and repeat inbox selection explain which delivery-receipt inbox to use, offer Gmail and Outlook equally, and retain a history-download alternative and a quiet “Not sure?” hint.
- Email start attempts check for existing accepted work first. Lost responses retain an account-scoped idempotency key under the existing import-journey reset boundary.
- Useful coverage is separate from a completed scan. One useful source is enough; another provider is optional. New export requests stay visible over older coverage.
- Waiting pages save the user's reported progress, permit immediate exit, and explain ready-email monitoring on the page. Connecting an inbox does not automatically enroll monitoring: the user reviews the address and presses Notify me.
- Device notification permission/registration has a shared query owner. Notify me enables the app-wide device setting; mailbox monitoring and receipt tracking still have separate consent. Denial and registration failures have inline recovery.
- Upload selection remains in the existing session owner. Acceptance separates foreground upload/submission from resumable durable processing. Result pages preserve unknown counts and unresolved records; failed mixed-mailbox jobs retain per-inbox outcomes without changing retry semantics.
- Completion and first-recap exit offer automatic updates once. Explicit settings access can reopen the choice. The recap no longer stacks the detailed-history upsell; Home keeps additional history in a quiet footer.

## Device walkthroughs

Run with Gmail and Outlook separately, then both connected. Use test delivery accounts and a fresh SnackTrack account for the first-import cases.

| Walkthrough | Expected result |
| --- | --- |
| Small screen and maximum text size | Source options, connected address, disclosure, consent explanation, and actions remain readable and scrollable. Buttons do not rely on a fixed screen height. |
| VoiceOver / TalkBack | Read titles, connected address, selected-file name, progress status, outcome counts and recovery action in order. Icons are supplementary. No hidden completion popup interrupts the result. |
| Reduced motion | Import progress and recap respect the existing reduced-motion behavior. Continue/leave actions remain usable. |
| Correct receipt inbox | Confirm the address, import once, inspect results, then watch or skip the recap. Receive one optional automatic-updates offer. |
| Wrong, uncertain or unsupported inbox | Read the hint; use another inbox or choose a history download. A scan returning zero supported orders does not say the connection failed or promise a recap. |
| OAuth cancellation / denied scopes / expired access / temporary outage | Preserve saved history and request progress; offer the appropriate connection recovery. Return to the originating import/settings journey, with no consent granted by OAuth alone. |
| Export request then leave | Confirm what was submitted, see “Your place is saved,” and leave immediately. Returning resumes that request; another source and existing history remain accessible. |
| Decline ready alerts | The optional card stays dismissed for this request. A new request can offer alerts again; Settings still exposes explicit control. |
| Notify me, permission granted | Skip the OS prompt if already allowed; repair missing registration. Notifications show on in Settings. Automatic receipt imports remain unchanged. |
| Notification denial / registration error | Show inline Open device settings or retry. Leaving/importing still works. Return from Settings refreshes permission and registration state. Turning off monitoring does not disable app notifications. |
| Unsupported device | Hide notification enable actions. Saved monitoring remains visible and independently revocable. Manual export use remains available. |
| Ready email / browser return | Returning alone does not mark a file downloaded. Confirm the completed step or choose the actual downloaded file. Expired links can return to request steps. |
| Native file picker / help / back | Cancel selection safely. A selected file survives help/back within the session. After restart or lost file access, reselect the original file with an explanation. |
| Invalid, oversized or wrong-provider file | Keep validation and actionable error recovery. Corrupt/encrypted archives can route to a fresh export; file selection remains explicit. |
| Overlapping, duplicate-only, unresolved and mixed results | Existing orders are matched, duplicate-only is distinct from empty, unresolved records are not promised in totals, and each failed inbox is identified while successful work remains accessible. |
| Upload interruption / lost start or submit response | Keep the app open until acceptance. Reconcile saved operations before retrying; do not create a duplicate import or call unknown status complete/failed. |
| Queued/running/retrying accepted work | Gmail/Outlook show Continue using SnackTrack. Export processing keeps the results-focused screen without that action; durable resume after interruption remains available. |
| Restart / offline / superseded operation | Load authoritative status; keep unknown status explicit. Resume accepted work and use recovery rather than replaying an obsolete job. |
| Automatic updates | Check eligible, disconnected, reconnect, loading, unavailable, setting-up, active, declined/revoked, failed check and uncertain save. Saved consent is distinct from accepted work and active tracking. |
| Recap replay and setup reset | Replays do not repeat the automatic pitch. Explicit Settings can reopen it. Fresh onboarding reset clears exposure and pending import-journey keys. |
| Notification tap / background completion | Test while on unrelated screens and while selecting/uploading a file. Existing route guards prevent background events from interrupting critical work; explicit taps lead to the relevant saved operation. |

## Verification

Required checks: app `npm run type-check`; API `npm run build`.
Focused regression coverage was added/updated for offer gating, empty/useful coverage, provider parity, newer requests, operation precedence, partial results, shared notification enrollment, request-scoped dismissal, lost start responses, idempotent acknowledgment and reset clearing.
Test suites and device/emulator walkthroughs were not executed by the agent, per repository guidance and the implementation request. Existing upload, OAuth, notification-navigation and durable-operation suites remain relevant regression coverage.

## Import UX refinement walkthrough

- Choose a valid Uber Eats or DoorDash file: validation leads straight into upload, without a review/confirmation page. Canceling or choosing an invalid file must not submit. Offline, blocked, or failed submission retains the file for explicit retry.
- Open each provider’s request guide: the first instruction and contextual help identify the website/browser. Both confirmation pages use “What success looks like” and a confirmation-email subject; DoorDash uses “We got your data archive request”. Neither claims the download is ready.
- Close or finish a recap: the existing page transition goes to Home without flashing Summary. Check Android back too. Eligible first-import exits retain the automatic-updates offer, returning Home afterward. Replay exits do not pitch again.
- Check the recap exit with reduced motion and reopen Summary afterward. Check both request confirmations on narrow screens and at large text sizes; the longer DoorDash subject should wrap within the scrollable page.
