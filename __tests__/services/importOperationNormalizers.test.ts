import {
  normalizeNullableOperationEnvelope,
  normalizeOperationEnvelope,
} from '@services/normalizers/importOperationNormalizers';

const operation = {
  id: '67bce5bc-436e-4c4f-9c0f-93880b5ced9a',
  kind: 'gmail_historical', trigger: 'user', status: 'queued', phase: 'waiting', progress: 0,
  result: null, errorCode: null, errorMessage: null, attempts: 0,
  createdAt: '2026-09-02T12:00:00.000Z', queuedAt: null, startedAt: null,
  completedAt: null, updatedAt: '2026-09-02T12:00:00.000Z',
};

describe('import operation normalizers', () => {
  it('accepts the public durable-operation contract', () => {
    expect(normalizeOperationEnvelope({ operation })).toEqual(operation);
    expect(normalizeOperationEnvelope({ operation: { ...operation, status: 'cancelled' } }).status).toBe('cancelled');
    expect(normalizeNullableOperationEnvelope({ operation: null })).toBeNull();
  });

  it.each([
    { ...operation, status: 'unknown' },
    { ...operation, progress: 101 },
    { ...operation, attempts: -1 },
    { ...operation, result: [] },
  ])('rejects malformed operation data', (malformed) => {
    expect(() => normalizeOperationEnvelope({ operation: malformed })).toThrow('Invalid import operation response');
  });
});
