# SnackTrack user experience review and fix plan

Reviewed November 8, 2026. Scope: the consumer mobile app, from account creation through onboarding, adding orders, import recovery, Home, History, Summary, automatic updates, and account settings. This is a source-based review plus the supplied onboarding screenshot, not a completed device usability study. Admin workflows and external provider websites are outside this review. The initial review was planning-only. See the implementation update below for the subsequent UI changes.

The main problem is that SnackTrack often names its data pipeline before explaining the user's task. People understand Uber Eats orders, email receipts, and spending; they should not have to understand exports, baselines, coverage, or reconciliation to get started. A second problem is that some action labels do not match the next screen or available control.

## Recommended first screen

Keep email as the main route, with a clearly named alternative. Avoid a wholesale onboarding redesign before testing these changes.

- Heading: **Find your delivery orders**
- Body: **Connect the inbox where you receive Uber Eats or DoorDash receipts.**
- Choices: **Gmail** and **Outlook**, with neither selected by default.
- Helper beside the choices: **This can be different from your SnackTrack sign-in email.**
- Primary action after selection: **Connect Gmail** or **Connect Outlook**.
- Alternative: **Use another method**.
- Next screen: **Add orders using a downloaded file**, followed by the request → download → upload explanation and Uber Eats/DoorDash choices. Keep file-specific helper text off the initial email-choice screen.
- Help: **Not sure which email to use?**
- Quiet exit: **Set up later**, provided it lands on a useful empty Home and retains a clear Add orders action.

Do not use **Import directly from Uber** for the current implementation. SnackTrack guides a request, download, and upload; it does not currently fetch the archive directly from an Uber account. Use **Add Uber Eats orders** after choosing the provider, then explain the file process.

The current source starts with no inbox selected; the screenshot shows Gmail selected. Do not treat the screenshot as evidence of a default-selection bug.

## Findings and proposed fixes

P1 means address in the first implementation batches because it affects starting, completing, or trusting a core task. P2 means improve in the subsequent consistency pass. Each source path below is relative to SnackTrackApp.

### 1. The alternative import method is incomprehensible at first contact — P1

**Evidence:** `components/import/ReceiptInboxChoice.tsx:43` says “Import a history download.” `ReceiptInboxGuidance.tsx:13` repeats “use a history download” to explain the alternative. `components/OnboardingScreen.tsx:16` introduces “delivery-history download” before the user has learned the process. `app/settings/help-privacy.tsx:24` repeats “provider history download.”

**Fix:** Apply the first-screen copy above to onboarding and returning-user email choice. On the next screen, offer Uber Eats and DoorDash. Explain “Request your order history → download the file when it’s ready → upload it here.” Reserve ZIP and export terminology for the file instructions where it is necessary. Rewrite Help using the same language.

**Acceptance:** A new user can explain the alternative and predict its next step without expanding help. Gmail, Outlook, Uber Eats, and DoorDash remain available without implying a direct provider integration.

### 2. The email choice explains the wrong next decision — P1

**Evidence:** `ReceiptInboxChoice.tsx:41` says “Choose your receipt inbox on the next step” while already asking which inbox receives receipts. Its body says “Choose the email,” but the choices are email services. The connected review in `ImportSetupJourney.tsx` does not pass the available change-account action to `EmailJourneyHeading`; the returning-user screen does.

**Fix:** Distinguish selecting a service, choosing an actual account during authorization, and starting the import. If needed, say “Next, choose your Gmail account and review access.” Show the connected address and a **Use another account** action before **Find my orders**, including initial onboarding. Keep mailbox authorization separate from SnackTrack sign-in.

**Acceptance:** Someone who signs into SnackTrack with one address can connect a different receipt address, identify a mistaken connection, and correct it before scanning.

### 3. The file route overpromises completeness before disclosing effort — P1

**Evidence:** `components/upload/ImportSetupJourney.tsx` promises “complete history” and “Full available history, including recent orders and more detail.” The waiting-time explanation appears later in `PostOnboardingImportScreen.tsx`, using `providerPreparationCopy` from `features/import-flow/importNavigation.ts`.

**Fix:** Use “Add orders and details that email may miss.” Explain the request/download/upload process before opening the provider site. Say that the provider prepares the file and emails a link; show provider-specific preparation guidance at that decision point. Do not promise all orders, all item details, or an immediate result. Verify provider timing and instructions against official provider sources during implementation before changing factual claims.

**Acceptance:** Users know whether they need to wait and what they must do next before leaving SnackTrack. Existing-file users can go directly to **Upload downloaded file**.

### 4. Setup stages and the escape route are unclear — P2

**Evidence:** The screenshot exposes Back but no explicit defer action. `ImportSetupJourney.tsx` displays `Progress step={2}` for multiple distinct branches, with an accessibility label of “Step 2 of 3.” The first inbox-choice screen has no corresponding progress indicator.

**Fix:** Add an explicit **Set up later** route if product onboarding permits exploration without data. Replace the generic three-step meter with meaningful stage names appropriate to the chosen path, or remove it. File requests can involve a long wait and should not look like one short form.

**Acceptance:** Back, defer, OAuth cancellation, and relaunch have defined destinations. Progress labels describe the current task rather than implying a fixed number of taps remains.

### 5. “View order history” may open a permission offer instead — P1

**Evidence:** In `components/import/ImportResultScreen.tsx`, `finish(destination)` replaces the destination with `/ongoing-updates` when `shouldOfferAutomaticUpdates` is true. Both **View order history** and the close control use this function. The offer route does not carry the requested History destination in that call.

**Fix:** Honor explicit destination labels. Offer automatic updates in a nonblocking result section or after the user reaches their destination. If an interstitial is retained, preserve the destination and make **Not now** continue there. Closing a result should not unexpectedly begin another setup journey.

**Acceptance:** View order history opens History; Close returns to the origin. Automatic updates remain optional, are not repeatedly pitched, and are never enabled by merely connecting email.

### 6. Connected users can lose access to Disconnect — P1

**Evidence:** `app/settings/accounts-permissions.tsx:45` and `:47` show **Set up imports** instead of **Disconnect** for connected inboxes without a completed baseline. Reconnect and unavailable states also consume the only account-row action.

**Fix:** Separate connection status, import action, and access removal. A connected account should always expose **Disconnect**, including before its first import and when access needs repair. Explain that disconnecting stops mailbox access while retaining saved orders. Check the existing server disconnect behavior before changing which states can invoke it.

**Acceptance:** Users who authorized the wrong account or changed their mind can revoke access without first importing. Gmail and Outlook behave consistently.

### 7. Currency preferences promise behavior the display does not consistently provide — P1

**Evidence:** `app/settings/currency.tsx:30` promises “Choose another currency to override it.” The picker lists eight currencies from `utils/currency.ts`. `features/wrapped/recapCurrency.ts` recognizes only CAD, USD, EUR, and GBP. `utils/receiptMoney.ts` preserves explicit receipt currency, does not convert amounts, and labels other currencies unknown. Home and receipt rows call that formatter.

**Fix:** Decide and document one supported behavior before editing copy. Recommended immediate direction: preserve actual order currencies; do not imply currency conversion. Limit or reframe the preference to its real scope, align supported options across screens, and make a failed save visible. Treat actual exchange-rate conversion as separate work requiring a defined rate/date policy.

**Acceptance:** Every selectable option has a meaningful, consistent effect. A CAD order never becomes a USD amount through a symbol-only change. History, Home, Summary, and recap explain mixed or unsupported currencies consistently. This finding is about observed frontend inconsistencies, not a claim that backend totals have been audited.

### 8. Zero-result imports give generic advice instead of a specific next step — P1

**Evidence:** `features/import-flow/importOperationResult.ts` says “No supported orders found” and suggests “another inbox or an original provider download.” The result screen primarily offers **Add more history**, returning the user to a broad choice.

**Fix:** For mailbox imports, say **No Uber Eats or DoorDash orders found in this inbox** when those are the supported services. Offer **Try another inbox** and **Add orders from Uber Eats or DoorDash**. For file imports, explain the relevant file outcome. Keep zero results, already-saved orders, unknown counts, unresolved records, and actual failure distinct.

**Acceptance:** A wrong-inbox user can recover directly. A duplicate-only import does not look like a failure, and unknown counts are never displayed as zero.

### 9. Import status language differs across surfaces — P2

**Evidence:** `ImportProgressScreen.tsx:46` explicitly distinguishes **Waiting to start**, while `ImportOperationCard.tsx` describes most active states as “in progress” and “building your order history.” The card and `ImportResultScreen.tsx` can display `operation.errorMessage` directly. The progress presentation also uses a generic 2–3-minute estimate for first email imports.

**Fix:** Use one shared presentation mapping for waiting, uploading, processing, retrying, completed, and failed states. Show friendly recovery text based on error codes, with technical details available to support rather than the main body. Use timing only where grounded in actual duration data; otherwise use stage text. Do not claim accepted work is already processing.

**Acceptance:** Home and the detailed progress screen agree for the same operation. Unknown status prompts a status refresh rather than a duplicate import. Existing automatic-retry behavior remains intact.

### 10. Ready alerts use implementation language and two different capability descriptions — P2

**Evidence:** `PostOnboardingImportScreen.tsx` says “provider’s ready email” and “download the archive.” `accounts-permissions.tsx` has a legacy **Uber ready-email checks** branch describing checks while open and provider-specific alert rows describing checks while closed. These are capability-dependent branches, not evidence by themselves of a runtime contradiction.

**Fix:** Lead with **Notify me when my Uber Eats download is ready** (or DoorDash). Explain exactly what this permission checks, whether it works while the app is closed, and that the user still downloads the file. Derive that explanation from the active capability; keep device notifications, download alerts, and automatic receipt updates independently understandable and revocable.

**Acceptance:** Every capability branch accurately describes its behavior. Declining notifications or download alerts does not block manual importing or grant receipt monitoring.

### 11. Home and History expose internal analytical language — P2

**Evidence:** Home uses “Nothing to inspect yet” and “We need a little more evidence” in `app/(tabs)/index.tsx:325`. `dashboardTrackingState.ts` includes **Explore history exports**. `receiptOutcomePresentation.ts` uses “Email and export combined,” “Sources disagree,” and “net cost”; `ReceiptHistoryFilters.tsx` explains “receipt evidence” and unmatched records.

**Fix:** Use **Add orders to see your spending**, **Add more orders to reveal patterns**, and **Add orders from a delivery app**. In History, say **Combined from email and your downloaded file**, **The saved records show different amounts**, and **Total after confirmed refunds** where accurate. Put technical provenance behind a short explanation, while leaving uncertainty and exclusions visible beside affected amounts.

**Acceptance:** People can understand why a total is estimated or excluded without knowing reconciliation terminology. Preserve the existing distinctions between delivered, canceled, refunded, possible orders, and unmatched adjustments.

### 12. Account and help copy is repetitive or inconsistent — P2

**Evidence:** `LoginScreen.tsx` repeats the separate-login/inbox explanation and shows “You’ll choose that email after signup” even in the shared sign-in panel. Its fallback action says **Use Google, Apple, or Microsoft instead** regardless of which providers are available. `useProfileController.ts` confirms **Reset Imported Data** but reports **Receipts Cleared**; deletion uses two generic warning dialogs.

**Fix:** Tailor sign-in versus sign-up text, describe the available sign-in choices accurately, and explain login versus receipt access once at each relevant decision. Standardize **Reset imported data** in the row, confirmation, pending state, and success message. Keep the explicit list of what reset removes and what remains. Review whether one specific deletion confirmation can replace two generic ones without changing deletion authorization requirements.

**Acceptance:** Reset and delete are clearly different actions. Reset preserves login while removing imports and connections; account deletion removes the account. Any implementation touching these flows must follow the account-data-lifecycle skill and verify the actual server contract rather than infer it from labels.

## Preserve what already works

- The warm visual style, grouped service choices, readable primary action, and receipt-holding mascot in the supplied screen. The primary issue is comprehension and sequencing, not a need for a new visual identity.
- Explicit consent for ongoing email access, distinct from sign-in and one-time import.
- Provider-specific request resumption, expired-link help, file-finding help, and the ability to bring an already downloaded file.
- Import results that distinguish new, updated, already-saved, and unresolved orders.
- History search, filter clearing, explanatory money labels, and drill-through from dashboard insights.
- Reduced-motion handling and navigation guards that prevent asynchronous work from interrupting unrelated tasks.
- The current separation of Summary from its optional shareable recap. `WrappedUpsellFinale.tsx` contains old “Data & tracking” wording but is not imported by the current recap; do not count that unused component as a live user-facing defect. Treat obsolete copy cleanup separately from shipped-flow fixes.

## Implementation order

### Batch 1 — Make starting understandable

Implement findings 1–3 and the sign-in wording portion of 12. Establish a small shared vocabulary for repeated import concepts without centralizing every unrelated string. Update both initial and returning import entry points together. Preserve the separate authorization and explicit import-start actions. Add **Use another account** to onboarding review.

Primary owners: `ReceiptInboxChoice`, `ReceiptInboxGuidance`, `OnboardingScreen`, `ImportSetupJourney`, `EmailJourneyHeading`, `PostOnboardingImportScreen`, `LoginScreen`, and Help.

### Batch 2 — Make actions honor user intent

Implement findings 5, 6, and 8; make the defer/stage decision in finding 4. Keep navigation in `features/navigation`, state decisions in import resolvers/controllers, and existing operation/idempotency ownership intact. Do not combine this with a backend import rewrite.

Primary owners: `ImportResultScreen`, `importOperationResult`, `ongoingUpdatesState`, `accounts-permissions`, `useImportFlowController`, `usePostOnboardingImportController`, and navigation policy.

### Batch 3 — Resolve currency behavior

Treat finding 7 as a dedicated trust issue, not a copy-only patch. Trace each selected currency through settings, analytics, receipt display, Summary, recap, and sharing. Establish supported behavior, then align the setting and displays. If API changes are required, inspect backend ownership and skills before implementation.

### Batch 4 — Align the rest of the app

Implement findings 9–12 and audit related notification text, reconnect messages, Help, and reset confirmations with the same vocabulary. Derive status copy from authoritative state, including separate foreground-only and background-capable alert modes. Keep technical error details out of normal calls to action.

## Verification and release criteria

For implementation, add focused regression coverage at the changed resolver or navigation boundary; run the repository-required `npm run type-check`. Run test suites only when explicitly requested under the current repository policy. This planning-only change requires no application build or test run.

Device walkthroughs belong to the user unless explicitly requested. Check narrow screens, large text, light/dark mode, VoiceOver/TalkBack, reduced motion, and the native browser/file-picker return paths. The screenshot's large gap between choices and actions is a layout-review candidate, not proof of a defect on every screen size. Keep the explanation close to the choice; let content scroll at large text sizes rather than fixing controls to screenshot coordinates.

Required journey matrix:

| Scenario | Required outcome |
| --- | --- |
| Fresh user with Gmail or Outlook | Understand service selection; authorize the intended address; explicitly start one import |
| Wrong inbox or unsupported email service | Change account or reach the provider-file route without jargon or a dead end |
| OAuth cancelled, access expired, service unavailable | Distinct recovery, preserved progress, no false zero-result success |
| Uber Eats only, DoorDash only, both, existing file | Correct provider steps, no forced second source, direct existing-file path |
| Request pending, ready, expired link, missing file | Clear next action and safe leave/resume |
| Upload interrupted, queued, retrying, status unknown | No duplicate operation; status matches Home; foreground transfer and accepted background work stay distinct |
| Import empty, duplicate-only, partial, unresolved, failed | Accurate result with a specific recovery action |
| View History or close result before updates offer | Requested destination honored; optional offer cannot trap or redirect unexpectedly |
| Connected but never imported; reconnect needed | Disconnect remains available; saved orders remain |
| Automatic updates or alerts declined/revoked | Manual usage remains available; permissions remain independent |
| Each selectable currency and mixed-currency history | Consistent scope and labeling; no implied conversion or unsupported selection |
| Empty Home, filtered History, Summary and recap replay | Clear empty states; filter recovery; replay does not repeat onboarding pitches |
| Reset imported data versus delete account | Specific consequences, accurate success copy, correct destination |

Evaluate comprehension with a small first-time-user walkthrough: before each action, ask what they expect to happen; after choosing the file route, ask who prepares the file and where it goes next. Success means users understand the task without the reviewer explaining “export” or “history download.”

Use existing analytics where possible to compare source selection → authorization → import start → first useful result, zero-result recovery, return from provider request, and repeated backtracking. Separate deliberate **Set up later** and optional-permission declines from errors. Establish a baseline before setting numerical improvement targets; never record mailbox addresses, receipt content, or file names merely to evaluate copy.


## UI implementation update

The UI pass implements the main changes from findings 1–3 and 5–12, and removes the misleading fixed setup progress indicator from finding 4.

- Initial and returning import screens now explain email versus the guided Uber Eats/DoorDash file route. Requesting, waiting, downloading, and uploading are explained before the external handoff. No direct provider integration or complete-history promise is implied.
- The initial connected-email review now offers Use another account. Service selection remains a separate action from account authorization and import start.
- Import result History and Close actions honor their destinations. Automatic updates appear as an optional Review automatic updates action; the existing separate consent screen remains authoritative.
- Empty mailbox imports offer another inbox or the delivery-app route. Empty files offer another file. Existing unknown, unchanged, unresolved, and partial-result distinctions remain.
- Waiting/retry stage labels are shared between the progress screen and operation cards. Friendly error-code-based recovery replaces raw operation error messages on result/card surfaces. Removed unsupported fixed timing language from the older progress presentation.
- Gmail and Outlook Disconnect controls are separate from Find orders/Reconnect/Reload, including before any completed import. Existing disconnect commands and confirmation behavior are reused.
- Download alerts explain whether they work while the app is open or closed and distinguish them from automatic receipt imports.
- Currency is labeled Recap currency. Further tracing confirmed that the API already provides approximate recap conversion for CAD, USD, EUR, and GBP. The picker is limited to these supported values and describes its scope; recorded order currencies and Home/Summary behavior are preserved. Save failures now show a standard alert.
- Home, History, Help, login, and receipt detail language describes user tasks and outcomes. Refund uncertainty and exclusions remain visible.
- Reset imported data uses consistent action/result wording. Account deletion has one explicit consequence-based confirmation with Keep my account and Delete my account actions, calling the existing deletion handler.

Set up later remains unimplemented: cold-launch routing currently derives required setup from the authoritative experience state, independently of the older setup-deferral preference. A complete deferral change must reconcile those owners and verify restart behavior; a UI-only exit would not deliver the proposed persistent behavior. Existing Back navigation remains.

Visual changes preserve the approved mascot, surfaces, typography, and action styling. Removing the repeated Step 2 of 3 indicator is intentional because it did not describe the branching journey. No simulator/device rendering was performed.

Regression coverage was added/updated for explicit result destinations despite offer eligibility, empty-mailbox recovery routes, disconnect access before import and during connection trouble, waiting/retry state precedence, expiry recovery, and every selectable recap currency. Tests were not executed under the repository's default verification policy. Run the app TypeScript check for this implementation and use the journey matrix above for the user-owned device walkthrough.

### First import notification and rotating preview

The first accepted import now follows the approved notification mockup: a larger centered thinking mascot, compact progress and benefit preview, and a primary Notify me when ready action instead of Continue using SnackTrack. Foreground file transfer still requires keeping the app open until acceptance. Returning users retain their existing email-import continuation action.

Notification enrollment reuses the shared device-notification owner. Permission denial exposes device settings; registration failure exposes retry; confirmed registration shows We’ll notify you when ready. Unsupported devices explain that notifications are unavailable. This does not grant automatic email-import consent or navigate away from progress. First-import presentation is retained for the operation as newly saved orders change the account’s receipt count.

The benefit row begins with A clearer picture of your spending and cycles through favorite spots, late-night habits, and delivery personality every six seconds. It supports manual advancement and pause/resume. Automatic cycling stops when unfocused, when the app is inactive, with reduced motion, with a screen reader enabled, or at completion. The progress view now consumes the shared motion context instead of maintaining a second reduced-motion subscription.

Verification: app TypeScript and diff whitespace checks passed. Regression coverage was added for first/returning import classification, foreground-upload boundaries, notification consent and recovery, and preview cycling/pause/accessibility states. Test suites were not run under repository policy. Device handoff: check a first Gmail/Outlook and file import, notification approval/denial/registration failure on a physical device, background return, six-second preview cycling and pause, large text, reduced motion, and VoiceOver/TalkBack.
