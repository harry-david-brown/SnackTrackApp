import type { ReceiptImportOutcome } from "@features/import-flow/receiptImportOutcome";

const invalid = (): never => {
  throw new Error("Invalid import outcome response");
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
const count = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : invalid();
const amount = (value: unknown): number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
    ? value
    : invalid();

export function normalizeReceiptImportOutcome(
  value: unknown,
): ReceiptImportOutcome {
  const row = object(value);
  if (row.policyVersion !== 3 || !Array.isArray(row.currencies))
    return invalid();
  const currencies = row.currencies.map((raw) => {
    const currency = object(raw);
    const codes = ["CAD", "USD", "EUR", "GBP", "UNKNOWN"] as const;
    const currencyCode = codes.find((code) => code === currency.currencyCode);
    if (!currencyCode) return invalid();
    return {
      currencyCode,
      netAmount: amount(currency.netAmount),
      pricedOrders: count(currency.pricedOrders),
      unpricedOrders: count(currency.unpricedOrders),
      possibleAdditionalAmount: amount(currency.possibleAdditionalAmount),
      unpricedPossibleOrders: count(currency.unpricedPossibleOrders),
    };
  });
  const result: ReceiptImportOutcome = {
    policyVersion: 3,
    newOrders: count(row.newOrders),
    updatedOrders: count(row.updatedOrders),
    unchangedOrders: count(row.unchangedOrders),
    unresolvedOrders: count(row.unresolvedOrders),
    unlinkedAdjustments: count(row.unlinkedAdjustments),
    adjustedOrders: count(row.adjustedOrders),
    cancellationsRecovered: count(row.cancellationsRecovered),
    ordersProcessed: count(row.ordersProcessed),
    sourceDocuments: count(row.sourceDocuments),
    currencies,
  };
  if (
    new Set(currencies.map((currency) => currency.currencyCode)).size !==
      currencies.length ||
    result.ordersProcessed !==
      result.newOrders + result.updatedOrders + result.unchangedOrders ||
    result.adjustedOrders > result.newOrders + result.updatedOrders ||
    result.cancellationsRecovered > result.newOrders + result.updatedOrders ||
    currencies.reduce(
      (sum, currency) => sum + currency.pricedOrders + currency.unpricedOrders,
      0,
    ) !== result.ordersProcessed ||
    currencies.some(
      (currency) => currency.pricedOrders === 0 && currency.netAmount !== 0,
    ) ||
    currencies.reduce(
      (sum, currency) => sum + currency.unpricedPossibleOrders,
      0,
    ) > result.unresolvedOrders
  )
    return invalid();
  return result;
}
