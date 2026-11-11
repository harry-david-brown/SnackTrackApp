import { isActiveImportOperation, type ExportProvider, type ImportOperation, type ImportPreferencesResponse, type MailboxProvider } from './contracts';
import type { ImportEntryAction } from './importEntryAction';
import type { ImportReturnTo } from './importNavigation';
import { resolveExportOpportunity, resolveImportCoverage } from './importJourneyState';

export type ImportNextAction =
  | { kind: 'submitting'; returnTo: ImportReturnTo }
  | { kind: 'operation'; operation: ImportOperation; returnTo: ImportReturnTo }
  | { kind: 'export'; provider: ExportProvider; stage: 'file_ready' | 'failed' | 'requested' | 'import_processing'; returnTo: ImportReturnTo }
  | { kind: 'mailbox'; mailbox: MailboxProvider; action: 'reconnect' | 'retry'; returnTo: ImportReturnTo }
  | { kind: 'reconnect'; returnTo: ImportReturnTo }
  | { kind: 'tracking_error'; returnTo: ImportReturnTo }
  | { kind: 'mailbox_processing'; mailbox: MailboxProvider; returnTo: ImportReturnTo }
  | { kind: 'optional'; returnTo: ImportReturnTo };

/** Work and recovery take precedence; callers may always expose history and another source. */
export function resolveImportNextAction({ preferences, operation, submitting = false, returnTo = 'home' }: {
  preferences: ImportPreferencesResponse | null; operation?: ImportOperation | null;
  submitting?: boolean; returnTo?: ImportReturnTo;
}): ImportNextAction {
  if (submitting) return { kind: 'submitting', returnTo };
  if (operation && isActiveImportOperation(operation)) return { kind: 'operation', operation, returnTo };
  const opportunity = resolveExportOpportunity(resolveImportCoverage(preferences));
  if (opportunity && (opportunity.status === 'file_ready' || opportunity.status === 'failed')) {
    return { kind: 'export', provider: opportunity.provider, stage: opportunity.status, returnTo };
  }
  const mailboxes = (['gmail', 'outlook'] as const).map(mailbox => ({
    mailbox,
    baseline: mailbox === 'gmail' ? preferences?.gmailBaseline : preferences?.outlookBaseline,
    connection: mailbox === 'gmail' ? preferences?.gmailConnection : preferences?.outlookConnection,
  }));
  const reconnect = mailboxes.find(({ baseline, connection }) => connection?.needsReconnect
    || connection?.connectionHealth === 'reconnect_required'
    || baseline?.latestAttempt.errorCode === 'GMAIL_RECONNECT_REQUIRED'
    || baseline?.latestAttempt.errorCode === 'OUTLOOK_RECONNECT_REQUIRED');
  if (reconnect) return { kind: 'mailbox', mailbox: reconnect.mailbox, action: 'reconnect', returnTo };
  // Aggregate recovery can lack a provider: retain the inbox chooser instead of guessing Gmail.
  if (preferences?.ongoingTracking.effectiveState === 'reconnect_required'
    || preferences?.monitoring.effectiveState === 'reconnect_required') return { kind: 'reconnect', returnTo };
  const failed = mailboxes.find(({ baseline }) => baseline?.latestAttempt.status === 'failed');
  if (failed) return { kind: 'mailbox', mailbox: failed.mailbox, action: 'retry', returnTo };
  if (preferences?.ongoingTracking.effectiveState === 'error') return { kind: 'tracking_error', returnTo };
  if (opportunity?.status === 'import_processing') return { kind: 'export', provider: opportunity.provider, stage: 'import_processing', returnTo };
  const processing = mailboxes.find(({ baseline }) => baseline?.latestAttempt.status === 'importing');
  if (processing) return { kind: 'mailbox_processing', mailbox: processing.mailbox, returnTo };
  if (opportunity?.status === 'requested') return { kind: 'export', provider: opportunity.provider, stage: 'requested', returnTo };
  return { kind: 'optional', returnTo };
}

/** Passive and optional states have no automatic destination. */
export function importNextActionEntry(next: ImportNextAction): ImportEntryAction | null {
  const { returnTo } = next;
  switch (next.kind) {
    case 'operation': return { kind: 'operation', operationId: next.operation.id, returnTo };
    case 'export': return next.stage === 'import_processing' ? null : { kind: 'export', provider: next.provider, intent: 'resume', returnTo };
    case 'mailbox': return { kind: 'mailbox', mailbox: next.mailbox, action: next.action, returnTo };
    case 'reconnect': return { kind: 'reconnect', returnTo };
    case 'tracking_error': return { kind: 'ongoing_updates', returnTo };
    default: return null;
  }
}
