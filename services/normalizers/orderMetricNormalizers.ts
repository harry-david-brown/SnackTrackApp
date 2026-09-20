import type {
  CurrencyOrderMetrics,
  DeliveryDayRanking,
  OrderMetrics,
  OrderMetricPeriods,
} from "@/types/orderMetrics";

const invalid = (field: string): never => {
  throw new Error(`Invalid order metrics response: ${field}`);
};
const record = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid(field);
  return value as Record<string, unknown>;
};
const amount = (value: unknown, field: string): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
  )
    return invalid(field);
  return value;
};
const count = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    return invalid(field);
  return value;
};
const choice = <T extends string>(
  value: unknown,
  choices: readonly T[],
  field: string,
): T => {
  const found = choices.find((item) => item === value);
  return found === undefined ? invalid(field) : found;
};
const list = (value: unknown, field: string): unknown[] =>
  Array.isArray(value) ? value : invalid(field);
const dayKey = (value: unknown, field: string): string => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    return invalid(field);
  return value;
};

export function normalizeCurrencyOrderMetrics(
  value: unknown,
  field: string,
): CurrencyOrderMetrics {
  const row = record(value, field);
  const result: CurrencyOrderMetrics = {
    currencyCode: choice(
      row.currencyCode,
      ["CAD", "USD", "EUR", "GBP", "UNKNOWN"] as const,
      `${field}.currencyCode`,
    ),
    netSpend: amount(row.netSpend, `${field}.netSpend`),
    deliveredNetSpend: amount(
      row.deliveredNetSpend,
      `${field}.deliveredNetSpend`,
    ),
    cancellationCost: amount(row.cancellationCost, `${field}.cancellationCost`),
    confirmedRefundAmount: amount(
      row.confirmedRefundAmount,
      `${field}.confirmedRefundAmount`,
    ),
    estimatedRefundAmount: amount(
      row.estimatedRefundAmount,
      `${field}.estimatedRefundAmount`,
    ),
    possibleAdditionalSpend: amount(
      row.possibleAdditionalSpend,
      `${field}.possibleAdditionalSpend`,
    ),
    pricedOrders: count(row.pricedOrders, `${field}.pricedOrders`),
    estimatedPriceOrders: count(
      row.estimatedPriceOrders,
      `${field}.estimatedPriceOrders`,
    ),
    unknownPriceOrders: count(
      row.unknownPriceOrders,
      `${field}.unknownPriceOrders`,
    ),
    unpricedPossibleOrders: count(
      row.unpricedPossibleOrders,
      `${field}.unpricedPossibleOrders`,
    ),
    confirmedRefundsWithUnknownAmount: count(
      row.confirmedRefundsWithUnknownAmount,
      `${field}.confirmedRefundsWithUnknownAmount`,
    ),
    payments: list(row.payments, `${field}.payments`).map((value, index) => {
      const paymentField = `${field}.payments.${index}`;
      const payment = record(value, paymentField);
      return {
        tender: choice(
          payment.tender,
          ["card", "provider_wallet", "other", "unknown"] as const,
          `${paymentField}.tender`,
        ),
        charges: amount(payment.charges, `${paymentField}.charges`),
        refunds: amount(payment.refunds, `${paymentField}.refunds`),
        refundReversals: amount(
          payment.refundReversals,
          `${paymentField}.refundReversals`,
        ),
      };
    }),
  };
  if (
    new Set(result.payments.map((p) => p.tender)).size !==
      result.payments.length ||
    result.estimatedPriceOrders > result.pricedOrders
  )
    return invalid(field);
  return result;
}

const currencyList = (value: unknown, field: string) => {
  const result = list(value, field).map((row, i) =>
    normalizeCurrencyOrderMetrics(row, `${field}.${i}`),
  );
  if (new Set(result.map((c) => c.currencyCode)).size !== result.length)
    return invalid(field);
  return result;
};

export { currencyList as normalizeCurrencyOrderMetricList };

export function normalizeOrderMetrics(
  value: unknown,
  field = "orderMetrics",
): OrderMetrics {
  const row = record(value, field);
  if (row.policyVersion !== 3) return invalid(`${field}.policyVersion`);
  const result: OrderMetrics = {
    policyVersion: 3,
    attempts: count(row.attempts, `${field}.attempts`),
    deliveries: count(row.deliveries, `${field}.deliveries`),
    canceled: count(row.canceled, `${field}.canceled`),
    chargedCancellations: count(
      row.chargedCancellations,
      `${field}.chargedCancellations`,
    ),
    zeroBalanceCancellations: count(
      row.zeroBalanceCancellations,
      `${field}.zeroBalanceCancellations`,
    ),
    failed: count(row.failed, `${field}.failed`),
    unfulfilled: count(row.unfulfilled, `${field}.unfulfilled`),
    unknownFulfillment: count(
      row.unknownFulfillment,
      `${field}.unknownFulfillment`,
    ),
    confirmedRefunds: count(row.confirmedRefunds, `${field}.confirmedRefunds`),
    fullyRefunded: count(row.fullyRefunded, `${field}.fullyRefunded`),
    partiallyRefunded: count(
      row.partiallyRefunded,
      `${field}.partiallyRefunded`,
    ),
    unclassifiedRefunds:
      row.unclassifiedRefunds === undefined
        ? 0
        : count(row.unclassifiedRefunds, `${field}.unclassifiedRefunds`),
    reversedRefunds: count(row.reversedRefunds, `${field}.reversedRefunds`),
    likelyRefunds: count(row.likelyRefunds, `${field}.likelyRefunds`),
    possibleAdditionalOrders: count(
      row.possibleAdditionalOrders,
      `${field}.possibleAdditionalOrders`,
    ),
    unlinkedAdjustments: count(
      row.unlinkedAdjustments,
      `${field}.unlinkedAdjustments`,
    ),
    legacyOrders: count(row.legacyOrders, `${field}.legacyOrders`),
    currencies: currencyList(row.currencies, `${field}.currencies`),
  };
  if (
    result.attempts !==
      result.deliveries +
        result.canceled +
        result.failed +
        result.unfulfilled +
        result.unknownFulfillment ||
    result.attempts !==
      result.currencies.reduce(
        (n, c) => n + c.pricedOrders + c.unknownPriceOrders,
        0,
      )
  )
    return invalid(field);
  return result;
}

export function normalizeOrderMetricPeriods(
  value: unknown,
  field: string,
): OrderMetricPeriods {
  const row = record(value, field);
  const periods = (value: unknown, unit: "days" | "months") =>
    Object.fromEntries(
      Object.entries(record(value, `${field}.${unit}`)).map(
        ([key, metrics]) => {
          dayKey(
            unit === "days" ? key : `${key}-01`,
            `${field}.${unit}.${key}`,
          );
          return [
            key,
            normalizeOrderMetrics(metrics, `${field}.${unit}.${key}`),
          ];
        },
      ),
    );
  return {
    days: periods(row.days, "days"),
    months: periods(row.months, "months"),
    undatedRecords: count(row.undatedRecords, `${field}.undatedRecords`),
  };
}

export function normalizeDeliveryDayRanking(
  value: unknown,
  field: string,
): DeliveryDayRanking {
  const row = record(value, field);
  const status = choice(
    row.status,
    ["matching", "empty", "available"] as const,
    `${field}.status`,
  );
  if (status === "empty") return { status };
  if (status === "matching")
    return {
      status,
      reason: choice(
        row.reason,
        [
          "unresolved_orders",
          "unknown_fulfillment",
          "missing_order_dates",
        ] as const,
        `${field}.reason`,
      ),
    };
  const result = {
    status,
    day: dayKey(row.day, `${field}.day`),
    deliveries: count(row.deliveries, `${field}.deliveries`),
    spending: currencyList(row.spending, `${field}.spending`),
  };
  if (
    result.deliveries === 0 ||
    result.deliveries !==
      result.spending.reduce(
        (n, c) => n + c.pricedOrders + c.unknownPriceOrders,
        0,
      )
  )
    return invalid(field);
  return result;
}
