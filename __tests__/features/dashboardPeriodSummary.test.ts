import {
  resolveDashboardMonthOptions,
  greetingForDate,
  resolveDashboardPeriodSummary,
} from '@features/dashboard/dashboardPeriodSummary';
import type { UserSummary } from '@/types/api';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import metricFixture from '@/__tests__/fixtures/order-event-metrics.json';

const summary: UserSummary = {
  userId: 'user-1',
  totalSpent: 420,
  totalReceipts: 20,
  averageOrderValue: 21,
  topRestaurants: [],
  monthlyBreakdown: [
    { month: '2026-08', totalSpent: 180, receiptCount: 8 },
    { month: '2026-09', totalSpent: 150, receiptCount: 6 },
  ],
  refundedReceipts: 0,
  dataQuality: { issues: [], recommendations: [] },
};

describe('dashboard period summary', () => {
  it('does not compare a partial current month to a full prior month without daily evidence', () => {
    expect(resolveDashboardPeriodSummary(summary, 'monthly', '2026-09', new Date(2026, 8, 1))).toMatchObject({
      monthKey: '2026-09',
      monthLabel: 'September 2026',
      isCurrentMonth: true,
      label: 'September delivery spending',
      totalSpent: 150,
      receiptCount: 6,
      averageOrderValue: 25,
      comparison: null,
    });
  });

  it('uses canonical all-time totals without a month comparison', () => {
    expect(resolveDashboardPeriodSummary(summary, 'all_time')).toMatchObject({
      totalSpent: 420,
      receiptCount: 20,
      averageOrderValue: 21,
      comparison: null,
    });
  });

  it('returns an intentional zero state for a month with no orders', () => {
    expect(resolveDashboardPeriodSummary(summary, 'monthly', '2026-10', new Date(2026, 9, 1))).toMatchObject({
      totalSpent: 0,
      receiptCount: 0,
      isCurrentMonth: true,
    });
  });

  it('resolves a selected historical month against the preceding calendar month', () => {
    expect(resolveDashboardPeriodSummary(summary, 'monthly', '2026-08', new Date(2026, 8, 1))).toMatchObject({
      monthKey: '2026-08',
      monthLabel: 'August 2026',
      isCurrentMonth: false,
      totalSpent: 180,
      receiptCount: 8,
      averageOrderValue: 22.5,
      comparison: null,
    });
  });

  it('provides every calendar month from the first tracked month through the current month', () => {
    const sparseSummary = {
      ...summary,
      monthlyBreakdown: [
        { month: '2026-06', totalSpent: 80, receiptCount: 3 },
        { month: '2026-09', totalSpent: 150, receiptCount: 6 },
      ],
    };

    expect(resolveDashboardMonthOptions(sparseSummary, new Date(2026, 8, 1))).toEqual([
      expect.objectContaining({ key: '2026-06', shortLabel: 'June', hasTrackedOrders: true, isCurrent: false }),
      expect.objectContaining({ key: '2026-07', shortLabel: 'July', hasTrackedOrders: false, isCurrent: false }),
      expect.objectContaining({ key: '2026-08', shortLabel: 'August', hasTrackedOrders: false, isCurrent: false }),
      expect.objectContaining({ key: '2026-09', shortLabel: 'September', hasTrackedOrders: true, isCurrent: true }),
    ]);
  });

  it('uses time-aware greeting copy', () => {
    expect(greetingForDate(new Date(2026, 8, 1, 8))).toBe('Good morning');
    expect(greetingForDate(new Date(2026, 8, 1, 14))).toBe('Good afternoon');
    expect(greetingForDate(new Date(2026, 8, 1, 20))).toBe('Good evening');
  });
});

it('compares equivalent elapsed days when daily evidence is supplied', () => {
  const result = resolveDashboardPeriodSummary({ ...summary, dailyBreakdown: {
    '2026-09-01': { count: 1, total: 20 }, '2026-08-01': { count: 1, total: 15 },
    '2026-08-20': { count: 2, total: 99 },
  } }, 'monthly', '2026-09', new Date(2026, 8, 1));
  expect(result.comparison).toMatchObject({ difference: 5, previousLabel: 'the first 1 days of August' });
});

it('Home period projections retain canonical delivery, cancellation, refund and wallet metrics', () => {
  const metrics = normalizeOrderMetrics(metricFixture.metrics);
  const data: UserSummary = { ...summary, currencyCode: 'CAD', totalSpent: 157.02, totalReceipts: 5, orderMetrics: metrics,
    monthlyBreakdown: [{ month: '2023-12', totalSpent: 157.02, receiptCount: 5 }],
    orderMetricPeriods: { days: { '2023-12-10': metrics }, months: { '2023-12': metrics }, undatedRecords: 0 } };
  expect(resolveDashboardPeriodSummary(data, 'all_time').orderMetrics).toEqual(metrics);
  expect(resolveDashboardPeriodSummary(data, 'monthly', '2023-12')).toMatchObject({ label: 'December delivery spending', totalSpent: 157.02, receiptCount: 5, orderMetrics: { deliveries: 4, chargedCancellations: 1, confirmedRefunds: 1 } });
  metrics.possibleAdditionalOrders = 1;
});

it('does not claim a month-over-month increase while either month has unresolved or unpriced orders', () => {
  const currentMetrics = normalizeOrderMetrics(metricFixture.metrics);
  currentMetrics.possibleAdditionalOrders = 2;
  const data: UserSummary = { ...summary, orderMetrics: currentMetrics,
    orderMetricPeriods: { days: {}, months: { '2026-09': currentMetrics, '2026-08': normalizeOrderMetrics(metricFixture.metrics) }, undatedRecords: 0 } };
  expect(resolveDashboardPeriodSummary(data, 'monthly', '2026-09', new Date(2026, 9, 1)).comparison).toBeNull();
});
