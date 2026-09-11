import {
  resolveDashboardMonthOptions,
  greetingForDate,
  resolveDashboardPeriodSummary,
} from '@features/dashboard/dashboardPeriodSummary';
import type { UserSummary } from '@/types/api';

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
  it('builds the current-month comparison from the canonical monthly summary', () => {
    expect(resolveDashboardPeriodSummary(summary, 'monthly', '2026-09', new Date(2026, 8, 1))).toMatchObject({
      monthKey: '2026-09',
      monthLabel: 'September 2026',
      isCurrentMonth: true,
      label: 'September delivery spending',
      totalSpent: 150,
      receiptCount: 6,
      averageOrderValue: 25,
      comparison: { difference: -30, direction: 'down', previousLabel: 'August' },
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
