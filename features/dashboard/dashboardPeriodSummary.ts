import type { UserSummary } from '@/types/api';

export type DashboardPeriod = 'monthly' | 'all_time';

export interface DashboardMonthOption {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  isCurrent: boolean;
  hasTrackedOrders: boolean;
}

export interface DashboardPeriodSummary {
  period: DashboardPeriod;
  monthKey: string | null;
  monthLabel: string | null;
  isCurrentMonth: boolean;
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

export const getDashboardMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long' });

const monthAndYearLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const parseMonthKey = (key: string): Date | null => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
};

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const dateFromMonthIndex = (value: number) =>
  new Date(Math.floor(value / 12), value % 12, 1);

const MAX_BROWSABLE_MONTHS = 240;

export function resolveDashboardMonthOptions(
  summary: UserSummary | null,
  now = new Date(),
): DashboardMonthOption[] {
  const currentKey = getDashboardMonthKey(now);
  const currentIndex = monthIndex(now);
  const trackedKeys = new Set(
    (summary?.monthlyBreakdown ?? [])
      .filter((month) => month.receiptCount > 0)
      .map((month) => month.month)
      .filter((month) => {
        const date = parseMonthKey(month);
        return date ? monthIndex(date) <= currentIndex : false;
      }),
  );
  const earliestTrackedIndex = [...trackedKeys]
    .map(parseMonthKey)
    .filter((date): date is Date => Boolean(date))
    .reduce((earliest, date) => Math.min(earliest, monthIndex(date)), currentIndex);
  const firstIndex = Math.max(earliestTrackedIndex, currentIndex - MAX_BROWSABLE_MONTHS + 1);

  return Array.from({ length: currentIndex - firstIndex + 1 }, (_, offset) => {
    const date = dateFromMonthIndex(firstIndex + offset);
    const key = getDashboardMonthKey(date);
    return {
      key,
      label: monthAndYearLabel(date),
      shortLabel: monthLabel(date),
      year: date.getFullYear(),
      isCurrent: key === currentKey,
      hasTrackedOrders: trackedKeys.has(key),
    };
  });
}

export const greetingForDate = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export function resolveDashboardPeriodSummary(
  summary: UserSummary | null,
  period: DashboardPeriod,
  selectedMonthKey = getDashboardMonthKey(),
  now = new Date(),
): DashboardPeriodSummary {
  if (period === 'all_time') {
    const totalSpent = summary?.totalSpent ?? 0;
    const receiptCount = summary?.totalReceipts ?? 0;
    return {
      period,
      monthKey: null,
      monthLabel: null,
      isCurrentMonth: false,
      label: 'All-time delivery spending',
      totalSpent,
      receiptCount,
      averageOrderValue: receiptCount > 0 ? totalSpent / receiptCount : 0,
      comparison: null,
    };
  }

  const currentKey = getDashboardMonthKey(now);
  const selectedDate = parseMonthKey(selectedMonthKey) ?? now;
  const normalizedSelectedKey = getDashboardMonthKey(selectedDate);
  const previousDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  const previousKey = getDashboardMonthKey(previousDate);
  const current = summary?.monthlyBreakdown.find((month) => month.month === normalizedSelectedKey);
  const previous = summary?.monthlyBreakdown.find((month) => month.month === previousKey);
  const totalSpent = current?.totalSpent ?? 0;
  const receiptCount = current?.receiptCount ?? 0;
  const difference = totalSpent - (previous?.totalSpent ?? 0);

  return {
    period,
    monthKey: normalizedSelectedKey,
    monthLabel: monthAndYearLabel(selectedDate),
    isCurrentMonth: normalizedSelectedKey === currentKey,
    label: `${monthLabel(selectedDate)} delivery spending`,
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
