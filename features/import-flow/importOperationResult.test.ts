import type { ImportOperation } from './contracts';
import { resolveImportOperationResult, importResultCopy } from './importOperationResult';

const operation = (kind: ImportOperation['kind'], result: Record<string, unknown>, provider: ImportOperation['provider'] = null): ImportOperation => ({
  id: 'operation-1', kind, trigger: 'user', journeyContext: 'post_onboarding', status: 'succeeded', phase: 'completed', progress: 100,
  result, errorCode: null, errorMessage: null, attempts: 1, provider, presentation: null,
  createdAt: '2026-09-05T00:00:00.000Z', queuedAt: null, startedAt: null, completedAt: null, updatedAt: '2026-09-05T00:00:00.000Z',
});

describe('resolveImportOperationResult', () => {
  it('normalizes mailbox result counts', () => expect(resolveImportOperationResult(operation('gmail_historical', { newOrders: 4, updatedOrders: 2, unchangedOrders: 3 }))).toEqual({ sourceName: 'Gmail', newOrders: 4, updatedOrders: 2, unchangedOrders: 3, changedOrders: 6, importedOrders: null }));
  it('does not present a total imported count as new orders', () => expect(resolveImportOperationResult(operation('export_file', { importedCount: 8 }, 'doordash'))).toMatchObject({ sourceName: 'DoorDash', newOrders: null, changedOrders: null, importedOrders: 8 }));
});

test('explicit zero is never replaced by a total count', () => {
  expect(resolveImportOperationResult(operation('gmail_historical', { newOrders: 0, updatedOrders: 0, unchangedOrders: 8, importedCount: 8 }))).toMatchObject({ newOrders: 0, changedOrders: 0, unchangedOrders: 8 });
});
test('unknown and invalid counts remain unknown', () => {
  expect(resolveImportOperationResult(operation('gmail_historical', { newOrders: null, updatedOrders: -1 }))).toMatchObject({ newOrders: null, updatedOrders: null, changedOrders: null });
});

test('final canonical counts override temporary flat fields and keep adjustment metadata out of completion copy', () => {
  const receiptOutcome = { policyVersion: 3, newOrders: 1, updatedOrders: 1, unchangedOrders: 0, ordersProcessed: 2,
    unresolvedOrders: 1, unlinkedAdjustments: 1, adjustedOrders: 1, cancellationsRecovered: 1, sourceDocuments: 7, currencies: [] };
  const summary = resolveImportOperationResult(operation('gmail_historical', { newOrders: 8, updatedOrders: 3, receiptOutcome }));
  expect(summary.changedOrders).toBe(2);
  expect(summary.importedOrders).toBe(2);
  expect(importResultCopy(summary).body).toBe('Gmail has finished updating your history. Some receipts still need matching before they appear in your totals.');
  expect(JSON.stringify(importResultCopy(summary))).not.toMatch(/refund|cancel|not linked|source document/i);
});

test.each(['unresolvedOrders', 'unlinkedAdjustments'])('an import with only %s is not an empty import', field => {
  const receiptOutcome = { policyVersion: 3, newOrders: 0, updatedOrders: 0, unchangedOrders: 0, ordersProcessed: 0,
    unresolvedOrders: 0, unlinkedAdjustments: 0, adjustedOrders: 0, cancellationsRecovered: 0, sourceDocuments: 1, currencies: [], [field]: 1 };
  const summary = resolveImportOperationResult(operation('gmail_historical', { receiptOutcome }));
  expect(importResultCopy(summary)).toMatchObject({ title: 'Import finished', empty: false, needsMatching: true });
});

test('empty, unchanged and legacy unresolved imports retain distinct truthful states', () => {
  const result = { newOrders: 0, updatedOrders: 0, unchangedOrders: 0 };
  expect(importResultCopy(resolveImportOperationResult(operation('gmail_historical', result))).empty).toBe(true);
  expect(importResultCopy(resolveImportOperationResult(operation('gmail_historical', { ...result, unchangedOrders: 3 }))).title).toBe('3 orders already saved');
  const legacy = resolveImportOperationResult(operation('gmail_historical', { ...result, unresolvedOrders: 1 }));
  expect(importResultCopy(legacy).empty).toBe(false);
});
