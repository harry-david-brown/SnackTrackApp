import type { ImportPreferencesResponse, MailboxProvider } from './contracts';

export function hasMailboxBaseline(preferences: ImportPreferencesResponse, mailbox: MailboxProvider): boolean {
  return (mailbox === 'gmail' ? preferences.gmailBaseline : preferences.outlookBaseline).hasCompleted;
}

export function emailUpdatesPresentation(preferences: ImportPreferencesResponse | null) {
  const consent = preferences?.ongoingTracking.consentState;
  const optedOut = consent === 'declined' || consent === 'revoked';
  const automaticUpdates = consent === 'not_offered';
  return {
    automaticUpdates,
    label: automaticUpdates ? 'Import & enable automatic updates' : 'Import my receipts',
    description: optedOut
      ? 'Automatic updates are off. Your choice stays saved; you can turn them on anytime in Settings.'
      : automaticUpdates
        ? 'Import your delivery receipts and automatically add new ones. You can turn this off anytime in Settings.'
        : 'Automatic updates are enabled. SnackTrack will keep checking for new receipts when your connection is healthy.',
  };
}
