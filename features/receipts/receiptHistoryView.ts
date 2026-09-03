import type { Receipt, UserSummary } from '@/types/api';

export type ReceiptHistoryDateRange = 'all' | 'this_month' | 'last_3_months';

export interface ReceiptHistorySection {
  key: string;
  title: string;
  summary: string | null;
  data: Receipt[];
}

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function receiptDateFilters(
  range: ReceiptHistoryDateRange,
  now = new Date(),
): { startDate?: string } {
  if (range === 'all') return {};
  const start = range === 'this_month'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { startDate: localDate(start) };
}

export function resolveReceiptHistorySections(
  receipts: Receipt[],
  monthlyBreakdown: UserSummary['monthlyBreakdown'] = [],
  showCanonicalMonthTotals = false,
): ReceiptHistorySection[] {
  const grouped = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    const parsed = receipt.orderDate ? new Date(receipt.orderDate) : null;
    const key = parsed && !Number.isNaN(parsed.getTime())
      ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
      : 'unknown';
    grouped.set(key, [...(grouped.get(key) ?? []), receipt]);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      if (left === 'unknown') return 1;
      if (right === 'unknown') return -1;
      return right.localeCompare(left);
    })
    .map(([key, data]) => {
      const month = monthlyBreakdown.find((entry) => entry.month === key);
      const title = key === 'unknown'
        ? 'Date unavailable'
        : new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          });
      return {
        key,
        title,
        summary: showCanonicalMonthTotals && month
          ? `${month.receiptCount} ${month.receiptCount === 1 ? 'order' : 'orders'}`
          : null,
        data,
      };
    });
}
