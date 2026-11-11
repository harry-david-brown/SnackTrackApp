import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import { resolveHomeDataGuidance, resolveHomePrioritySurface } from '@components/dashboard/dashboardTrackingState';
import type { ImportOperation, ImportPreferencesResponse } from '@features/import-flow/contracts';
import type { ImportEntryAction } from '@features/import-flow/importEntryAction';
import { importNextActionEntry, resolveImportNextAction } from '@features/import-flow/importNextAction';
import { resolvePostOnboardingImportJourney } from '@features/import-flow/postOnboardingImportJourney';
import { parsePostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';
import { importEntryDestination } from '@features/navigation/importEntryDestination';

function openEntry(preferences: ImportPreferencesResponse, action: ImportEntryAction) {
  const destination = importEntryDestination(action);
  if (typeof destination === 'string') throw new Error('Expected an import destination');
  const route = parsePostOnboardingImportRoute(destination.params as Record<string, string>);
  return {
    route,
    journey: resolvePostOnboardingImportJourney({
      preferences, preferencesLoading: false, preferencesUnavailable: false,
      operation: null, operationRequested: false, operationLoading: false,
      intent: route.intent, selectedProvider: route.provider, selectedMailbox: route.mailbox,
      downloadState: 'not_downloaded',
    }),
  };
}
function openHome(preferences: ImportPreferencesResponse) {
  const action = resolveHomeDataGuidance(preferences, false).primaryAction;
  if (!action || action.kind === 'retry_preferences') throw new Error('Expected an import action');
  return openEntry(preferences, action);
}

it.each(['gmail', 'outlook'] as const)('Home retries the failed %s inbox even with a waiting export', mailbox => {
  const p = createImportPreferencesFixture();
  p.export.providers.uberEats.status = 'requested';
  (mailbox === 'gmail' ? p.gmailBaseline : p.outlookBaseline).latestAttempt.status = 'failed';
  expect(openHome(p)).toMatchObject({
    route: { intent: 'email', mailbox, returnTo: 'home' },
    journey: { kind: 'email_review', provider: mailbox, reconnect: false },
  });
});
it.each(['gmail', 'outlook'] as const)('Home reconnect preserves the affected %s inbox', mailbox => {
  const p = createImportPreferencesFixture();
  (mailbox === 'gmail' ? p.gmailConnection : p.outlookConnection).needsReconnect = true;
  expect(openHome(p)).toMatchObject({
    route: { intent: 'reconnect', mailbox, gmailPurpose: 'connection_recovery' },
    journey: { kind: 'email_review', provider: mailbox, reconnect: true },
  });
});
it('keeps aggregate reconnect on the inbox chooser when the provider is unknown', () => {
  const p = createImportPreferencesFixture();
  p.ongoingTracking.effectiveState = 'reconnect_required';
  expect(openHome(p)).toMatchObject({ route: { mailbox: null }, journey: { kind: 'email_choice' } });
});
it.each([
  ['file_ready', 'download_ready'], ['failed', 'provider_failed'], ['requested', 'provider_waiting'],
] as const)('Home opens the selected export at its current %s stage', (status, kind) => {
  const p = createImportPreferencesFixture();
  p.coverage.exportProviders.doorDash.hasData = true;
  p.export.providers.doorDash.status = status;
  expect(openHome(p)).toMatchObject({
    route: { intent: 'resume_export', provider: 'doordash', returnTo: 'home' },
    journey: { kind, provider: { provider: 'doordash' } },
  });
});
it('ready files win over mailbox recovery, while mailbox recovery wins over passive processing', () => {
  const p = createImportPreferencesFixture();
  p.outlookBaseline.latestAttempt.status = 'failed';
  p.export.providers.doorDash.status = 'file_ready';
  expect(openHome(p).journey).toMatchObject({ kind: 'download_ready', provider: { provider: 'doordash' } });
  p.export.providers.doorDash.status = 'import_processing';
  expect(openHome(p).journey).toMatchObject({ kind: 'email_review', provider: 'outlook' });
});
it('active operations replace guidance and carry their identity to progress', () => {
  const p = createImportPreferencesFixture();
  p.export.providers.doorDash.status = 'file_ready';
  const operation = { id: 'running-job', status: 'running' } as ImportOperation;
  expect(resolveHomePrioritySurface(operation, resolveHomeDataGuidance(p, false))).toEqual({ kind: 'active_import', operation });
  const action = importNextActionEntry(resolveImportNextAction({ preferences: p, operation, returnTo: 'history' }));
  expect(action && importEntryDestination(action)).toEqual({ pathname: '/import-progress', params: { operationId: 'running-job', returnTo: 'history' } });
});
it('explicit provider and chooser intents survive unrelated higher-priority work', () => {
  const p = createImportPreferencesFixture();
  p.export.providers.uberEats.status = 'file_ready';
  p.outlookBaseline.latestAttempt.status = 'failed';
  expect(openEntry(p, { kind: 'export', provider: 'doordash', intent: 'request', returnTo: 'history' })).toMatchObject({
    route: { returnTo: 'history' }, journey: { kind: 'request', provider: { provider: 'doordash' } },
  });
  expect(openEntry(p, { kind: 'choose', source: 'any', returnTo: 'home' }).journey.kind).toBe('choose_method');
});
it('keeps processing passive and unavailable preferences retryable', () => {
  const p = createImportPreferencesFixture();
  p.outlookBaseline.latestAttempt.status = 'importing';
  expect(resolveHomeDataGuidance(p, false)).toMatchObject({ passive: true, busy: true });
  expect(resolveHomeDataGuidance(p, false).primaryAction).toBeUndefined();
  expect(resolveHomeDataGuidance(null, false, true).primaryAction).toEqual({ kind: 'retry_preferences' });
  expect(resolveHomeDataGuidance(null, true)).toMatchObject({ id: 'loading', passive: true });
});
