import React from "react";
import { render } from "@testing-library/react-native";
import { buildWrappedSlides } from "@components/wrapped/buildWrappedSlides";
import { WrappedStaticRenderContext } from "@components/wrapped/WrappedSlideEffects";
import {
  orderRecapPresentation,
} from "@components/wrapped/orderRecapPresentation";
import {
  normalizeOrderMetrics,
  normalizeDeliveryDayRanking,
} from "@services/normalizers/orderMetricNormalizers";
import type { UserSummary } from "@/types/api";
import fixture from "@/__tests__/fixtures/order-event-metrics.json";

function summary(): UserSummary {
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
    orderMetrics: normalizeOrderMetrics(fixture.metrics),
    wrappedAnalytics: {
      coverage: {
        orderCount: 5,
        earliestOrderDate: null,
        latestOrderDate: null,
        dataSources: ["csv", "email"],
        hasExportData: true,
      },
      orderMetrics: normalizeOrderMetrics(fixture.metrics),
      deliveryDayRanking: normalizeDeliveryDayRanking(
        fixture.ranking,
        "ranking",
      ),
      // Deliberately stale legacy field: policy 3 must use the canonical ranking.
      shame: {
        laziestDay: {
          date: "2023-12-10",
          dayOfWeek: "Sunday",
          orderCount: 8,
          totalSpent: 198.97,
          restaurants: [],
          message: "Wrong",
        },
      },
      flex: {},
      comparative: {},
      patterns: {},
    },
  };
}
const slides = (analytics: UserSummary) =>
  buildWrappedSlides({
    analytics,
    formatCurrency: (n) => `$${n.toFixed(2)}`,
    formatDate: (day) => day,
  });

it("renders the corrected delivery slide in the static sharing path, not the stale eight-order story", () => {
  const deck = slides(summary());
  expect(deck.some((s) => s.id === "laziest-day")).toBe(false);
  const slide = deck.find((s) => s.id === "most-deliveries-day");
  expect(slide?.a11y).toContain("4 deliveries on 2023-12-10");
  expect(slide?.a11y).not.toContain("198.97");
  const screen = render(
    <WrappedStaticRenderContext.Provider value>
      {slide?.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(screen.getByText("Most deliveries in a day")).toBeTruthy();
  expect(screen.getByText("4")).toBeTruthy();
  expect(screen.getByText(/Total:.*113\.76/)).toBeTruthy();
  expect(screen.queryByText(/Canceled orders excluded/)).toBeNull();
  screen.unmount();
});

it.each(['unresolved_orders', 'missing_order_dates', 'unknown_fulfillment'] as const)(
  "keeps the recap variety and finale without %s diagnostics",
  reason => {
    const data = summary();
    data.wrappedAnalytics!.deliveryDayRanking = { status: 'matching', reason };
    data.wrappedAnalytics!.orderMetrics!.unknownFulfillment = 81;
    data.wrappedAnalytics!.orderMetrics!.possibleAdditionalOrders = 2;
    data.wrappedAnalytics!.orderMetrics!.unlinkedAdjustments = 2;
    data.wrappedAnalytics!.orderMetrics!.likelyRefunds = 3;
    data.wrappedAnalytics!.shame.longestStreak = {
      days: 7, startDate: '2023-12-01', endDate: '2023-12-07', totalSpent: 80, message: 'A streak',
    };
    data.wrappedAnalytics!.flex.nightOwl = {
      count: 20, percentage: 75, totalSpent: 20, latestOrder: '3:00 AM', message: 'Night owl',
    };
    data.topRestaurants = ['McDonald’s', 'Pizza Pizza', 'Metro'].map(name => ({ name, count: 20, totalSpent: 50 }));
    const deck = slides(data);
    const ids = deck.map(s => s.id);
    for (const id of ['lifetime-damage', 'longest-streak', 'night-owl', 'top-spots', 'order-picture', 'case-closed', 'lifetime-archetype'])
      expect(ids).toContain(id);
    expect(ids).not.toContain('laziest-day');
    expect(ids).not.toContain('most-deliveries-day');
    expect(ids[ids.length - 1]).toBe('lifetime-archetype');
    const picture = deck.find(s => s.id === 'order-picture')!;
    const screen = render(
      <WrappedStaticRenderContext.Provider value>{picture.content}</WrappedStaticRenderContext.Provider>,
    );
    expect(screen.getByText('5 order attempts · 1 canceled')).toBeTruthy();
    expect(screen.getByText('1 confirmed refund')).toBeTruthy();
    expect(screen.queryByText(/unknown|not yet established|matching|possible refunds|known costs only/i)).toBeNull();
    expect(picture.a11y).not.toMatch(/unknown|matching|possible refunds/i);
    screen.unmount();
  },
);

it("does not label an entirely unknown day cost as a settled zero-dollar day", () => {
  const data = summary();
  const ranking = data.wrappedAnalytics!.deliveryDayRanking!;
  if (ranking.status !== "available") throw new Error("Invalid fixture");
  Object.assign(ranking.spending[0], {
    deliveredNetSpend: 0,
    pricedOrders: 0,
    unknownPriceOrders: 4,
  });
  const slide = slides(data).find((s) => s.id === "most-deliveries-day");
  expect(slide?.a11y).not.toContain("net cost unavailable");
  expect(slide?.a11y).not.toContain("$0");
});

it("retains backward-compatible presentation for older servers without inventing outcomes", () => {
  const data = summary();
  delete data.orderMetrics;
  delete data.wrappedAnalytics!.orderMetrics;
  delete data.wrappedAnalytics!.deliveryDayRanking;
  data.unresolvedReceiptCount = 2;
  expect(orderRecapPresentation(data)).toBeUndefined();
  expect(slides(data).some((s) => s.id === "laziest-day")).toBe(true);
});

it("explains the currency and metric-specific comparison pool in recap and sharing content", () => {
  const data = summary();
  data.wrappedAnalytics!.percentiles = {
    policyVersion: 3,
    sampleSize: 200,
    currencyCode: "CAD",
    methodology: "Separate eligible groups.",
    totalSpent: { percentile: 90, topPercent: 10, sampleSize: 150 },
    nightOwl: { percentile: 80, topPercent: 20, sampleSize: 200 },
  };
  data.wrappedAnalytics!.flex.nightOwl = {
    count: 3,
    percentage: 75,
    totalSpent: 20,
    latestOrder: "3:00 AM",
    message: "Night owl",
  };
  const deck = slides(data);
  const damage = deck.find((s) => s.id === "lifetime-damage");
  expect(damage?.a11y).toContain("Top 10% by CAD net cost");
  expect(damage?.a11y).toContain("150 comparable accounts");
  const screen = render(
    <WrappedStaticRenderContext.Provider value>
      {damage?.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(screen.getByText("Top 10% by CAD net cost")).toBeTruthy();
  expect(
    screen.getByText(/150 comparable accounts · imported histories vary/),
  ).toBeTruthy();
  screen.unmount();
  const owl = deck.find((s) => s.id === "night-owl");
  expect(owl?.a11y).toContain("timed deliveries ordered between 10pm–4am");
  expect(owl?.a11y).toContain("200 comparable accounts");
  const nightScreen = render(
    <WrappedStaticRenderContext.Provider value>
      {owl?.content}
    </WrappedStaticRenderContext.Provider>,
  );
  expect(nightScreen.getByText("Top 20% by late-night share")).toBeTruthy();
  nightScreen.unmount();
});

it("never attaches a stale legacy or different-currency spending rank to an order-event recap", () => {
  const data = summary();
  data.wrappedAnalytics!.percentiles = {
    sampleSize: 200,
    totalSpent: { percentile: 99, topPercent: 1 },
  };
  expect(
    slides(data).find((s) => s.id === "lifetime-damage")?.a11y,
  ).not.toContain("Top");
  data.wrappedAnalytics!.percentiles = {
    policyVersion: 3,
    sampleSize: 200,
    currencyCode: "USD",
    methodology: "Separate eligible groups.",
    totalSpent: { percentile: 99, topPercent: 1, sampleSize: 200 },
  };
  expect(
    slides(data).find((s) => s.id === "lifetime-damage")?.a11y,
  ).not.toContain("Top");
});
