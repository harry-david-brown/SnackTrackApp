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

const receiptOutcome = {
  policyVersion: 3, newOrders: 1, updatedOrders: 1, unchangedOrders: 0, ordersProcessed: 2,
  unresolvedOrders: 1, unlinkedAdjustments: 1, adjustedOrders: 1, cancellationsRecovered: 1, sourceDocuments: 7,
  currencies: [
    { currencyCode: 'CAD', netAmount: 0, pricedOrders: 1, unpricedOrders: 0, possibleAdditionalAmount: 20, unpricedPossibleOrders: 0 },
    { currencyCode: 'USD', netAmount: 43.26, pricedOrders: 1, unpricedOrders: 0, possibleAdditionalAmount: 0, unpricedPossibleOrders: 0 },
  ],
};

describe('import operation normalizers', () => {
  it('validates canonical import results, preserving zero, mixed currencies and non-order adjustments', () => {
    const normalized = normalizeOperationEnvelope({ operation: { ...operation, status: 'succeeded', result: { totalAmount: null, receiptOutcome } } });
    expect(normalized.result?.receiptOutcome).toEqual(receiptOutcome);
    expect(normalized.result?.totalAmount).toBeNull();
  });
  it.each([
    null, {}, { ...receiptOutcome, policyVersion: 2 }, { ...receiptOutcome, newOrders: '1' },
    { ...receiptOutcome, ordersProcessed: 3 }, { ...receiptOutcome, adjustedOrders: 3 },
    { ...receiptOutcome, cancellationsRecovered: 3 }, { ...receiptOutcome, sourceDocuments: -1 },
    { ...receiptOutcome, currencies: [...receiptOutcome.currencies, receiptOutcome.currencies[0]] },
    { ...receiptOutcome, currencies: [{ ...receiptOutcome.currencies[0], netAmount: 0.123 }] },
  ])('rejects malformed canonical import outcomes', bad => {
    expect(() => normalizeOperationEnvelope({ operation: { ...operation, result: { receiptOutcome: bad } } })).toThrow('Invalid import outcome response');
  });
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
