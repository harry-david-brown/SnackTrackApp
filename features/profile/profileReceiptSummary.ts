import type { UserSummary } from '@/types/api';
import type { CurrencyCode } from '@utils/currency';

/** The server converts canonical net costs into the selected profile currency. */
export function profileReceiptSummary(
  analytics: Pick<UserSummary, 'totalReceipts' | 'orderMetrics' | 'normalizedSpend'> | undefined,
  formatCurrency: (value: number) => string,
  currency: CurrencyCode,
) {
  const normalized = analytics?.normalizedSpend;
  const totalSpent = !analytics ? '—'
    : !normalized || normalized.currencyCode !== currency || normalized.amount === null ? 'Spending unavailable'
      : `${normalized.approximate ? '≈ ' : ''}${formatCurrency(normalized.amount)}`;
  return {
    totalSpent,
    totalReceipts: analytics?.orderMetrics?.attempts ?? analytics?.totalReceipts ?? 0,
    orderCountLabel: 'Orders',
  };
}
