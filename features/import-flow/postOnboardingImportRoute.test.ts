import { buildAddHistoryDestination, parsePostOnboardingImportRoute } from './postOnboardingImportRoute';
import { addHistoryDestination } from '@features/navigation/appDestinations';

describe('post-onboarding import routes', () => {
  it('builds typed provider entry points', () => expect(buildAddHistoryDestination('provider', 'doordash')).toEqual({ pathname: '/add-history', params: { intent: 'provider', provider: 'doordash', returnTo: 'home' } }));
  it.each([
    [{ action: 'connect_gmail' }, 'reconnect'],
    [{ action: 'import_gmail' }, 'email'],
    [{ action: 'request_export', provider: 'uber_eats' }, 'provider'],
    [{ focus: 'export', provider: 'doordash' }, 'provider'],
  ] as const)('translates legacy route %o', (raw, intent) => expect(parsePostOnboardingImportRoute(raw)).toMatchObject({ intent }));
  it('preserves operation and download handoffs', () => expect(parsePostOnboardingImportRoute({ operationId: 'op-1', downloadedVersion: 'v1', intent: 'resume_export', provider: 'uber_eats' })).toMatchObject({ operationId: 'op-1', downloadedVersion: 'v1', intent: 'resume_export', provider: 'uber_eats' }));
  it('preserves the ongoing-tracking purpose through the typed destination', () => {
    const destination = addHistoryDestination({ intent: 'email', gmailPurpose: 'ongoing_tracking' });
    expect(destination).toMatchObject({ pathname: '/add-history', params: { intent: 'email', gmailPurpose: 'ongoing_tracking' } });
    if (typeof destination === 'string') throw new Error('Expected a typed Add History destination');
    expect(parsePostOnboardingImportRoute(destination.params as Record<string, string>)).toMatchObject({ intent: 'email', gmailPurpose: 'ongoing_tracking' });
  });
  it('discards unsupported email-connection purposes', () => {
    expect(parsePostOnboardingImportRoute({ gmailPurpose: 'unknown' }).gmailPurpose).toBeNull();
  });
  it('normalizes the Outlook callback purpose into the shared connection purpose', () => {
    expect(parsePostOnboardingImportRoute({ outlook: 'success', outlookPurpose: 'ongoing_tracking' })).toMatchObject({
      mailbox: 'outlook',
      gmailPurpose: 'ongoing_tracking',
    });
  });
});

test('OAuth return identifies the correct inbox without searching it automatically', () => {
  expect(parsePostOnboardingImportRoute({ intent: 'email', outlook: 'success' })).toMatchObject({ intent: 'email', mailbox: 'outlook' });
});

test('parses the explicit download-guide handoff', () => {
  expect(parsePostOnboardingImportRoute({ intent: 'resume_export', provider: 'uber_eats', showDownloadSteps: ['true'] })).toMatchObject({ showDownloadSteps: true, provider: 'uber_eats' });
  expect(parsePostOnboardingImportRoute({})).toMatchObject({ showDownloadSteps: false });
  expect(parsePostOnboardingImportRoute({ showDownloadSteps: 'false' })).toMatchObject({ showDownloadSteps: false });
});

it.each(['home', 'history', 'summary', 'settings'] as const)('retains the allowlisted %s return destination', returnTo => {
  expect(parsePostOnboardingImportRoute({ returnTo: [returnTo] }).returnTo).toBe(returnTo);
});
it.each(['https://example.com', '/settings/delete', '', 'profile'])('falls back home for invalid destination %s', returnTo => {
  expect(parsePostOnboardingImportRoute({ returnTo }).returnTo).toBe('home');
});
it('preserves interrupted request confirmation and setup context without inventing submission', () => {
  expect(parsePostOnboardingImportRoute({ intent: 'resume_export', provider: 'uber_eats', confirmRequest: 'true', journeyContext: 'onboarding' })).toMatchObject({ confirmRequest: true, journeyContext: 'onboarding' });
});
it('retains reconnect intent, selected Outlook and origin after OAuth', () => {
  expect(parsePostOnboardingImportRoute({ intent: 'reconnect', outlook: 'success', returnTo: 'settings' })).toMatchObject({ intent: 'reconnect', mailbox: 'outlook', returnTo: 'settings' });
});

it('keeps an explicit Outlook selection when a legacy Gmail action is also present', () => {
  expect(parsePostOnboardingImportRoute({ mailbox: 'outlook', action: 'import_gmail' })).toMatchObject({ intent: 'email', mailbox: 'outlook' });
});
