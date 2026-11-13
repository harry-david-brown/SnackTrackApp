import { profileReceiptSummary } from '@features/profile/profileReceiptSummary';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import fixture from '@/__tests__/fixtures/order-event-metrics.json';

const format = (amount: number) => `$${amount.toFixed(2)}`;
const metrics = normalizeOrderMetrics(fixture.metrics);

it('shows one converted total and preserves canonical order counts', () => {
  const result = profileReceiptSummary({ totalReceipts: 8, orderMetrics: metrics,
    normalizedSpend: { amount: 172.02, currencyCode: 'CAD', approximate: true },
  }, format, 'CAD');
  expect(result).toEqual({ totalSpent: '≈ $172.02', totalReceipts: 5, orderCountLabel: 'Orders' });
});

it('does not mark same-currency spending as converted', () => {
  expect(profileReceiptSummary({ totalReceipts: 1,
    normalizedSpend: { amount: 12, currencyCode: 'CAD', approximate: false },
  }, format, 'CAD').totalSpent).toBe('$12.00');
});

it('does not relabel stale, missing or unconvertible amounts as the selected currency', () => {
  expect(profileReceiptSummary(undefined, format, 'CAD').totalSpent).toBe('—');
  for (const normalizedSpend of [undefined,
    { amount: null, currencyCode: 'CAD', approximate: false },
    { amount: 12, currencyCode: 'USD', approximate: false },
  ]) {
    expect(profileReceiptSummary({ totalReceipts: 1, normalizedSpend }, format, 'CAD').totalSpent).toBe('Spending unavailable');
  }
});

it('distinguishes pending analytics from a genuinely empty ledger', () => {
  expect(profileReceiptSummary(undefined, format, 'CAD').totalReceipts).toBeNull();
  expect(profileReceiptSummary({ totalReceipts: 0 }, format, 'CAD').totalReceipts).toBe(0);
});
