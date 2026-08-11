# Export-Ready Upload Handoff Plan

## Objective

Turn Uber's `file_ready` state into a guided handoff that distinguishes between:

1. Uber has made the archive available;
2. the user has opened the delivery email;
3. the user reports that the archive is downloaded; and
4. SnackTrack has actually received and processed a selected file.

SnackTrack must never imply that opening Gmail proves the archive was downloaded.

## Target Flow

1. SnackTrack detects Uber's matching data-ready email and records `file_ready`.
2. The ready modal asks whether the user has already downloaded the archive.
3. **Open Gmail** opens the Gmail app when possible, with a Gmail web search as fallback.
4. When the user returns, SnackTrack asks whether the download succeeded.
5. **Choose the file** opens Import with the upload control visible.
6. **Not yet** returns to a persistent ready card without losing `file_ready`.
7. **Already downloaded** skips directly to the upload control.

The confirmed Uber email currently uses:

- sender: **Uber – Download Your Data** (`noreply@uber.com`);
- subject: **Your Uber data is ready for download**;
- action: **Go to Download Page**; and
- a seven-day download window.

The downloaded choice is user-reported device state, stored locally and scoped to the current server `file_ready` update. A later export-ready event starts a fresh handoff.

## Implementation Checklist

- [x] Define the UX states and truthful product language.
- [x] Add version-scoped local handoff state for `not_downloaded`, `checking_email`, and `downloaded`.
- [x] Add Gmail-app launch with a browser-search fallback.
- [x] Update the ready notification with **Open Gmail**, **Already Downloaded**, and **Later** actions.
- [x] Show the confirmed sender, subject, in-email action, and seven-day expiry wherever users need to identify the message.
- [x] Ask whether downloading succeeded when the user returns from Gmail.
- [x] Replace the immediate uploader in `file_ready` with a download decision card.
- [x] Reveal the file picker only after the user reports that the file is downloaded.
- [x] Open the native file picker automatically after **Choose the File** finishes navigating to Import.
- [x] Consume picker requests once so rerenders cannot reopen the system picker.
- [x] Keep email/download help available beside the revealed uploader.
- [x] Preserve the existing `file_ready`, `import_processing`, `completed`, and `failed` server lifecycle states.
- [x] Add focused persistence and notification-action tests.
- [ ] Complete device-level UI QA for the decision card and return-from-Gmail prompt.
- [x] Pass TypeScript, lint, theme, and focused test checks.

## Edge Cases

- [x] Gmail app is unavailable: open Gmail's web search for the known Uber email.
- [x] Both Gmail app and web launch fail: show the standard error modal with the search phrase.
- [x] User opens Gmail but does not download: keep `file_ready` and the download card.
- [x] User downloads on another device: explain that the ZIP must be transferred to this device.
- [x] User cannot find the file: point them to Files/iCloud Drive/Google Drive and recommend the original ZIP.
- [x] User cancels the file picker: keep the upload control available without changing server state.
- [x] User selects an invalid or oversized file: preserve the existing recoverable validation flow.
- [x] A new export becomes ready later: ignore locally stored choices from the older ready event.
- [x] Import completes: let the server's `completed` state supersede all local handoff state.

## Deferred

- Opening the exact Gmail message. The API currently detects readiness without retaining a Gmail message ID, and exact-message deep links are not portable across email clients.
- Remote push notifications while SnackTrack is closed.
- Verifying device downloads. Mobile platforms do not provide a trustworthy cross-app signal that proves Uber's archive was downloaded.
- Detecting expired Uber download links automatically.
