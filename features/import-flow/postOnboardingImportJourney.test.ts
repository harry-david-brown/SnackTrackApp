import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import type { ImportOperation, ImportPreferencesResponse } from './contracts';
import { resolvePostOnboardingImportJourney, type ResolvePostOnboardingImportJourneyInput } from './postOnboardingImportJourney';

const operation = (status: ImportOperation['status']): ImportOperation => ({
  id: 'operation-1', kind: 'gmail_historical', trigger: 'user', journeyContext: 'post_onboarding', status,
  phase: 'working', progress: 20, result: null, errorCode: null, errorMessage: null, attempts: 0, provider: null,
  createdAt: '2026-09-05T00:00:00.000Z', queuedAt: null, startedAt: null, completedAt: null,
  updatedAt: '2026-09-05T00:00:00.000Z', presentation: null,
});

const input = (preferences: ImportPreferencesResponse, overrides: Partial<ResolvePostOnboardingImportJourneyInput> = {}): ResolvePostOnboardingImportJourneyInput => ({
  preferences, preferencesLoading: false, preferencesUnavailable: false, operation: null, operationRequested: false, operationLoading: false,
  intent: 'choose', selectedProvider: null, downloadState: 'not_downloaded', ...overrides,
});

describe('guided returning-user imports', () => {
  it.each(['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'] as const)('keeps source choice available during %s', status => {
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { operation: operation(status) })).kind).toBe('choose_method');
  });
  it.each(['succeeded', 'failed', 'cancelled', 'expired', 'superseded'] as const)('honors the explicit %s operation link', status => {
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { operation: operation(status), operationRequested: true })).kind).toBe('operation');
  });
  it('distinguishes loading, an outage and a missing operation', () => {
    const preferences = createImportPreferencesFixture();
    expect(resolvePostOnboardingImportJourney(input(preferences, { operationRequested: true, operationLoading: true })).kind).toBe('loading');
    expect(resolvePostOnboardingImportJourney(input(preferences, { operationRequested: true, operationUnavailable: true })).kind).toBe('temporary_outage');
    expect(resolvePostOnboardingImportJourney(input(preferences, { operationRequested: true })).kind).toBe('missing_operation');
  });
  it('does not let a waiting Uber request override DoorDash or email', () => {
    const preferences = createImportPreferencesFixture();
    preferences.export.providers.uberEats.status = 'requested';
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'provider', selectedProvider: 'doordash' }))).toMatchObject({ kind: 'request', provider: { provider: 'doordash' } });
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'email' })).kind).toBe('email_choice');
  });
  it('reconnects only the chosen mailbox', () => {
    const preferences = createImportPreferencesFixture();
    preferences.gmailConnection.connectionHealth = 'reconnect_required';
    preferences.outlookConnection = { ...preferences.outlookConnection, connected: true, connectionHealth: 'valid' };
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'email', selectedMailbox: 'outlook' }))).toMatchObject({ kind: 'email_review', provider: 'outlook', reconnect: false });
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'reconnect', selectedMailbox: 'gmail' }))).toMatchObject({ kind: 'email_review', reconnect: true });
  });
  it('keeps imported and previously unused providers selectable', () => {
    const preferences = createImportPreferencesFixture();
    preferences.export.providers.uberEats.relevance = 'not_used';
    preferences.coverage.exportProviders.doorDash = { receiptCount: 4, hasData: true, earliestOrderDate: null, latestOrderDate: null };
    const state = resolvePostOnboardingImportJourney(input(preferences));
    expect(state.kind).toBe('choose_method');
    if (state.kind === 'choose_method') expect(state.providers).toHaveLength(2);
    expect(resolvePostOnboardingImportJourney(input(preferences, { selectedProvider: 'doordash', intent: 'provider' })).kind).toBe('request');
  });
  it.each([['requested', 'provider_waiting'], ['file_ready', 'download_ready'], ['failed', 'provider_failed']] as const)('resumes a specifically requested %s source', (status, kind) => {
    const preferences = createImportPreferencesFixture();
    preferences.export.providers.uberEats.status = status;
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'resume_export', selectedProvider: 'uber_eats' })).kind).toBe(kind);
  });
  it('lets an explicit upload or fresh request override a saved waiting state', () => {
    const preferences = createImportPreferencesFixture();
    preferences.export.providers.uberEats.status = 'requested';
    expect(resolvePostOnboardingImportJourney(input(preferences, { selectedProvider: 'uber_eats', step: 'upload' }))).toMatchObject({ kind: 'download_ready', downloaded: true });
    expect(resolvePostOnboardingImportJourney(input(preferences, { selectedProvider: 'uber_eats', step: 'request' })).kind).toBe('request');
  });
  it('preserves download handoffs without forcing the introductory questions', () => {
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { selectedProvider: 'uber_eats', downloadState: 'downloaded' }))).toMatchObject({ kind: 'download_ready', downloaded: true });
  });
  it.each(['goal', 'email_suitability'] as const)('redirects retired %s guidance to the request or provider choice', step => {
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { step, selectedProvider: 'uber_eats' })).kind).toBe('request');
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { step })).kind).toBe('choose_method');
  });
  it('keeps repeat imports explicit without changing automatic-update consent', () => {
    const preferences = createImportPreferencesFixture();
    preferences.gmailBaseline.hasCompleted = true;
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'email', selectedMailbox: 'gmail' })).kind).toBe('email_review');
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'reconnect', selectedMailbox: 'gmail' })).kind).toBe('email_review');
  });
  it('keeps a completed inbox in the reviewed flow when it was opened for ongoing tracking', () => {
    const preferences = createImportPreferencesFixture();
    preferences.gmailBaseline.hasCompleted = true;
    expect(resolvePostOnboardingImportJourney(input(preferences, {
      intent: 'email',
      selectedMailbox: 'gmail',
      gmailPurpose: 'ongoing_tracking',
    }))).toMatchObject({ kind: 'email_review', provider: 'gmail' });
  });
});



it.each(['gmail', 'outlook'] as const)('checks first-import eligibility for %s independently', mailbox => {
  const preferences = createImportPreferencesFixture();
  preferences.gmailBaseline.hasCompleted = mailbox === 'outlook';
  preferences.outlookBaseline.hasCompleted = mailbox === 'gmail';
  expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'email', selectedMailbox: mailbox })).kind).toBe('email_review');
});
it('keeps explicit reconnect available with active automatic updates and a completed baseline', () => {
  const preferences = createImportPreferencesFixture();
  preferences.gmailBaseline.hasCompleted = true;
  preferences.ongoingTracking.effectiveState = 'active';
  preferences.gmailConnection.connectionHealth = 'reconnect_required';
  expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'reconnect', selectedMailbox: 'gmail' }))).toMatchObject({ kind: 'email_review', reconnect: true });
});
it('surfaces stale status even with a cached active operation', () => {
  expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { operationRequested: true, operationUnavailable: true, operation: operation('running') })).kind).toBe('temporary_outage');
});
it('keeps file-location help distinct from a fresh download request', () => {
  const preferences = createImportPreferencesFixture();
  expect(resolvePostOnboardingImportJourney(input(preferences, { selectedProvider: 'uber_eats', step: 'file_help' })).kind).toBe('file_help');
});


describe('shared export journey lifecycle boundaries', () => {
  it.each(['uber_eats', 'doordash'] as const)('opens %s at saved progress and keeps guide viewing separate', selectedProvider => {
    const preferences = createImportPreferencesFixture();
    const provider = selectedProvider === 'uber_eats' ? preferences.export.providers.uberEats : preferences.export.providers.doorDash;
    provider.status = 'requested';
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'provider', selectedProvider })).kind).toBe('provider_waiting');
    expect(resolvePostOnboardingImportJourney(input(preferences, { intent: 'provider', selectedProvider, step: 'request' })).kind).toBe('request');
    expect(provider.status).toBe('requested');
  });
  it('never presents background ready checks as an import result', () => {
    const background = { ...operation('succeeded'), kind: 'export_ready_check' as const };
    expect(resolvePostOnboardingImportJourney(input(createImportPreferencesFixture(), { operation: background, operationRequested: true })).kind).toBe('missing_operation');
  });
});
