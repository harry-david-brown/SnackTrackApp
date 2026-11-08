import { isActiveImportOperation, type ExportProvider, type ImportOperation, type ImportPreferencesResponse, type MailboxProvider } from './contracts';
import type { ImportReturnTo } from './importNavigation';
import { resolveExportOpportunity, resolveImportCoverage } from './importJourneyState';

export type ImportNextAction =
  | { kind: 'submitting'; returnTo: ImportReturnTo }
  | { kind: 'operation'; operation: ImportOperation; returnTo: ImportReturnTo }
  | { kind: 'export'; provider: ExportProvider; stage: 'file_ready' | 'failed' | 'requested' | 'import_processing'; returnTo: ImportReturnTo }
  | { kind: 'mailbox'; mailbox: MailboxProvider; action: 'reconnect' | 'retry'; returnTo: ImportReturnTo }
  | { kind: 'optional'; returnTo: ImportReturnTo };

/** Work and recovery take precedence; callers may always expose history and another source. */
export function resolveImportNextAction({ preferences, operation, submitting = false, returnTo = 'home' }: {
  preferences: ImportPreferencesResponse | null; operation?: ImportOperation | null;
  submitting?: boolean; returnTo?: ImportReturnTo;
}): ImportNextAction {
  if (submitting) return { kind: 'submitting', returnTo };
  if (operation && isActiveImportOperation(operation)) return { kind: 'operation', operation, returnTo };
  const opportunity = resolveExportOpportunity(resolveImportCoverage(preferences));
  if (opportunity && ['file_ready', 'failed', 'import_processing'].includes(opportunity.status)) {
    return { kind: 'export', provider: opportunity.provider, stage: opportunity.status as 'file_ready' | 'failed' | 'import_processing', returnTo };
  }
  for (const mailbox of ['gmail', 'outlook'] as const) {
    const baseline = mailbox === 'gmail' ? preferences?.gmailBaseline : preferences?.outlookBaseline;
    const connection = mailbox === 'gmail' ? preferences?.gmailConnection : preferences?.outlookConnection;
    if (baseline?.latestAttempt.status === 'failed') return { kind: 'mailbox', mailbox, action: connection?.needsReconnect ? 'reconnect' : 'retry', returnTo };
  }
  if (opportunity?.status === 'requested') return { kind: 'export', provider: opportunity.provider, stage: 'requested', returnTo };
  return { kind: 'optional', returnTo };
}
