import type { UserSummary } from '@/types/api';

export type DashboardPeriod = 'current_month' | 'all_time';

export interface DashboardPeriodSummary {
  period: DashboardPeriod;
  label: string;
  totalSpent: number;
  receiptCount: number;
  averageOrderValue: number;
  comparison: {
    difference: number;
    direction: 'up' | 'down' | 'same';
    previousLabel: string;
  } | null;
}

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long' });

export const greetingForDate = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export function resolveDashboardPeriodSummary(
  summary: UserSummary | null,
  period: DashboardPeriod,
  now = new Date(),
): DashboardPeriodSummary {
  if (period === 'all_time') {
    const totalSpent = summary?.totalSpent ?? 0;
    const receiptCount = summary?.totalReceipts ?? 0;
    return {
      period,
      label: 'All-time delivery spending',
      totalSpent,
      receiptCount,
      averageOrderValue: receiptCount > 0 ? totalSpent / receiptCount : 0,
      comparison: null,
    };
  }

  const currentKey = monthKey(now);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previousDate);
  const current = summary?.monthlyBreakdown.find((month) => month.month === currentKey);
  const previous = summary?.monthlyBreakdown.find((month) => month.month === previousKey);
  const totalSpent = current?.totalSpent ?? 0;
  const receiptCount = current?.receiptCount ?? 0;
  const difference = totalSpent - (previous?.totalSpent ?? 0);

  return {
    period,
    label: `${monthLabel(now)} delivery spending`,
    totalSpent,
    receiptCount,
    averageOrderValue: receiptCount > 0 ? totalSpent / receiptCount : 0,
    comparison: previous
      ? {
          difference,
          direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same',
          previousLabel: monthLabel(previousDate),
        }
      : null,
  };
}
