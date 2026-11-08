import type { ImportOperation } from './contracts';
import { resolveImportOperationRecovery } from './importOperationRecovery';

const failed = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  id: 'failed-import', kind: 'gmail_historical', trigger: 'user', journeyContext: 'post_onboarding',
  status: 'failed', phase: 'failed', progress: 10, result: null,
  errorCode: 'GMAIL_RECONNECT_REQUIRED', errorMessage: 'Reconnect Gmail to continue.',
  attempts: 1, provider: null, presentation: null, createdAt: '', updatedAt: '',
  queuedAt: null, startedAt: null, completedAt: null, ...overrides,
});

it.each([
  ['gmail_historical', 'GMAIL_RECONNECT_REQUIRED', 'gmail', 'Gmail'],
  ['outlook_historical', 'OUTLOOK_RECONNECT_REQUIRED', 'outlook', 'Outlook'],
  ['scheduled_tracking', 'GMAIL_RECONNECT_REQUIRED', 'gmail', 'Gmail'],
  ['manual_tracking', 'OUTLOOK_RECONNECT_REQUIRED', 'outlook', 'Outlook'],
] as const)('repairs the affected mailbox for %s / %s', (kind, errorCode, mailbox, name) => {
  expect(resolveImportOperationRecovery(failed({ kind, errorCode }), 'history')).toEqual({
    label: `Reconnect ${name}`,
    destination: { pathname: '/add-history', params: {
      returnTo: 'history', journeyContext: 'post_onboarding', intent: 'reconnect', mailbox,
    } },
  });
});
it('preserves initial setup when recovering mailbox access', () => {
  expect(resolveImportOperationRecovery(failed({ journeyContext: 'onboarding' }), 'home').destination.params)
    .toMatchObject({ journeyContext: 'onboarding', intent: 'reconnect' });
});
it('does not classify a temporary validation outage as revoked authorization', () => {
  expect(resolveImportOperationRecovery(failed({ errorCode: 'GMAIL_VALIDATION_UNAVAILABLE' }), 'home'))
    .toMatchObject({ label: 'Try again', destination: { params: { intent: 'email' } } });
});
it('preserves provider upload recovery', () => {
  expect(resolveImportOperationRecovery(failed({ kind: 'export_file', provider: 'doordash', errorCode: 'INVALID_CSV_FORMAT' }), 'summary'))
    .toMatchObject({ destination: { params: { intent: 'provider', provider: 'doordash', downloadedVersion: 'retry', returnTo: 'summary' } } });
});
it('opens settings for other tracking failures without starting a manual resync', () => {
  expect(resolveImportOperationRecovery(failed({ kind: 'scheduled_tracking', errorCode: 'MAILBOX_TRACKING_FAILED' }), 'settings'))
    .toEqual({ label: 'Open email settings', destination: { pathname: '/settings/accounts-permissions', params: { returnTo: 'settings' } } });
});
it('does not reconnect for a superseded operation with an old authorization error', () => {
  expect(resolveImportOperationRecovery(failed({ status: 'superseded' }), 'home').label).toBe('Try again');
});
