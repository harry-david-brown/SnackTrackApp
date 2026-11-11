import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import type { ImportOperation } from './contracts';
import type { ProviderJourneyState } from './importJourneyState';
import { resolveDownloadSource, resolveEmailSources } from './importSourcePresentation';

const activeOperation = (mailbox: 'gmail' | 'outlook'): ImportOperation => ({
  id: 'test', kind: `${mailbox}_historical`, status: 'running', trigger: 'user', journeyContext: 'post_onboarding',
  phase: 'working', progress: 20, result: null, errorCode: null, errorMessage: null, attempts: 0, provider: null,
  createdAt: '', queuedAt: null, startedAt: null, completedAt: null, updatedAt: '', presentation: null,
});

describe('single inbox source presentation', () => {
  it('offers both providers only before an inbox has been used', () => {
    expect(resolveEmailSources(createImportPreferencesFixture(), null).map(row => row.mailbox)).toEqual(['gmail', 'outlook']);
  });
  it.each(['gmail', 'outlook'] as const)('shows only imported %s with no redundant action', mailbox => {
    const preferences = createImportPreferencesFixture();
    preferences[`${mailbox}Baseline`].hasCompleted = true;
    const rows = resolveEmailSources(preferences, null);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mailbox, completed: true, presentation: { status: 'Imported', tone: 'complete' } });
    expect(rows[0].presentation.actionLabel).toBeUndefined();
  });
  it.each(['gmail', 'outlook'] as const)('keeps %s connection, recovery, and progress actionable', mailbox => {
    const preferences = createImportPreferencesFixture();
    const connection = preferences[`${mailbox}Connection`];
    const baseline = preferences[`${mailbox}Baseline`];
    connection.connected = true;
    expect(resolveEmailSources(preferences, null)[0]).toMatchObject({ mailbox, completed: false, presentation: { status: 'Ready to import' } });
    baseline.hasCompleted = true;
    connection.needsReconnect = true;
    expect(resolveEmailSources(preferences, null)[0].presentation.actionLabel).toBe('Reconnect inbox');
    connection.needsReconnect = false;
    connection.connectionHealth = 'unavailable';
    expect(resolveEmailSources(preferences, null)[0].presentation.status).toBe('Unavailable');
    connection.connectionHealth = 'valid';
    baseline.latestAttempt.status = 'failed';
    expect(resolveEmailSources(preferences, null)[0].presentation.actionLabel).toBe('Try again');
    expect(resolveEmailSources(preferences, activeOperation(mailbox))[0]).toMatchObject({ mailbox, active: true, presentation: { status: 'Importing…', actionLabel: 'View progress' } });
  });
  it('prefers the most recently imported existing inbox and preserves active work', () => {
    const preferences = createImportPreferencesFixture();
    preferences.gmailBaseline.hasCompleted = true;
    preferences.gmailBaseline.completedAt = '2026-10-01';
    preferences.outlookBaseline.hasCompleted = true;
    preferences.outlookBaseline.completedAt = '2026-11-01';
    expect(resolveEmailSources(preferences, null).map(row => row.mailbox)).toEqual(['outlook']);
    expect(resolveEmailSources(preferences, activeOperation('gmail')).map(row => row.mailbox)).toEqual(['gmail']);
  });
});

describe.each([
  ['uber_eats', 'Uber Eats'],
  ['doordash', 'DoorDash'],
] as const)('%s history download presentation', (providerId, name) => {
  const provider: ProviderJourneyState = { provider: providerId, name, imported: false, receiptCount: 0, status: 'not_started' };
  const operation = (status: ImportOperation['status']): ImportOperation => ({ ...activeOperation('gmail'), kind: 'export_file', provider: providerId, status });

  it('offers completion as optional without implying an import already happened', () => {
    expect(resolveDownloadSource(provider, false, '')).toEqual({ status: 'Optional', tone: 'optional', body: '', actionLabel: `Complete ${name} history` });
  });
  it.each([
    ['requested', 'Waiting for email', 'View next steps'],
    ['file_ready', 'Download ready', 'Download your file'],
    ['import_processing', 'Importing…', 'Check import status'],
    ['failed', 'Needs attention', 'Try again'],
  ] as const)('describes %s and resumes the matching provider journey', (status, label, action) => {
    const result = resolveDownloadSource({ ...provider, status }, false, '');
    expect(result).toMatchObject({ status: label, actionLabel: action });
    expect(result.action).toBeUndefined();
  });
  it.each([
    ['awaiting_upload', 'Upload unfinished', 'Resume upload'],
    ['pending_dispatch', 'Queued', 'View progress'],
    ['queued', 'Queued', 'View progress'],
    ['running', 'Importing…', 'View progress'],
    ['retrying', 'Retrying…', 'View progress'],
  ] as const)('uses the %s operation before stale lifecycle or request hints', (status, label, action) => {
    expect(resolveDownloadSource(provider, true, '', operation(status))).toMatchObject({ status: label, actionLabel: action, action: 'operation' });
  });
  it('never assigns another provider or ready-email operation to this row', () => {
    const other = providerId === 'uber_eats' ? 'doordash' : 'uber_eats';
    expect(resolveDownloadSource(provider, false, '', { ...operation('running'), provider: other }).status).toBe('Optional');
    expect(resolveDownloadSource(provider, false, '', { ...operation('running'), kind: 'export_ready_check' }).status).toBe('Optional');
  });
  it.each(['succeeded', 'failed', 'cancelled', 'expired', 'superseded'] as const)('does not let an old %s operation replace a newer request', status => {
    expect(resolveDownloadSource({ ...provider, status: 'requested' }, false, '', operation(status))).toMatchObject({ status: 'Waiting for email', actionLabel: 'View next steps' });
  });
  it('uses receipt-backed completion without hiding a new request or import', () => {
    const imported = { ...provider, imported: true, receiptCount: 12 };
    expect(resolveDownloadSource(imported, false, ' · Through Oct 2026')).toMatchObject({ status: 'Imported', body: '12 orders · Through Oct 2026', actionLabel: 'Add newer history' });
    expect(resolveDownloadSource(imported, true, '').status).toBe('Confirm request');
    expect(resolveDownloadSource({ ...imported, status: 'requested' }, false, '').status).toBe('Waiting for email');
    expect(resolveDownloadSource(imported, false, '', operation('queued')).status).toBe('Queued');
    expect(resolveDownloadSource(imported, false, '', operation('succeeded')).status).toBe('Imported');
  });
});
