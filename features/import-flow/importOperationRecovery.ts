import type { ImportOperation } from './contracts';
import type { ImportReturnTo } from './importNavigation';

/** Recover from the recorded failure without replaying a job or inferring current credential health. */
export function resolveImportOperationRecovery(operation: ImportOperation, returnTo: ImportReturnTo) {
  const mailbox = operation.status === 'failed'
    ? operation.errorCode === 'GMAIL_RECONNECT_REQUIRED' ? 'gmail'
      : operation.errorCode === 'OUTLOOK_RECONNECT_REQUIRED' ? 'outlook' : null
    : null;
  const journeyContext = operation.journeyContext === 'onboarding' ? 'onboarding' : 'post_onboarding';
  if (mailbox) return {
    label: `Reconnect ${mailbox === 'gmail' ? 'Gmail' : 'Outlook'}`,
    destination: { pathname: '/add-history' as const, params: { returnTo, journeyContext, intent: 'reconnect', mailbox } },
  };
  if (operation.kind === 'export_file' && operation.provider) {
    const freshExport = ['ZIP_INVALID', 'ZIP_INTEGRITY_FAILED', 'ZIP_ENCRYPTED', 'NO_VALID_EXPORT_ORDERS'].includes(operation.errorCode ?? '');
    return {
      label: freshExport ? 'Request a fresh export' : operation.status === 'expired' ? 'Choose the file again' : 'Choose another file',
      destination: { pathname: '/add-history' as const, params: { returnTo, journeyContext, intent: 'provider', provider: operation.provider,
        ...(freshExport ? { requestNew: 'true' } : { downloadedVersion: 'retry' }) } },
    };
  }
  if (operation.kind === 'manual_tracking' || operation.kind === 'scheduled_tracking') return {
    label: 'Open email settings',
    destination: { pathname: '/settings/accounts-permissions' as const, params: { returnTo } },
  };
  return {
    label: 'Try again',
    destination: { pathname: '/add-history' as const, params: {
      returnTo, journeyContext, intent: operation.kind === 'export_file' ? 'provider' : 'email',
      ...(operation.provider ? { provider: operation.provider, downloadedVersion: 'retry' }
        : { mailbox: operation.kind === 'outlook_historical' ? 'outlook' : 'gmail' }),
    } },
  };
}
