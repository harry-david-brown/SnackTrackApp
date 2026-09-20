import type { OrderMetrics } from "@/types/orderMetrics";
import { formatReceiptMoney } from '@utils/receiptMoney';

export function orderMetricKnownCostLabel(metrics: OrderMetrics, formatCurrency: (value: number) => string): string {
  const costs = metrics.currencies.filter(currency => currency.pricedOrders > 0).map(currency =>
    formatReceiptMoney(currency.netSpend, currency.currencyCode, formatCurrency));
  return costs.length ? `${costs.join(' + ')} tracked` : metrics.attempts > 0 ? 'Spending unavailable' : 'No spending yet';
}

export const orderMetricActivityLabel = (metrics: OrderMetrics): string =>
  `${metrics.attempts} ${metrics.attempts === 1 ? "order" : "orders"}`;
