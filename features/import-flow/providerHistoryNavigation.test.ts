import { buildProviderHistoryDestination } from './providerHistoryNavigation';

describe('provider history navigation', () => {
  it('enters the returning-user provider journey directly', () => {
    expect(buildProviderHistoryDestination('uber_eats')).toEqual({
      pathname: '/add-history',
      params: {
        intent: 'provider',
        provider: 'uber_eats',
        returnTo: 'home',
      },
    });
  });
});

it.each(['requested', 'file_ready', 'import_processing', 'failed'])('resumes %s progress from Home and Summary', status => {
  expect(buildProviderHistoryDestination('uber_eats', status, 'summary').params).toMatchObject({ intent: 'resume_export', returnTo: 'summary' });
});
it('keeps an imported provider available for a newer file', () => {
  expect(buildProviderHistoryDestination('doordash', 'imported').params.intent).toBe('provider');
});
