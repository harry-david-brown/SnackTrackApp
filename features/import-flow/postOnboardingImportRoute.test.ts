import { buildAddHistoryDestination, parsePostOnboardingImportRoute } from './postOnboardingImportRoute';

describe('post-onboarding import routes', () => {
  it('builds typed provider entry points', () => expect(buildAddHistoryDestination('provider', 'doordash')).toEqual({ pathname: '/add-history', params: { intent: 'provider', provider: 'doordash', returnTo: 'home' } }));
  it.each([
    [{ action: 'connect_gmail' }, 'reconnect'],
    [{ action: 'import_gmail' }, 'email'],
    [{ action: 'request_export', provider: 'uber_eats' }, 'provider'],
    [{ focus: 'export', provider: 'doordash' }, 'provider'],
  ] as const)('translates legacy route %o', (raw, intent) => expect(parsePostOnboardingImportRoute(raw)).toMatchObject({ intent }));
  it('preserves operation and download handoffs', () => expect(parsePostOnboardingImportRoute({ operationId: 'op-1', downloadedVersion: 'v1', intent: 'resume_export', provider: 'uber_eats' })).toMatchObject({ operationId: 'op-1', downloadedVersion: 'v1', intent: 'resume_export', provider: 'uber_eats' }));
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
