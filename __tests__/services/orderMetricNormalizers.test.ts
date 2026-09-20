import {
  normalizeOrderMetrics,
  normalizeDeliveryDayRanking,
  normalizeOrderMetricPeriods,
} from "@services/normalizers/orderMetricNormalizers";
import { normalizeUserSummary } from "@services/analyticsApi";
import fixture from "@/__tests__/fixtures/order-event-metrics.json";
import { userSummaryFixture } from "@/__tests__/fixtures/contracts";

jest.mock("@services/api");

describe("order-event analytics boundary", () => {
  it("retains confirmed refunds whose full/partial classification is unknown", () => {
    const metrics = {
      ...fixture.metrics,
      fullyRefunded: 0,
      unclassifiedRefunds: 1,
    };
    expect(normalizeOrderMetrics(metrics).unclassifiedRefunds).toBe(1);
    expect(normalizeOrderMetrics(metrics).confirmedRefunds).toBe(1);
    expect(normalizeOrderMetrics(metrics).fullyRefunded).toBe(0);
    const { unclassifiedRefunds: _omitted, ...olderMetrics } = fixture.metrics;
    expect(normalizeOrderMetrics(olderMetrics).unclassifiedRefunds).toBe(0);
    for (const value of [-1, 0.5, null, "1"])
      expect(() =>
        normalizeOrderMetrics({ ...metrics, unclassifiedRefunds: value }),
      ).toThrow();
  });

  it("decodes the API December replay without dropping wallet flows or financial uncertainty", () => {
    expect(normalizeOrderMetrics(fixture.metrics)).toEqual(fixture.metrics);
    expect(normalizeDeliveryDayRanking(fixture.ranking, "ranking")).toEqual(
      fixture.ranking,
    );
    const currencies = normalizeOrderMetrics(fixture.metrics).currencies;
    expect(
      currencies[0].payments.find((p) => p.tender === "provider_wallet"),
    ).toEqual({
      tender: "provider_wallet",
      charges: 25.69,
      refunds: 22.48,
      refundReversals: 0,
    });
  });

  it("rejects invalid versions, missing fields, fractional counts, currencies and duplicate tender rows", () => {
    for (const value of [
      { ...fixture.metrics, policyVersion: 2 },
      { ...fixture.metrics, deliveries: 4.5 },
      { ...fixture.metrics, attempts: 8 },
      { ...fixture.metrics, currencies: undefined },
      {
        ...fixture.metrics,
        currencies: [{ ...fixture.metrics.currencies[0], currencyCode: "ZZZ" }],
      },
      {
        ...fixture.metrics,
        currencies: [{ ...fixture.metrics.currencies[0], netSpend: "157.02" }],
      },
      {
        ...fixture.metrics,
        currencies: [
          {
            ...fixture.metrics.currencies[0],
            payments: [
              fixture.metrics.currencies[0].payments[0],
              fixture.metrics.currencies[0].payments[0],
            ],
          },
        ],
      },
    ])
      expect(() => normalizeOrderMetrics(value)).toThrow(
        "Invalid order metrics response",
      );
  });

  it("validates calendar dates and does not turn missing ranking evidence into an available day", () => {
    expect(() =>
      normalizeDeliveryDayRanking(
        { ...fixture.ranking, day: "2023-02-30" },
        "ranking",
      ),
    ).toThrow();
    expect(() =>
      normalizeDeliveryDayRanking(
        { ...fixture.ranking, deliveries: 8 },
        "ranking",
      ),
    ).toThrow();
    expect(
      normalizeDeliveryDayRanking(
        { status: "matching", reason: "unknown_fulfillment" },
        "ranking",
      ),
    ).toEqual({ status: "matching", reason: "unknown_fulfillment" });
    expect(normalizeDeliveryDayRanking({ status: "empty" }, "ranking")).toEqual(
      { status: "empty" },
    );
  });

  it("keeps the optional summary, period and Wrapped extensions across the public normalizer", () => {
    const periods = {
      days: { "2023-12-10": fixture.metrics },
      months: { "2023-12": fixture.metrics },
      undatedRecords: 0,
    };
    const summary = normalizeUserSummary(
      {
        ...userSummaryFixture,
        statistics: {
          ...userSummaryFixture.statistics,
          totalSpent: 157.02,
          totalReceipts: 5,
          orderMetrics: fixture.metrics,
          orderMetricPeriods: periods,
        },
        wrappedAnalytics: {
          coverage: {
            orderCount: 5,
            earliestOrderDate: null,
            latestOrderDate: null,
            dataSources: ["csv", "email"],
            hasExportData: true,
          },
          orderMetrics: fixture.metrics,
          deliveryDayRanking: fixture.ranking,
          shame: {},
          flex: {},
          patterns: {},
          comparative: {},
        },
      },
      true,
    );
    expect(summary.orderMetrics?.attempts).toBe(5);
    expect(summary.orderMetricPeriods).toEqual(periods);
    expect(summary.wrappedAnalytics?.deliveryDayRanking).toEqual(
      fixture.ranking,
    );
    expect(normalizeOrderMetricPeriods(periods, "periods")).toEqual(periods);
    expect(() =>
      normalizeOrderMetricPeriods(
        { ...periods, months: { "2023-13": fixture.metrics } },
        "periods",
      ),
    ).toThrow();
    expect(
      normalizeUserSummary(userSummaryFixture).orderMetrics,
    ).toBeUndefined();
  });
});
