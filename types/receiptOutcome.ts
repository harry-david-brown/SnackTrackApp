export type ReceiptOutcomeFilter = 'delivered' | 'canceled' | 'refunded' | 'possible_refund' | 'failed' | 'unfulfilled' | 'needs_review' | 'unknown_cost';

export type ReceiptConfidence =
  "confirmed" | "inferred" | "unknown" | "conflicted";

/** Optional policy-3 history contract. Absent means the legacy receipt contract. */
export interface ReceiptOrderOutcome {
  version: 3;
  counting:
    "established_order" | "possible_additional_order" | "unlinked_adjustment";
  orderDay: string | null;
  fulfillment: "completed" | "canceled" | "failed" | "unfulfilled" | "unknown";
  fulfillmentConfidence: ReceiptConfidence;
  refundStatus:
    | "none_established"
    | "confirmed_unclassified"
    | "partial"
    | "full"
    | "reversed"
    | "probable_full"
    | "zero_unexplained"
    | "conflicted";
  refundConfidence: ReceiptConfidence;
  originalCharge: number | null;
  netAmount: number | null;
  confirmedRefundAmount: number | null;
  estimatedRefundAmount: number | null;
  cancellationCharge: number | null;
  financialConfidence: ReceiptConfidence;
  events: {
    kind: "charge" | "refund" | "charge_adjustment" | "refund_reversal";
    amount: number;
    tender: "card" | "provider_wallet" | "other" | "unknown";
    currencyCode: "CAD" | "USD" | "EUR" | "GBP" | "UNKNOWN";
    confidence: ReceiptConfidence;
  }[];
}
