import type { OrderMetrics } from '@/types/orderMetrics';

/** Older summaries have no per-currency counts. Preserve their reported spending. */
export function currencyPricedCount(metrics: OrderMetrics | undefined, currency: string | undefined, fallback: number) {
  if (!metrics) return fallback;
  return metrics.currencies.find(bucket => bucket.currencyCode === currency)?.pricedOrders ?? 0;
}

export function spendingCoverage(priced: number, orders: number, currency?: string) {
  const countLabel = `${priced} priced ${priced === 1 ? 'order' : 'orders'}`;
  return {
    available: priced > 0,
    partial: priced < orders,
    pricedLabel: currency ? `${countLabel} (${currency})` : countLabel,
  };
}
