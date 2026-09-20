import type { WrappedSpending } from "@/types/api";
import { formatReceiptMoney } from "@utils/receiptMoney";

/** Show available amounts without turning missing prices into zero or mixing currencies. */
export function wrappedSpendingLines(
  data: WrappedSpending,
  legacyFormat: (amount: number) => string,
): string[] {
  if (data.spending === undefined) {
    return data.totalSpent === null ? [] : [`Total: ${legacyFormat(data.totalSpent)}`];
  }
  return data.spending.filter(currency => currency.pricedOrders > 0).map(currency =>
    `${currency.unknownPriceOrders ? 'Tracked spending' : 'Total'}: ${formatReceiptMoney(currency.netSpend, currency.currencyCode, legacyFormat)}`,
  );
}
