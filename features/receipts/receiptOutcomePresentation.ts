import { DataSource, type Receipt } from "@/types/api";
import type { ReceiptOrderOutcome } from "@/types/receiptOutcome";
import { formatReceiptMoney } from "@utils/receiptMoney";

const fulfillmentLabels: Record<ReceiptOrderOutcome["fulfillment"], string | undefined> = {
  completed: "Delivered",
  canceled: "Canceled",
  failed: "Failed",
  unfulfilled: "Not fulfilled",
  unknown: undefined,
};
const refundLabels: Record<
  ReceiptOrderOutcome["refundStatus"],
  string | undefined
> = {
  none_established: undefined,
  confirmed_unclassified: "Refunded",
  partial: "Partially refunded",
  full: "Fully refunded",
  reversed: "Refund reversed",
  probable_full: undefined,
  zero_unexplained: undefined,
  conflicted: "Refund evidence needs review",
};

export function receiptHistoryDay(receipt: Receipt): string | null {
  if (receipt.orderOutcome) return receipt.orderOutcome.orderDay;
  if (receipt.orderDay !== undefined) return receipt.orderDay;
  const date = receipt.orderDate ? new Date(receipt.orderDate) : null;
  return date && Number.isFinite(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : null;
}

/** Presentation only: amounts and counting eligibility are decided by the API. */
export function receiptOutcomePresentation(
  receipt: Receipt,
  formatCurrency: (value: number) => string,
) {
  const outcome = receipt.orderOutcome;
  const money = (n: number) =>
    formatReceiptMoney(n, receipt.currencyCode, formatCurrency);
  const combined =
    receipt.sources?.includes(DataSource.EMAIL) &&
    receipt.sources?.includes(DataSource.CSV);
  const sourceLabel = combined ? "Email and export combined" : undefined;
  if (!outcome)
    return {
      amount: money(receipt.amountSpent),
      amountLabel: undefined,
      status: undefined,
      notice:
        receipt.reconciliation?.status === "unresolved"
          ? "Possible duplicate · included in totals until matched"
          : undefined,
      sourceLabel,
      details: [] as { label: string; value: string }[],
    };

  const adjustment = outcome.counting === "unlinked_adjustment";
  const possible = outcome.counting === "possible_additional_order";
  const confirmed = outcome.fulfillmentConfidence === "confirmed";
  const fulfillment = fulfillmentLabels[outcome.fulfillment];
  const status = adjustment
    ? "Adjustment · order not matched"
    : [
        confirmed ? fulfillment : undefined,
        refundLabels[outcome.refundStatus],
      ]
        .filter(Boolean)
        .join(" · ");
  const amount = adjustment ? outcome.confirmedRefundAmount : outcome.netAmount;
  const amountLabel = adjustment
    ? outcome.confirmedRefundAmount !== null
      ? "Confirmed refund"
      : "Adjustment"
    : possible
      ? "Possible order cost"
      : outcome.financialConfidence === "inferred"
        ? "Estimated total"
        : undefined;
  const notices: string[] = [];
  if (adjustment)
    notices.push("Kept separate from order counts and net cost until matched.");
  if (possible)
    notices.push(
      "Possible additional order · kept separate from order counts and net cost.",
    );
  if (outcome.financialConfidence === "conflicted")
    notices.push("Sources disagree; final cost needs review.");

  const details: { label: string; value: string }[] = [];
  if (!adjustment) {
    details.push({
      label: "Original charge",
      value:
        outcome.originalCharge === null
          ? "Unknown"
          : money(outcome.originalCharge),
    });
    if (outcome.fulfillment === "canceled")
      details.push({
        label: "Cancellation cost",
        value:
          outcome.cancellationCharge === null
            ? "Unknown"
            : money(outcome.cancellationCharge),
      });
  }
  if (
    outcome.confirmedRefundAmount !== null ||
    outcome.refundConfidence === "confirmed"
  )
    details.push({
      label: "Confirmed refund",
      value:
        outcome.confirmedRefundAmount === null
          ? "Amount unknown"
          : money(outcome.confirmedRefundAmount),
    });
  if (outcome.estimatedRefundAmount !== null)
    details.push({
      label: "Estimated refund",
      value: money(outcome.estimatedRefundAmount),
    });
  const tenderLabel = (event: ReceiptOrderOutcome["events"][number]) =>
    event.tender === "provider_wallet"
      ? receipt.receiptType === "uber_eats"
        ? "Uber Cash"
        : "Provider wallet"
      : event.tender === "card"
        ? "Card"
        : event.tender === "other"
          ? "Other payment"
          : "Payment method unknown";
  const eventLabels = {
    charge: "Charged",
    refund: "Refunded",
    charge_adjustment: "Additional charge",
    refund_reversal: "Refund reversed",
  };
  for (const event of outcome.events)
    details.push({
      label: `${eventLabels[event.kind]} · ${tenderLabel(event)}${event.confidence !== "confirmed" ? " (uncertain)" : ""}`,
      value: formatReceiptMoney(
        event.amount,
        event.currencyCode,
        formatCurrency,
      ),
    });
  return {
    amount:
      amount === null
        ? adjustment
          ? "Amount unknown"
          : "Cost unknown"
        : money(amount),
    amountLabel,
    status,
    notice: notices.join(" ") || undefined,
    sourceLabel,
    details,
  };
}
