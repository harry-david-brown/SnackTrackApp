import { profileReceiptSummary } from '@features/profile/profileReceiptSummary';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import fixture from '@/__tests__/fixtures/order-event-metrics.json';

const format = (amount: number) => `legacy ${amount.toFixed(2)}`;
const metrics = normalizeOrderMetrics(fixture.metrics);

it('Profile uses the five canonical attempts and wallet-inclusive net cost, not the old scalar', () => {
  const result = profileReceiptSummary({ totalSpent: 198.97, totalReceipts: 8, orderMetrics: metrics }, format);
  expect(result.totalSpent).toContain('157.02');
  expect(result.totalSpent).not.toContain('198.97');
  expect(result.totalReceipts).toBe(5);
  expect(result.orderCountLabel).toBe('Orders');
});

it('keeps different currencies separate and does not add diagnostic banners', () => {
  const result = profileReceiptSummary({ totalSpent: 0, totalReceipts: 8, orderMetrics: {
    ...metrics, possibleAdditionalOrders: 2,
    currencies: [metrics.currencies[0], { ...metrics.currencies[0], currencyCode: 'USD', netSpend: 10, unknownPriceOrders: 1 }],
  } }, format);
  expect(result.totalSpent).toContain('157.02');
  expect(result.totalSpent).toContain('10.00');
  expect(result.totalSpent).not.toContain('167.02');
  expect(result).not.toHaveProperty('receiptQualityNotice');
});

it('does not invent zero while loading and preserves older-server formatting', () => {
  expect(profileReceiptSummary(undefined, format).totalSpent).toBe('—');
  expect(profileReceiptSummary({ totalSpent: 12, totalReceipts: 1 }, format)).toMatchObject({ totalSpent: 'legacy 12.00', totalReceipts: 1, orderCountLabel: 'Orders' });
  expect(profileReceiptSummary({ totalSpent: 0, totalReceipts: 1, orderMetrics: {
    ...metrics, currencies: [{ ...metrics.currencies[0], pricedOrders: 0, unknownPriceOrders: 5 }],
  } }, format).totalSpent).toBe('Spending unavailable');
});
