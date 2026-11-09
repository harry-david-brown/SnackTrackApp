import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { normalizeReceipt } from "@services/api/receiptApi";
import {
  receiptHistoryDay,
  receiptOutcomePresentation,
} from "@features/receipts/receiptOutcomePresentation";
import { ReceiptCard, receiptItemPricePresentation } from "@components/receipts/ReceiptCard";
import { DataSource, type Receipt } from "@/types/api";
import fixture from "@/__tests__/fixtures/order-event-history.json";

jest.mock("@services/api/client");
const money = (n: number) => `$${n.toFixed(2)}`;
const receipt = (index = 0): Receipt => normalizeReceipt(fixture[index]);
const view = (value: Receipt) => receiptOutcomePresentation(value, money);

it('presents resolved and recorded-only item amounts without internal terminology', () => {
  expect(receiptItemPricePresentation({ name: 'Wrap', quantity: 1, price: 5.49 }, money)).toEqual({
    primary: '$5.49',
    accessibility: '$5.49',
  });
  expect(receiptItemPricePresentation({ name: 'Wrap', quantity: 2, price: 5.49, configuredLineTotal: 10.98 }, money)).toEqual({
    primary: '$5.49 each',
    secondary: 'Line total $10.98',
    accessibility: '$5.49 each, line total $10.98',
  });
  expect(receiptItemPricePresentation({ name: 'Wrap', quantity: 2, price: 0, recordedPrice: 5.49 }, money)).toEqual({
    primary: '$5.49',
    secondary: 'Recorded price',
    accessibility: '$5.49, recorded price',
  });
});

it('does not show unspecified delivery status as a user-facing badge', () => {
  const value = receipt(2);
  value.orderOutcome!.fulfillment = 'unknown';
  value.orderOutcome!.fulfillmentConfidence = 'unknown';
  expect(view(value).status).toBe('');
  const screen = render(<ReceiptCard receipt={value} expanded={false} formatCurrency={money} onToggle={jest.fn()} />);
  expect(screen.queryByText(/unknown|not established/i)).toBeNull();
});

it("shows all five canonical December attempts, four deliveries and net costs, ignoring legacy compatibility amounts", () => {
  const receipts = fixture.map((value) =>
    normalizeReceipt({ ...value, amountSpent: 999 }),
  );
  expect(receipts.map((value) => view(value).amount)).toEqual([
    "$0.00",
    "$43.26",
    "$19.47",
    "$48.46",
    "$45.83",
  ]);
  expect(
    receipts.filter((value) => view(value).status?.startsWith("Delivered")),
  ).toHaveLength(4);
  expect(view(receipts[0]).status).toBe("Delivered · Fully refunded");
  expect(view(receipts[1]).status).toBe("Canceled");
  expect(view(receipts[1]).details).toContainEqual({
    label: "Cancellation cost",
    value: "$43.26",
  });
  expect(
    receipts.reduce(
      (total, value) =>
        total + Math.round(value.orderOutcome!.netAmount! * 100),
      0,
    ),
  ).toBe(15702);
});

it("renders an email-only refund with no items as expandable payment details, with an accessible wallet refund", () => {
  const value = { ...receipt(), items: [] };
  const toggle = jest.fn();
  const screen = render(
    <ReceiptCard
      receipt={value}
      expanded={false}
      formatCurrency={money}
      onToggle={toggle}
    />,
  );
  fireEvent.press(screen.getByRole("button"));
  expect(toggle).toHaveBeenCalledWith(value.id);
  screen.rerender(
    <ReceiptCard
      receipt={value}
      expanded
      formatCurrency={money}
      onToggle={toggle}
    />,
  );
  expect(screen.getByText("Delivered · Fully refunded")).toBeTruthy();
  expect(screen.getByText("Refunded · Uber Cash")).toBeTruthy();
  expect(screen.getByRole("button").props.accessibilityState.expanded).toBe(
    true,
  );
  expect(screen.getByRole("button").props.accessibilityLabel).toContain(
    "Refunded · Uber Cash: $22.48",
  );
});

it("keeps split tender payments as a breakdown of the McDonald’s cost rather than extra spending", () => {
  const value = receipt(4);
  const screen = render(
    <ReceiptCard
      receipt={value}
      expanded
      formatCurrency={money}
      onToggle={jest.fn()}
    />,
  );
  expect(screen.getByText("Charged · Card")).toBeTruthy();
  expect(screen.getByText("Charged · Uber Cash")).toBeTruthy();
  expect(screen.getByText("$39.61")).toBeTruthy();
  expect(screen.getByText("$6.22")).toBeTruthy();
  expect(view(value).amount).toBe("$45.83");
  expect(view(value).sourceLabel).toBe("Combined from email and your downloaded file");
});

it('keeps export item customizations accessible without using item prices as the refunded order cost', () => {
  const value = { ...receipt(), items: [{ name: 'Medium Pizza', quantity: 1, price: 30, customizations: ['Thin crust', 'Extra cheese'] }] };
  const screen = render(<ReceiptCard receipt={value} expanded formatCurrency={money} onToggle={jest.fn()} />);
  expect(screen.getByText('Thin crust · Extra cheese')).toBeTruthy();
  expect(screen.getByText('$30.00')).toBeTruthy();
  expect(screen.getByRole('button').props.accessibilityLabel).toContain('Thin crust, Extra cheese');
  expect(view(value).amount).toBe('$0.00');
});

it("does not call missing refund amounts free or infer a confirmed refund from a zero export", () => {
  const base = receipt();
  const unknown = {
    ...base,
    amountSpent: 0,
    orderOutcome: {
      ...base.orderOutcome!,
      netAmount: null,
      confirmedRefundAmount: null,
      financialConfidence: "unknown" as const,
      refundStatus: "confirmed_unclassified" as const,
    },
  };
  expect(view(unknown).amount).toBe("Cost unknown");
  expect(view(unknown).notice).toBeUndefined();
  const probable = {
    ...base,
    orderOutcome: {
      ...base.orderOutcome!,
      financialConfidence: "inferred" as const,
      refundConfidence: "inferred" as const,
      refundStatus: "probable_full" as const,
      confirmedRefundAmount: null,
    },
  };
  expect(view(probable).amount).toBe("$0.00");
  expect(view(probable).amountLabel).toBe("Estimated total");
  expect(view(probable).notice).toBeUndefined();
  expect(view(probable).status).not.toMatch(/refund|unknown|possible/i);
});

it("retains possible additional orders and unlinked adjustments without claiming inclusion in canonical totals", () => {
  const base = receipt();
  const possible = {
    ...base,
    orderOutcome: {
      ...base.orderOutcome!,
      counting: "possible_additional_order" as const,
    },
  };
  expect(view(possible).notice).toContain(
    "kept separate from order counts and spending totals",
  );
  const adjustment = {
    ...base,
    orderOutcome: {
      ...base.orderOutcome!,
      counting: "unlinked_adjustment" as const,
      orderDay: null,
      netAmount: null,
    },
  };
  expect(view(adjustment).status).toBe("Adjustment · order not matched");
  expect(view(adjustment).amountLabel).toBe("Confirmed refund");
  expect(view(adjustment).amount).toBe("$22.48");
  expect(receiptHistoryDay(adjustment)).toBeNull();
});

it("preserves the legacy path and does not mislabel same-source receipt revisions as export merges", () => {
  const { orderOutcome, ...legacy } = receipt();
  const value = { ...legacy, sources: [DataSource.EMAIL] };
  expect(view(value).sourceLabel).toBeUndefined();
  expect(view(value).status).toBeUndefined();
  expect(view(value).amount).toBe("$0.00");
});

it.each([DataSource.EMAIL, DataSource.CSV])(
  "%s identity conflicts retain the server's separate-count warning in the card and accessibility label",
  (dataSource) => {
    const value = normalizeReceipt({
      ...fixture[2],
      dataSource,
      sources: [dataSource],
      reconciliation: { status: "unresolved", method: "standalone", reason: "identity_conflict" },
      orderOutcome: { ...fixture[2].orderOutcome, counting: "possible_additional_order" },
    });
    const presentation = view(value);
    expect(presentation.amountLabel).toBe("Possible order cost");
    expect(presentation.notice).toContain("kept separate from order counts and spending totals");
    expect(presentation.sourceLabel).toBeUndefined();
    const screen = render(<ReceiptCard receipt={value} expanded formatCurrency={money} onToggle={jest.fn()} />);
    expect(screen.getByText(presentation.notice!)).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityLabel).toContain("Possible order cost");
    expect(screen.getByRole("button").props.accessibilityLabel).toContain("kept separate from order counts and spending totals");
  },
);

it.each(["full", "partial"] as const)("shows a provider-confirmed %s refund without inventing its amount or net cost", (refundStatus) => {
  const value = normalizeReceipt({ ...fixture[0], items: [], amountSpent: 0,
    orderOutcome: { ...fixture[0].orderOutcome, refundStatus, netAmount: null,
      confirmedRefundAmount: null, estimatedRefundAmount: null, financialConfidence: "unknown", events: [] } });
  const screen = render(<ReceiptCard receipt={value} expanded formatCurrency={money} onToggle={jest.fn()} />);
  expect(screen.getByText(`Delivered · ${refundStatus === "full" ? "Fully" : "Partially"} refunded`)).toBeTruthy();
  expect(screen.queryByText("A refund was applied, but its amount is unknown.")).toBeNull();
  expect(screen.getByText("Amount unknown")).toBeTruthy();
  expect(screen.queryByText("$0.00")).toBeNull();
  expect(screen.getByRole("button").props.accessibilityLabel).toContain("Confirmed refund: Amount unknown");
});

it("keeps known cost and confirmation when only the refund scope needs review", () => {
  const value = normalizeReceipt({ ...fixture[0],
    orderOutcome: { ...fixture[0].orderOutcome, refundStatus: "conflicted", refundConfidence: "confirmed",
      netAmount: 30, confirmedRefundAmount: 10, financialConfidence: "confirmed", events: [] } });
  expect(view(value).status).toBe("Delivered · Refund details need review");
  expect(view(value).amount).toBe("$30.00");
  expect(view(value).details).toContainEqual({ label: "Confirmed refund", value: "$10.00" });
});

it.each([
  { version: 4 },
  { netAmount: -1 },
  { netAmount: "0" },
  { netAmount: Number.NaN },
  { netAmount: 1.234 },
  { refundStatus: "refunded" },
  { counting: "duplicate_hidden" },
  { orderDay: "2023-02-29" },
  { orderDay: "2024-02-30" },
  { orderDay: undefined },
  { financialConfidence: "conflicted", netAmount: 12 },
  {
    events: [
      {
        kind: "refund",
        amount: 22.48,
        confidence: "confirmed",
        tender: "bitcoin",
        currencyCode: "CAD",
      },
    ],
  },
])(
  "rejects malformed outcome fields instead of showing misleading money: %p",
  (override) => {
    expect(() =>
      normalizeReceipt({
        ...fixture[0],
        orderOutcome: { ...fixture[0].orderOutcome, ...override },
      }),
    ).toThrow("Invalid receipt response");
  },
);

it("normalizes supported outcomes but drops unexpected internal source and payment fields", () => {
  const base = fixture[0].orderOutcome;
  const result = normalizeReceipt({
    ...fixture[0],
    orderOutcome: {
      ...base,
      financialObservationIds: ["private"],
      events: base.events.map((e) => ({ ...e, reference: "private" })),
    },
  });
  expect(JSON.stringify(result.orderOutcome)).not.toContain("private");
});
