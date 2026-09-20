import { DataSource, ReceiptType, type Receipt } from '@/types/api';
import {
  receiptDateFilters,
  receiptHistoryFilteredSpend,
  resolveReceiptHistorySections,
} from '@features/receipts/receiptHistoryView';
import { normalizeReceipt } from '@services/api/receiptApi';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import { orderMetricKnownCostLabel } from '@features/receipts/orderMetricPresentation';
import historyFixture from '@/__tests__/fixtures/order-event-history.json';
import metricsFixture from '@/__tests__/fixtures/order-event-metrics.json';

jest.mock('@services/api/client');

const receipt = (id: string, orderDate: string | null): Receipt => ({
  id,
  userId: 'user-1',
  restaurantName: 'Restaurant',
  orderDate,
  amountSpent: 20,
  items: [],
  dataSource: DataSource.EMAIL,
  receiptType: ReceiptType.UBER_EATS,
});

describe('receipt history view', () => {
  it('groups newest months first and keeps undated orders last', () => {
    const result = resolveReceiptHistorySections([
      receipt('old', '2026-08-10T12:00:00.000Z'),
      receipt('unknown', null),
      receipt('new', '2026-09-01T12:00:00.000Z'),
    ]);
    expect(result.map((section) => section.key)).toEqual(['2026-09', '2026-08', 'unknown']);
  });
  it('uses the server calendar day for legacy records instead of the device interpretation', () => {
    const value = { ...receipt('travel', '2024-01-31T12:30:00Z'), orderDay: '2024-02-01' };
    expect(resolveReceiptHistorySections([value])[0].key).toBe('2024-02');
    expect(resolveReceiptHistorySections([{ ...value, orderDay: null }])[0].key).toBe('unknown');
  });

  it('uses canonical month counts only for the unfiltered history', () => {
    const result = resolveReceiptHistorySections(
      [receipt('one', '2026-09-01T12:00:00.000Z')],
      [{ month: '2026-09', totalSpent: 100, receiptCount: 4 }],
      true,
    );
    expect(result[0].summary).toBe('4 orders');
  });

  it('produces stable local date filters', () => {
    const now = new Date(2026, 8, 20);
    expect(receiptDateFilters('all', now)).toEqual({});
    expect(receiptDateFilters('this_month', now)).toEqual({ startDate: '2026-09-01' });
    expect(receiptDateFilters('last_3_months', now)).toEqual({ startDate: '2026-07-01' });
  });

  it('uses event-timezone days for grouping instead of reinterpreting them in the device timezone', () => {
    const base = normalizeReceipt(historyFixture[0]);
    const traveler = { ...base, orderDate: '2024-01-31T12:30:00Z', orderOutcome: { ...base.orderOutcome!, orderDay: '2024-02-01' } };
    const adjustment = { ...base, orderOutcome: { ...base.orderOutcome!, counting: 'unlinked_adjustment' as const, orderDay: null } };
    expect(resolveReceiptHistorySections([traveler, adjustment]).map(s => s.key)).toEqual(['2024-02', 'unknown']);
  });

  it('uses the complete month metrics, never the number of records on the currently loaded page', () => {
    const metrics = normalizeOrderMetrics(metricsFixture.metrics);
    const periods = { days: {}, months: { '2023-12': metrics }, undatedRecords: 0 };
    const rows = [normalizeReceipt(historyFixture[0])];
    expect(resolveReceiptHistorySections(rows, [{ month: '2023-12', totalSpent: 198.97, receiptCount: 8 }], true, periods)[0].summary).toBe('5 orders');
    expect(resolveReceiptHistorySections(rows, [], false, periods)[0].summary).toBeNull();
  });

  it('labels unknown costs instead of calling them zero, and never combines currencies into a converted total', () => {
    const metrics = normalizeOrderMetrics(metricsFixture.metrics);
    const money = (n: number) => `$${n.toFixed(2)}`;
    expect(orderMetricKnownCostLabel(metrics, money)).toBe('$157.02 tracked');
    const unknown = { ...metrics, currencies: metrics.currencies.map(c => ({ ...c, pricedOrders: 0, unknownPriceOrders: 5, netSpend: 0 })) };
    expect(orderMetricKnownCostLabel(unknown, money)).toBe('Spending unavailable');
    const multiple = { ...metrics, currencies: [...metrics.currencies, { ...metrics.currencies[0], currencyCode: 'USD' as const, netSpend: 61.39 }] };
    expect(orderMetricKnownCostLabel(multiple, money)).toBe('$157.02 + US$61.39 tracked');
  });

  it('totals only a complete filtered list, using net costs and keeping currencies separate', () => {
    const rows = historyFixture.map(value => normalizeReceipt({ ...value, amountSpent: 999 }));
    const money = (value: number) => `$${value.toFixed(2)}`;
    expect(receiptHistoryFilteredSpend(rows, rows.length, false, money)).toBe('$157.02');
    expect(receiptHistoryFilteredSpend(rows.slice(0, 2), rows.length, true, money)).toBeNull();
    expect(receiptHistoryFilteredSpend(rows.slice(0, 2), rows.length, false, money)).toBeNull();
    expect(receiptHistoryFilteredSpend(rows, rows.length, true, money)).toBeNull();
    const usd = { ...rows[1], id: 'usd-order', currencyCode: 'USD' };
    expect(receiptHistoryFilteredSpend([...rows, usd], rows.length + 1, false, money)).toBe('$157.02 + US$43.26');
  });

  it('does not present unknown costs, estimates, possible orders, or unmatched refunds as a complete spending total', () => {
    const base = normalizeReceipt(historyFixture[0]);
    const money = (value: number) => `$${value.toFixed(2)}`;
    const uncertain: Receipt[] = [
      { ...base, currencyCode: 'UNKNOWN' },
      { ...base, currencyCode: undefined },
      { ...base, orderOutcome: { ...base.orderOutcome!, netAmount: null } },
      { ...base, orderOutcome: { ...base.orderOutcome!, financialConfidence: 'inferred' } },
      { ...base, orderOutcome: { ...base.orderOutcome!, financialConfidence: 'conflicted' } },
      { ...base, orderOutcome: { ...base.orderOutcome!, counting: 'unlinked_adjustment' } },
      { ...base, orderOutcome: { ...base.orderOutcome!, counting: 'possible_additional_order' } },
    ];
    for (const row of uncertain) expect(receiptHistoryFilteredSpend([row], 1, false, money)).toBeNull();
    expect(receiptHistoryFilteredSpend([], 0, false, money)).toBeNull();
  });
});
