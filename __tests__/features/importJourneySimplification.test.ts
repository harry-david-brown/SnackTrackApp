import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import { emailUpdatesPresentation } from '@features/import-flow/emailImportPresentation';
import { shouldOfferAutomaticUpdates } from '@features/import-flow/ongoingUpdatesState';
import { resolveImportNextAction } from '@features/import-flow/importNextAction';
import { resolveExportOpportunity, resolveImportCoverage } from '@features/import-flow/importJourneyState';
import { importResultCopy, resolveImportOperationResult, resolveMailboxOutcomes } from '@features/import-flow/importOperationResult';
import type { ImportOperation } from '@features/import-flow/contracts';

const operation = (status: ImportOperation['status'], result: ImportOperation['result'] = null) => ({ id: 'saved-job', kind: 'export_file', status, result, provider: 'doordash' }) as ImportOperation;
const useful = () => {
  const p = createImportPreferencesFixture();
  p.coverage.hasExportData = true;
  p.coverage.exportProviders.doorDash.hasData = true;
  p.ongoingTracking.baseline = { eligible: true, source: 'exports' };
  return p;
};
it.each(['not_offered', 'granted', 'declined', 'revoked'] as const)('one-time import never changes %s consent', consent => {
  const p = useful(); p.ongoingTracking.consentState = consent;
  expect(emailUpdatesPresentation(p)).toMatchObject({ automaticUpdates: false, label: 'Import my receipts' });
  expect(p.ongoingTracking.consentState).toBe(consent);
});
it('one useful source can receive one automatic offer; exposure and prior consent suppress it', () => {
  const p = useful();
  expect(shouldOfferAutomaticUpdates(p)).toBe(true);
  p.automaticUpdatesOfferSeenAt = '2026-09-24T00:00:00Z';
  expect(shouldOfferAutomaticUpdates(p)).toBe(false);
  p.automaticUpdatesOfferSeenAt = null;
  for (const consent of ['granted', 'declined', 'revoked'] as const) {
    p.ongoingTracking.consentState = consent;
    expect(shouldOfferAutomaticUpdates(p)).toBe(false);
  }
});
it('an empty completed scan does not imply useful history', () => {
  const p = createImportPreferencesFixture();
  p.gmailBaseline.hasCompleted = true;
  p.ongoingTracking.baseline = { eligible: true, source: 'gmail' };
  expect(shouldOfferAutomaticUpdates(p)).toBe(false);
});
it.each(['requested', 'file_ready', 'failed', 'import_processing'] as const)('older coverage does not hide a newer %s export', status => {
  const p = useful(); p.export.providers.doorDash.status = status;
  expect(resolveExportOpportunity(resolveImportCoverage(p))?.provider).toBe('doordash');
  expect(resolveImportNextAction({ preferences: p })).toMatchObject({ kind: 'export', provider: 'doordash', stage: status });
});
it.each(['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'] as const)('resumes %s work before an optional source', status => {
  expect(resolveImportNextAction({ preferences: useful(), operation: operation(status) }).kind).toBe('operation');
  expect(resolveImportNextAction({ preferences: useful(), operation: operation(status), submitting: true }).kind).toBe('submitting');
});
it.each(['gmail', 'outlook'] as const)('identifies the affected %s inbox for recovery', mailbox => {
  const p = useful(); const baseline = mailbox === 'gmail' ? p.gmailBaseline : p.outlookBaseline;
  baseline.latestAttempt.status = 'failed';
  expect(resolveImportNextAction({ preferences: p, returnTo: 'history' })).toEqual({ kind: 'mailbox', mailbox, action: 'retry', returnTo: 'history' });
});
it('does not recommend a provider marked unused, but preserves its saved request', () => {
  const p = useful(); p.export.providers.uberEats.relevance = 'not_used';
  expect(resolveExportOpportunity(resolveImportCoverage(p))).toBeNull();
  p.export.providers.uberEats.status = 'requested';
  expect(resolveExportOpportunity(resolveImportCoverage(p))?.provider).toBe('uber_eats');
});
it('keeps empty, duplicate-only, unresolved and unknown counts distinct', () => {
  const copy = (result: ImportOperation['result']) => importResultCopy(resolveImportOperationResult(operation('succeeded', result)));
  expect(copy({ newOrders: 0, updatedOrders: 0, unchangedOrders: 0 }).empty).toBe(true);
  expect(copy({ newOrders: 0, updatedOrders: 0, unchangedOrders: 8 }).title).toBe('These orders are already saved');
  expect(copy({ newOrders: 0, updatedOrders: 0, unresolvedOrders: 2 }).needsMatching).toBe(true);
  expect(copy(null).body).toContain('reliable order count is unavailable');
});
it('preserves per-inbox partial results without trusting malformed or legacy fields', () => {
  const job = operation('failed', { mailboxOutcomes: [
    { mailbox: 'gmail', email: 'receipts@example.com', success: true },
    { mailbox: 'outlook', success: false, errorCode: 'OUTLOOK_RECONNECT_REQUIRED' },
    { mailbox: 'invalid', success: true },
  ] });
  expect(resolveMailboxOutcomes(job)).toHaveLength(2);
  expect(resolveMailboxOutcomes(operation('failed'))).toEqual([]);
});
