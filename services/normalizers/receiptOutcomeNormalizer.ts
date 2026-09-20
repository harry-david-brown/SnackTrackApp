import type {
  ReceiptConfidence,
  ReceiptOrderOutcome,
} from "@/types/receiptOutcome";

const invalid = (field: string): never => {
  throw new Error(`Invalid receipt response: ${field}`);
};
const record = (value: unknown, field: string): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid(field);
const member = <T extends string>(
  value: unknown,
  choices: readonly T[],
  field: string,
): T => choices.find((choice) => choice === value) ?? invalid(field);
const confidence = (value: unknown, field: string): ReceiptConfidence =>
  member(value, ["confirmed", "inferred", "unknown", "conflicted"], field);
const money = (value: unknown, field: string): number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1_000_000 &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
    ? value
    : invalid(field);
const nullableMoney = (value: unknown, field: string): number | null =>
  value === null ? null : money(value, field);

export function normalizeReceiptOrderDay(
  value: unknown,
  field: string,
): string | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    return invalid(field);
  return value;
}

export function normalizeReceiptOutcome(
  value: unknown,
  field: string,
): ReceiptOrderOutcome {
  const o = record(value, field);
  if (o.version !== 3) invalid(`${field}.version`);
  const day = normalizeReceiptOrderDay(o.orderDay, `${field}.orderDay`);
  if (!Array.isArray(o.events) || o.events.length > 10000)
    invalid(`${field}.events`);
  const result: ReceiptOrderOutcome = {
    version: 3,
    counting: member(
      o.counting,
      ["established_order", "possible_additional_order", "unlinked_adjustment"],
      `${field}.counting`,
    ),
    orderDay: day,
    fulfillment: member(
      o.fulfillment,
      ["completed", "canceled", "failed", "unfulfilled", "unknown"],
      `${field}.fulfillment`,
    ),
    fulfillmentConfidence: confidence(
      o.fulfillmentConfidence,
      `${field}.fulfillmentConfidence`,
    ),
    refundStatus: member(
      o.refundStatus,
      [
        "none_established",
        "confirmed_unclassified",
        "partial",
        "full",
        "reversed",
        "probable_full",
        "zero_unexplained",
        "conflicted",
      ],
      `${field}.refundStatus`,
    ),
    refundConfidence: confidence(
      o.refundConfidence,
      `${field}.refundConfidence`,
    ),
    financialConfidence: confidence(
      o.financialConfidence,
      `${field}.financialConfidence`,
    ),
    originalCharge: nullableMoney(o.originalCharge, `${field}.originalCharge`),
    netAmount: nullableMoney(o.netAmount, `${field}.netAmount`),
    confirmedRefundAmount: nullableMoney(
      o.confirmedRefundAmount,
      `${field}.confirmedRefundAmount`,
    ),
    estimatedRefundAmount: nullableMoney(
      o.estimatedRefundAmount,
      `${field}.estimatedRefundAmount`,
    ),
    cancellationCharge: nullableMoney(
      o.cancellationCharge,
      `${field}.cancellationCharge`,
    ),
    events: (o.events as unknown[]).map((value, i) => {
      const eventField = `${field}.events.${i}`;
      const e = record(value, eventField);
      return {
        kind: member(
          e.kind,
          ["charge", "refund", "charge_adjustment", "refund_reversal"],
          `${eventField}.kind`,
        ),
        amount: money(e.amount, `${eventField}.amount`),
        tender: member(
          e.tender,
          ["card", "provider_wallet", "other", "unknown"],
          `${eventField}.tender`,
        ),
        confidence: confidence(e.confidence, `${eventField}.confidence`),
        currencyCode: member(
          e.currencyCode,
          ["CAD", "USD", "EUR", "GBP", "UNKNOWN"],
          `${eventField}.currencyCode`,
        ),
      };
    }),
  };
  if (result.counting === "unlinked_adjustment" && result.orderDay !== null)
    invalid(`${field}.orderDay`);
  if (result.financialConfidence === "conflicted" && result.netAmount !== null)
    invalid(`${field}.netAmount`);
  return result;
}
