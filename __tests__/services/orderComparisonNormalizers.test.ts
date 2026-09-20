import { normalizeWrappedPercentiles } from "@services/normalizers/orderComparisonNormalizers";
import { normalizeWrappedAnalytics } from "@services/analyticsApi";

jest.mock("@services/api");

const comparison = {
  policyVersion: 3,
  sampleSize: 200,
  currencyCode: "CAD",
  methodology: "Separate eligible groups.",
  totalSpent: { percentile: 29, topPercent: 71, sampleSize: 200 },
  orderCount: { percentile: 60, topPercent: 40, sampleSize: 100 },
};

it("preserves current comparison policy, currency, methodology and independent denominators through the public API boundary", () => {
  const result = normalizeWrappedAnalytics({
    coverage: {
      orderCount: 5,
      earliestOrderDate: null,
      latestOrderDate: null,
      dataSources: ["csv", "email"],
      hasExportData: true,
    },
    shame: {},
    flex: {},
    comparative: {},
    patterns: {},
    percentiles: comparison,
  });
  expect(result.percentiles).toEqual(comparison);
});

it("rejects impossible, undersized, wrong-currency and unversioned comparison metadata", () => {
  for (const invalid of [
    { ...comparison, policyVersion: 4 },
    { ...comparison, sampleSize: 100 },
    { ...comparison, currencyCode: "UNKNOWN" },
    { ...comparison, methodology: "" },
    { ...comparison, totalSpent: { ...comparison.totalSpent, sampleSize: 99 } },
    { ...comparison, totalSpent: { ...comparison.totalSpent, topPercent: 70 } },
    {
      ...comparison,
      totalSpent: { ...comparison.totalSpent, percentile: 100, topPercent: 0 },
    },
    { ...comparison, policyVersion: undefined },
    { ...comparison, totalSpent: null },
  ])
    expect(() => normalizeWrappedPercentiles(invalid, "percentiles")).toThrow(
      "Invalid analytics response",
    );
});

it("retains legacy comparison responses without inventing a policy or per-metric denominator", () => {
  const legacy = {
    sampleSize: 100,
    totalSpent: { percentile: 100, topPercent: 1 },
  };
  expect(normalizeWrappedPercentiles(legacy, "percentiles")).toEqual(legacy);
});
