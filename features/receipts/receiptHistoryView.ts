import type { Receipt, UserSummary } from '@/types/api';
import type { OrderMetricPeriods } from '@/types/orderMetrics';
import { receiptHistoryDay } from './receiptOutcomePresentation';
import { orderMetricActivityLabel } from './orderMetricPresentation';
import type { ReceiptOutcomeFilter } from '@/types/receiptOutcome';
import { formatReceiptMoney } from '@utils/receiptMoney';

export type ReceiptHistoryProvider = 'all' | 'uber_eats' | 'doordash';

export interface ReceiptHistoryFilterSelection {
  provider: ReceiptHistoryProvider;
  dateRange: ReceiptHistoryDateRange;
  outcome: ReceiptOutcomeFilter | 'all';
}

export const defaultReceiptHistoryFilters: ReceiptHistoryFilterSelection = {
  provider: 'all',
  dateRange: 'all',
  outcome: 'all',
};

export const receiptProviderFilters: readonly { value: ReceiptHistoryProvider; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'uber_eats', label: 'Uber Eats' },
  { value: 'doordash', label: 'DoorDash' },
];

export const receiptDateRangeFilters: readonly { value: ReceiptHistoryDateRange; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
];

export const receiptOutcomeFilters: readonly { value: ReceiptOutcomeFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All activity' }, { value: 'delivered', label: 'Delivered' },
  { value: 'canceled', label: 'Canceled' }, { value: 'refunded', label: 'Confirmed refunds' },
  { value: 'possible_refund', label: 'Possible refunds' }, { value: 'failed', label: 'Failed' },
  { value: 'unfulfilled', label: 'Not fulfilled' }, { value: 'needs_review', label: 'Needs review' },
  { value: 'unknown_cost', label: 'Unknown cost' },
];

export type ReceiptHistoryDateRange = 'all' | 'this_month' | 'last_3_months';

export interface ReceiptHistorySection {
  key: string;
  title: string;
  summary: string | null;
  data: Receipt[];
}

/** Never present a loaded page, uncertain cost, or unmatched adjustment as a complete spend total. */
export function receiptHistoryFilteredSpend(
  receipts: readonly Receipt[],
  total: number,
  hasNextPage: boolean,
  formatCurrency: (value: number) => string,
): string | null {
  if (!receipts.length || hasNextPage || receipts.length !== total) return null;
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    const outcome = receipt.orderOutcome;
    const currency = receipt.currencyCode;
    if (!currency || !['CAD', 'USD', 'EUR', 'GBP'].includes(currency)) return null;
    if (outcome && (outcome.counting !== 'established_order' || outcome.financialConfidence !== 'confirmed')) return null;
    if (!outcome && receipt.reconciliation?.status === 'unresolved') return null;
    const amount = outcome ? outcome.netAmount : receipt.amountSpent;
    if (amount === null) return null;
    totals.set(currency, (totals.get(currency) ?? 0) + Math.round(amount * 100));
  }
  return [...totals].map(([currency, cents]) => formatReceiptMoney(cents / 100, currency, formatCurrency)).join(' + ');
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
  orderMetricPeriods?: OrderMetricPeriods,
): ReceiptHistorySection[] {
  const grouped = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    const key = receiptHistoryDay(receipt)?.slice(0, 7) ?? 'unknown';
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
      const metrics = orderMetricPeriods?.months[key];
      const title = key === 'unknown'
        ? 'Date unavailable'
        : new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          });
      return {
        key,
        title,
        summary: showCanonicalMonthTotals && metrics ? orderMetricActivityLabel(metrics) : showCanonicalMonthTotals && !orderMetricPeriods && month
          ? `${month.receiptCount} ${month.receiptCount === 1 ? 'order' : 'orders'}`
          : null,
        data,
      };
    });
}
