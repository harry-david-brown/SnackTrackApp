import {
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
    expect(resolveDashboardPeriodSummary(summary, 'current_month', new Date(2026, 8, 1))).toMatchObject({
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
    expect(resolveDashboardPeriodSummary(summary, 'current_month', new Date(2026, 9, 1))).toMatchObject({
      totalSpent: 0,
      receiptCount: 0,
    });
  });

  it('uses time-aware greeting copy', () => {
    expect(greetingForDate(new Date(2026, 8, 1, 8))).toBe('Good morning');
    expect(greetingForDate(new Date(2026, 8, 1, 14))).toBe('Good afternoon');
    expect(greetingForDate(new Date(2026, 8, 1, 20))).toBe('Good evening');
  });
});
