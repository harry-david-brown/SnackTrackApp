import type { ExportProvider, MailboxProvider } from './contracts';
import type { GmailConnectionPurpose } from './gmailConnectionPurpose';
import type { ImportReturnTo } from './importNavigation';

/** A complete user intent, independent of card copy and router implementation. */
export type ImportEntryAction = { returnTo: ImportReturnTo } & (
  | { kind: 'choose'; source: 'any' | 'email' | 'export'; purpose?: GmailConnectionPurpose }
  | { kind: 'export'; provider: ExportProvider; intent: 'request' | 'resume' }
  | { kind: 'mailbox'; mailbox: MailboxProvider; action: 'retry' | 'reconnect' }
  | { kind: 'reconnect' }
  | { kind: 'ongoing_updates' }
  | { kind: 'operation'; operationId: string }
);
