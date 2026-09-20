/** Final canonical orders checked by one operation, not raw email/export document counts. */
export interface ReceiptImportOutcome {
  policyVersion: 3;
  newOrders: number;
  updatedOrders: number;
  unchangedOrders: number;
  unresolvedOrders: number;
  unlinkedAdjustments: number;
  adjustedOrders: number;
  cancellationsRecovered: number;
  ordersProcessed: number;
  sourceDocuments: number;
  currencies: {
    currencyCode: "CAD" | "USD" | "EUR" | "GBP" | "UNKNOWN";
    netAmount: number;
    pricedOrders: number;
    unpricedOrders: number;
    possibleAdditionalAmount: number;
    unpricedPossibleOrders: number;
  }[];
}
