import { isActiveImportOperation, type ImportOperation, type ImportPreferencesResponse, type MailboxProvider } from './contracts';
import type { ProviderJourneyState } from './importJourneyState';

export interface ImportSourcePresentation {
  status: string;
  tone: 'complete' | 'optional' | 'warning' | 'error';
  body: string;
  actionLabel?: string;
}

export function resolveEmailSources(preferences: ImportPreferencesResponse | null, operation: ImportOperation | null) {
  const mailboxes: MailboxProvider[] = ['gmail', 'outlook'];
  const sources = mailboxes.map(mailbox => {
    const baseline = mailbox === 'gmail' ? preferences?.gmailBaseline : preferences?.outlookBaseline;
    const connection = mailbox === 'gmail' ? preferences?.gmailConnection : preferences?.outlookConnection;
    const active = operation?.kind === `${mailbox}_historical` && isActiveImportOperation(operation);
    const importing = active || baseline?.latestAttempt.status === 'importing';
    const completed = baseline?.hasCompleted ?? false;
    const reconnect = connection?.needsReconnect || connection?.connectionHealth === 'reconnect_required';
    const unavailable = connection?.connectionHealth === 'unavailable';
    const failed = baseline?.latestAttempt.status === 'failed';
    let presentation: ImportSourcePresentation;
    if (importing) presentation = { status: 'Importing…', tone: 'warning', body: 'Finding and saving your email receipts.', actionLabel: active ? 'View progress' : 'Check import status' };
    else if (reconnect) presentation = { status: 'Reconnect', tone: 'warning', body: completed ? 'Your saved receipts are safe. Reconnect to add more.' : 'Reconnect your inbox to import receipts.', actionLabel: 'Reconnect inbox' };
    else if (unavailable) presentation = { status: 'Unavailable', tone: 'warning', body: completed ? 'Your saved receipts are safe. Inbox access is temporarily unavailable.' : 'Inbox access is temporarily unavailable.', actionLabel: 'Check connection' };
    else if (failed) presentation = { status: 'Needs attention', tone: 'error', body: completed ? 'Your latest import failed. Previously saved receipts are safe.' : 'Your email import needs another try.', actionLabel: 'Try again' };
    else if (completed) presentation = { status: 'Imported', tone: 'complete', body: 'Your email receipt import is complete.' };
    else if (connection?.connected) presentation = { status: 'Ready to import', tone: 'optional', body: 'Your inbox is connected. Find your order receipts.', actionLabel: 'Import receipts' };
    else presentation = { status: 'Not connected', tone: 'optional', body: 'Add order receipts from your inbox.', actionLabel: 'Connect inbox' };
    return { mailbox, completed, active, presentation,
      // Keep one existing inbox visible; active work takes precedence over past imports.
      priority: importing ? 4 : completed ? 3 : connection?.connected || reconnect || unavailable ? 2 : failed ? 1 : 0,
      completedAt: baseline?.completedAt ?? '',
    };
  });
  const existing = sources.filter(source => source.priority > 0)
    .sort((a, b) => b.priority - a.priority || b.completedAt.localeCompare(a.completedAt));
  return existing.length ? [existing[0]] : sources;
}

export interface DownloadSourcePresentation extends ImportSourcePresentation {
  action?: 'operation';
}

export function resolveDownloadSource(
  provider: ProviderJourneyState,
  pendingRequest: boolean,
  coverageDates: string,
  operation: ImportOperation | null = null,
): DownloadSourcePresentation {
  // An accepted upload can precede the lifecycle update. Never apply another
  // provider's operation (or a mailbox/ready-email check) to this row.
  if (operation?.kind === 'export_file' && operation.provider === provider.provider && isActiveImportOperation(operation)) {
    if (operation.status === 'awaiting_upload') return { status: 'Upload unfinished', tone: 'warning', body: 'Your file has not been submitted yet.', actionLabel: 'Resume upload', action: 'operation' };
    if (operation.status === 'pending_dispatch' || operation.status === 'queued') return { status: 'Queued', tone: 'warning', body: 'Your file is submitted and waiting to be processed.', actionLabel: 'View progress', action: 'operation' };
    return { status: operation.status === 'retrying' ? 'Retrying…' : 'Importing…', tone: 'warning', body: 'Your uploaded history is being processed.', actionLabel: 'View progress', action: 'operation' };
  }
  if (pendingRequest) return { status: 'Confirm request', tone: 'warning', body: 'Confirm whether you submitted your request.', actionLabel: 'Confirm request' };
  switch (provider.status) {
    case 'requested': return { status: 'Waiting for email', tone: 'warning', body: 'Your request is in. Your file is being prepared.', actionLabel: 'View next steps' };
    case 'file_ready': return { status: 'Download ready', tone: 'warning', body: 'Your history download is ready.', actionLabel: 'Download your file' };
    case 'import_processing': return { status: 'Importing…', tone: 'warning', body: 'Your uploaded history is being processed.', actionLabel: 'Check import status' };
    case 'failed': return { status: 'Needs attention', tone: 'error', body: 'Your history import needs another try.', actionLabel: 'Try again' };
  }
  return provider.imported
    ? { status: 'Imported', tone: 'complete', body: `${provider.receiptCount} ${provider.receiptCount === 1 ? 'order' : 'orders'}${coverageDates}`, actionLabel: 'Add newer history' }
    : { status: 'Optional', tone: 'optional', body: '', actionLabel: `Complete ${provider.name} history` };
}
