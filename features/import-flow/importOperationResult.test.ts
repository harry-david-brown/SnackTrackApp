import type { ImportOperation } from './contracts';
import { resolveImportOperationResult } from './importOperationResult';

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
