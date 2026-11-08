import type { ImportPreferencesResponse, MailboxProvider } from './contracts';

export function hasMailboxBaseline(preferences: ImportPreferencesResponse, mailbox: MailboxProvider): boolean {
  return (mailbox === 'gmail' ? preferences.gmailBaseline : preferences.outlookBaseline).hasCompleted;
}

export function emailUpdatesPresentation(preferences: ImportPreferencesResponse | null) {
  return {
    automaticUpdates: false,
    label: 'Import my receipts',
    description: preferences?.ongoingTracking.consentState === 'granted'
      ? 'Import receipts from this inbox. Your existing automatic-update setting stays saved.'
      : 'Import receipts from this inbox once. You can choose automatic updates after importing.',
  };
}
