/** Versioned API read model. Source documents and payment identifiers stay on the server. */
export type OrderMetricCurrency = "CAD" | "USD" | "EUR" | "GBP" | "UNKNOWN";
export interface CurrencyOrderMetrics {
  currencyCode: OrderMetricCurrency;
  netSpend: number;
  deliveredNetSpend: number;
  cancellationCost: number;
  confirmedRefundAmount: number;
  estimatedRefundAmount: number;
  possibleAdditionalSpend: number;
  pricedOrders: number;
  estimatedPriceOrders: number;
  unknownPriceOrders: number;
  unpricedPossibleOrders: number;
  confirmedRefundsWithUnknownAmount: number;
  payments: {
    tender: "card" | "provider_wallet" | "other" | "unknown";
    charges: number;
    refunds: number;
    refundReversals: number;
  }[];
}

export interface OrderMetrics {
  policyVersion: 3;
  attempts: number;
  deliveries: number;
  canceled: number;
  chargedCancellations: number;
  zeroBalanceCancellations: number;
  failed: number;
  unfulfilled: number;
  unknownFulfillment: number;
  confirmedRefunds: number;
  fullyRefunded: number;
  partiallyRefunded: number;
  unclassifiedRefunds: number;
  reversedRefunds: number;
  likelyRefunds: number;
  possibleAdditionalOrders: number;
  unlinkedAdjustments: number;
  legacyOrders: number;
  currencies: CurrencyOrderMetrics[];
}

export interface OrderMetricPeriods {
  days: Record<string, OrderMetrics>;
  months: Record<string, OrderMetrics>;
  undatedRecords: number;
}

export type DeliveryDayRanking =
  | {
      status: "matching";
      reason:
        "unresolved_orders" | "unknown_fulfillment" | "missing_order_dates";
    }
  | { status: "empty" }
  | {
      status: "available";
      day: string;
      deliveries: number;
      spending: CurrencyOrderMetrics[];
    };
