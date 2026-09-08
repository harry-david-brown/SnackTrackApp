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
    expect(normalizeOperationEnvelope({ operation })).toMatchObject({ ...operation, journeyContext: 'legacy' });
    expect(normalizeOperationEnvelope({ operation: { ...operation, journeyContext: 'post_onboarding' } }).journeyContext).toBe('post_onboarding');
    expect(normalizeOperationEnvelope({ operation: { ...operation, status: 'cancelled' } }).status).toBe('cancelled');
    expect(normalizeNullableOperationEnvelope({ operation: null })).toBeNull();
  });

  it('normalizes an optional time estimate and safely ignores malformed estimates', () => {
    const presentation = { mode: 'foreground', expectedDurationBand: 'under_5_minutes', reason: 'normal', stage: 'waiting', discoveredOrderCount: 0 };
    const estimated = normalizeOperationEnvelope({ operation: {
      ...operation,
      presentation: { ...presentation, timeEstimate: { kind: 'remaining', minimumMinutes: 1, maximumMinutes: 2, revision: 1 } },
    } });
    expect(estimated.presentation?.timeEstimate).toEqual({ kind: 'remaining', minimumMinutes: 1, maximumMinutes: 2, revision: 1 });

    const malformed = normalizeOperationEnvelope({ operation: {
      ...operation,
      presentation: { ...presentation, timeEstimate: { kind: 'remaining', minimumMinutes: 4, maximumMinutes: 2, revision: 1 } },
    } });
    expect(malformed.presentation?.timeEstimate).toBeNull();
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
