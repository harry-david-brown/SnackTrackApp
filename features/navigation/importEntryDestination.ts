import type { ImportEntryAction } from '@features/import-flow/importEntryAction';
import { addHistoryDestination, appDestinations, importProgressDestination, type AppDestination } from './appDestinations';

/** Resolve the selected intent without re-reading preferences or guessing a source. */
export function importEntryDestination(action: ImportEntryAction): AppDestination {
  const { returnTo } = action;
  switch (action.kind) {
    case 'operation': return importProgressDestination(action.operationId, returnTo);
    case 'ongoing_updates': return appDestinations.ongoingUpdates;
    case 'export': return addHistoryDestination({ intent: action.intent === 'resume' ? 'resume_export' : 'provider', provider: action.provider, returnTo });
    case 'mailbox': return addHistoryDestination({ intent: action.action === 'reconnect' ? 'reconnect' : 'email', mailbox: action.mailbox, gmailPurpose: action.action === 'reconnect' ? 'connection_recovery' : undefined, returnTo });
    case 'reconnect': return addHistoryDestination({ intent: 'reconnect', gmailPurpose: 'connection_recovery', returnTo });
    case 'choose': return addHistoryDestination({ intent: action.source === 'export' ? 'provider' : action.source === 'email' ? 'email' : 'choose', gmailPurpose: action.purpose, returnTo });
  }
}
