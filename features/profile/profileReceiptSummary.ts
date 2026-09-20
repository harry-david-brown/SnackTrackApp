import type { OrderMetrics } from '@/types/orderMetrics';
import { orderMetricKnownCostLabel } from '@features/receipts/orderMetricPresentation';

/** Profile uses the same currency-separated canonical totals as History and Summary. */
export function profileReceiptSummary(
  analytics: { totalSpent: number; totalReceipts: number; orderMetrics?: OrderMetrics } | undefined,
  formatCurrency: (value: number) => string,
) {
  const metrics = analytics?.orderMetrics;
  return {
    totalSpent: metrics ? orderMetricKnownCostLabel(metrics, formatCurrency) : analytics ? formatCurrency(analytics.totalSpent) : '—',
    totalReceipts: metrics?.attempts ?? analytics?.totalReceipts ?? 0,
    orderCountLabel: 'Orders',
  };
}
