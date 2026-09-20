import React from "react";
import { render } from "@testing-library/react-native";
import { buildWrappedSlides } from "@components/wrapped/buildWrappedSlides";
import { wrappedSpendingLines } from "@components/wrapped/wrappedSpendingPresentation";
import { WrappedStaticRenderContext } from "@components/wrapped/WrappedSlideEffects";
import { normalizeWrappedAnalytics } from "@services/analyticsApi";
import { normalizeOrderMetrics } from "@services/normalizers/orderMetricNormalizers";
import type { UserSummary, WrappedAnalytics } from "@/types/api";
import type { CurrencyOrderMetrics } from "@/types/orderMetrics";
import fixture from "@/__tests__/fixtures/order-event-metrics.json";

jest.mock("@services/api");
const legacyMoney = (n: number) => `$${n.toFixed(2)}`;
const currency = (
  overrides: Partial<CurrencyOrderMetrics> = {},
): CurrencyOrderMetrics => ({
  ...normalizeOrderMetrics(fixture.metrics).currencies[0],
  netSpend: 10,
  deliveredNetSpend: 10,
  cancellationCost: 0,
  confirmedRefundAmount: 0,
  estimatedRefundAmount: 0,
  possibleAdditionalSpend: 0,
  pricedOrders: 1,
  estimatedPriceOrders: 0,
  unknownPriceOrders: 1,
  payments: [],
  ...overrides,
});
function wrapped(): WrappedAnalytics {
  return {
    behaviorPolicyVersion: 1,
    coverage: {
      orderCount: 5,
      earliestOrderDate: null,
      latestOrderDate: null,
      dataSources: ["csv", "email"],
      hasExportData: true,
    },
    orderMetrics: normalizeOrderMetrics(fixture.metrics),
    // Synthetic display scenario: one delivery on the busiest recorded day.
    deliveryDayRanking: {
      status: "available",
      day: "2023-12-10",
      deliveries: 1,
      spending: [currency({ unknownPriceOrders: 0 })],
    },
    shame: {},
    flex: {},
    comparative: {},
    patterns: {},
  };
}
function summary(value: WrappedAnalytics): UserSummary {
  return {
    userId: "fixture-user",
    totalSpent: 157.02,
    totalReceipts: 5,
    averageOrderValue: 31.4,
    currencyCode: "CAD",
    topRestaurants: [],
    monthlyBreakdown: [],
    refundedReceipts: 1,
    dataQuality: { issues: [], recommendations: [] },
    orderMetrics: value.orderMetrics,
    wrappedAnalytics: value,
  };
}
function slide(value: WrappedAnalytics, id: string) {
  const selected = buildWrappedSlides({
    analytics: summary(value),
    formatCurrency: legacyMoney,
    formatDate: (d) => d,
  }).find((s) => s.id === id);
  expect(selected).toBeDefined();
  return selected!;
}

it("does not present an all-unpriced history as zero spending", () => {
  const value = wrapped();
  value.orderMetrics!.currencies = [
    currency({ netSpend: 0, pricedOrders: 0, unknownPriceOrders: 5 }),
  ];
  const data = summary(value);
  data.totalSpent = 0;
  const item = buildWrappedSlides({
    analytics: data,
    formatCurrency: legacyMoney,
    formatDate: (d) => d,
  }).find((s) => s.id === "lifetime-damage")!;
  expect(item.a11y).toContain("Net cost unavailable");
  expect(item.a11y).not.toContain("$0.00");
  const view = render(
    <WrappedStaticRenderContext.Provider value>
      {item.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(view.getByText("Spending unavailable")).toBeTruthy();
  expect(view.queryByText(/\$0\.00/)).toBeNull();
  view.unmount();
});

it("shows known subtotals with unpriced counts and keeps currencies separate", () => {
  const lines = wrappedSpendingLines(
    {
      totalSpent: null,
      spending: [
        currency(),
        currency({ currencyCode: "USD", netSpend: 7, unknownPriceOrders: 0 }),
      ],
    },
    legacyMoney,
  );
  expect(lines).toEqual([
    "Tracked spending: $10.00",
    "Total: US$7.00",
  ]);
  expect(lines.join(" ")).not.toContain("$17.00");
  expect(
    wrappedSpendingLines(
      {
        totalSpent: null,
        spending: [currency({ netSpend: 0, pricedOrders: 0 })],
      },
      legacyMoney,
    ),
  ).toEqual([]);
  expect(
    wrappedSpendingLines(
      {
        totalSpent: 0,
        spending: [currency({ netSpend: 0, unknownPriceOrders: 0 })],
      },
      legacyMoney,
    ),
  ).toEqual(["Total: $0.00"]);
});

it("labels estimates and unknown currencies without interpreting them as dollars", () => {
  expect(
    wrappedSpendingLines(
      {
        totalSpent: 10,
        spending: [
          currency({ unknownPriceOrders: 0, estimatedPriceOrders: 1 }),
        ],
      },
      legacyMoney,
    )[0],
  ).toBe("Total: $10.00");
  expect(
    wrappedSpendingLines(
      {
        totalSpent: null,
        spending: [
          currency({ currencyCode: "UNKNOWN", unknownPriceOrders: 0 }),
        ],
      },
      legacyMoney,
    ),
  ).toEqual(["Total: 10.00 (currency unknown)"]);
  expect(wrappedSpendingLines({ totalSpent: 15.3 }, legacyMoney)).toEqual([
    "Total: $15.30",
  ]);
});

it("decodes nullable story amounts and no price offender without discarding behavior counts", () => {
  const value = wrapped();
  value.shame.lateNightOrders = {
    count: 2,
    totalSpent: null,
    spending: [currency()],
    latestOrder: "2:17 AM",
  };
  value.flex.coffeeAddiction = {
    orderCount: 3,
    totalSpent: null,
    averagePrice: null,
    mostOrdered: "Latte",
    message: "Coffee deliveries",
    disclaimer: "Not an allocated coffee cost.",
  };
  const decoded = normalizeWrappedAnalytics(value);
  expect(decoded.behaviorPolicyVersion).toBe(1);
  expect(decoded.shame.lateNightOrders?.count).toBe(2);
  expect(decoded.shame.lateNightOrders?.worstOffender).toBeUndefined();
  expect(decoded.shame.lateNightOrders?.spending?.[0].unknownPriceOrders).toBe(
    1,
  );
  expect(decoded.flex.coffeeAddiction?.totalSpent).toBeNull();
  expect(decoded.flex.coffeeAddiction?.disclaimer).toBe(
    "Not an allocated coffee cost.",
  );
  for (const bad of [
    { ...value, behaviorPolicyVersion: 2 },
    {
      ...value,
      shame: {
        lateNightOrders: { ...value.shame.lateNightOrders, totalSpent: 0 },
      },
    },
    {
      ...value,
      shame: {
        lateNightOrders: {
          ...value.shame.lateNightOrders,
          spending: [currency({ unknownPriceOrders: 0.5 })],
        },
      },
    },
    {
      ...value,
      shame: {
        lateNightOrders: {
          ...value.shame.lateNightOrders,
          spending: [currency(), currency()],
        },
      },
    },
    {
      ...value,
      shame: {
        lateNightOrders: {
          ...value.shame.lateNightOrders,
          worstOffender: { amount: "free" },
        },
      },
    },
  ])
    expect(() => normalizeWrappedAnalytics(bad)).toThrow();
});

it("renders and describes incomplete late-night costs without a fabricated $0 offender", () => {
  const value = wrapped();
  value.shame.lateNightOrders = {
    count: 5,
    totalSpent: null,
    spending: [currency({ pricedOrders: 4 })],
    latestOrder: "2:17 AM",
  };
  const item = slide(value, "late-night-orders");
  expect(item.a11y).toContain("5 deliveries ordered");
  expect(item.a11y).not.toContain("unpriced order");
  const view = render(
    <WrappedStaticRenderContext.Provider value>
      {item.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(view.getByText("Latest order time: 2:17 AM")).toBeTruthy();
  expect(
    view.getByText("Tracked spending: $10.00"),
  ).toBeTruthy();
  expect(view.queryByText(/\$0\.00/)).toBeNull();
  view.unmount();
});

it("renders coffee frequency, never list prices as spending, in the sharing path", () => {
  const value = wrapped();
  value.flex.coffeeAddiction = {
    orderCount: 3,
    totalSpent: null,
    averagePrice: null,
    mostOrdered: "Latte (3 times)",
    message: "Coffee deliveries",
    disclaimer: "Discounts and refunds cannot be allocated to coffee alone.",
  };
  const item = slide(value, "coffee-addiction");
  expect(item.a11y).toContain(
    "3 completed restaurant deliveries included coffee",
  );
  expect(item.a11y).not.toContain("spent on coffee");
  const view = render(
    <WrappedStaticRenderContext.Provider value>
      {item.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(view.getByText("Coffee deliveries")).toBeTruthy();
  expect(view.getByText("3")).toBeTruthy();
  expect(view.queryByText("spent on coffee")).toBeNull();
  expect(view.queryByText(/\$/)).toBeNull();
  view.unmount();
});

it("keeps grocery-aware delivery timing factual and peak hour about ordering, not hunger", () => {
  const value = wrapped();
  value.patterns.deliveryWaits = {
    totalMinutes: 900,
    averageMinutes: 45,
    totalOrders: 20,
    longestWait: {
      minutes: 55,
      restaurant: "Metro",
      amount: null,
      currencyCode: "CAD",
      message: "Recorded interval",
    },
  };
  const decoded = normalizeWrappedAnalytics(value);
  expect(decoded.patterns.deliveryWaits?.longestWait?.amount).toBeNull();
  const timing = slide(value, "delivery-waits");
  expect(timing.a11y).toContain("recorded delivery intervals");
  expect(timing.a11y).not.toContain("not time spent actively waiting");
  value.patterns.peakHungerHour = {
    hour: 13,
    hourDisplay: "1:00 PM",
    orderCount: 3,
    percentageOfTotal: 60,
    message: "Placement hour",
  };
  const peak = slide(value, "peak-hunger-hour");
  expect(peak.a11y).toContain("Peak Hunger Hour");
  expect(peak.a11y).not.toContain("hungriest");
});

it("omits a weekend ratio with no weekday baseline and accepts distinct category costs", () => {
  const value = wrapped();
  value.patterns.weekendWarrior = {
    weekendOrders: 4,
    weekdayOrders: 0,
    weekendSpending: null,
    weekdaySpending: null,
    weekendCosts: [currency()],
    weekdayCosts: [],
    ratio: null,
    ratioBasis: "deliveries_per_day",
    message: "No weekday baseline",
  };
  const decoded = normalizeWrappedAnalytics(value);
  expect(decoded.patterns.weekendWarrior?.ratio).toBeNull();
  expect(
    buildWrappedSlides({
      analytics: summary(decoded),
      formatCurrency: legacyMoney,
      formatDate: (d) => d,
    }).some((s) => s.id === "weekend-warrior"),
  ).toBe(false);
  expect(() =>
    normalizeWrappedAnalytics({
      ...value,
      patterns: {
        weekendWarrior: {
          ...value.patterns.weekendWarrior,
          ratioBasis: "spend",
        },
      },
    }),
  ).toThrow();
});

it('renders historical investment values with approved names and accessible methodology', () => {
  const value = wrapped();
  value.comparative.historicalInvestment = {
    modelVersion: 'historical-v1', snapshotId: '12345678-1234-1234-1234-123456789abc', valuationDate: '2026-08-31', currencyCode: 'CAD',
    contributionCount: 5, contributed: 100, selectedBenchmark: 'nasdaq', outcomes: { sp500: { value: 110, gain: 10 }, nasdaq: { value: 120, gain: 20 } },
  };
  const slides = buildWrappedSlides({ analytics: summary(value), formatCurrency: legacyMoney, formatDate: date => date });
  const historical = slides.find(s => s.id === 'historical-investment');
  expect(historical).toBeDefined();
  expect(historical?.a11y).toContain('Nasdaq');
  expect(historical?.a11y).toContain('S&P 500');
  expect(historical?.a11y).not.toMatch(/SPY|QQQ|7%|missed gains/);
  const screen = render(<WrappedStaticRenderContext.Provider value={true}>{historical?.content}</WrappedStaticRenderContext.Provider>);
  expect(screen.getByText(/Based on Nasdaq performance through 2026-08-31/)).toBeTruthy();
});

it('includes the historical investment in the modern recap without exceeding six selected stories', () => {
  const value = wrapped();
  value.comparative.historicalInvestment = {
    modelVersion: 'historical-v1', snapshotId: '12345678-1234-1234-1234-123456789abc', valuationDate: '2026-08-31', currencyCode: 'CAD',
    contributionCount: 5, contributed: 100, selectedBenchmark: 'sp500', outcomes: { sp500: { value: 120, gain: 20 }, nasdaq: { value: 110, gain: 10 } },
  };
  value.recap = { version: 1, currency: 'CAD', rateSnapshot: 'test', spending: { amount: 100, approximate: false, pricedOrders: 5, missingPrices: 0, assumedCurrencies: 0 },
    stories: Array.from({ length: 8 }, (_, i) => ({ id: `story-${i}`, category: 'habit' as const, family: `family-${i}`, overlaps: [], specificity: 1, score: 90 - i, title: 'A habit', value: 5, format: 'number' as const, label: 'orders', detail: 'From your history.', punchline: '' })),
  };
  const slides = buildWrappedSlides({ analytics: summary(value), formatCurrency: legacyMoney, formatDate: date => date });
  expect(slides.some(s => s.id === 'historical-investment')).toBe(true);
  expect(slides.filter(s => s.id.startsWith('story-')).length).toBe(5);
  expect(slides.find(s => s.id === 'historical-investment')?.a11y).toContain('S&P 500');
});
