import { normalizeHistoricalInvestment } from "@services/historicalInvestment";
import {
  historicalInvestmentLabel,
  historicalInvestmentMethodology,
  investmentBenchmarkNames,
} from "@utils/historicalInvestmentPresentation";
import { insightHistoryDestination } from "@features/navigation/appDestinations";
const result = {
  modelVersion: "historical-v1",
  snapshotId: "12345678-1234-1234-1234-123456789abc",
  valuationDate: "2026-08-31",
  currencyCode: "CAD",
  contributionCount: 5,
  contributed: 100,
  selectedBenchmark: "nasdaq",
  outcomes: {
    sp500: { value: 110, gain: 10 },
    nasdaq: { value: 120, gain: 20 },
  },
};
describe("historical investment transport and presentation", () => {
  it("normalizes both scenarios and keeps benchmark names separate from provider symbols", () => {
    const value = normalizeHistoricalInvestment(result);
    expect(value.outcomes.nasdaq.value).toBe(120);
    expect(historicalInvestmentLabel(value)).toBe(
      "Based on Nasdaq performance through 2026-08-31",
    );
    expect(
      JSON.stringify([
        historicalInvestmentLabel(value),
        historicalInvestmentMethodology,
        investmentBenchmarkNames,
      ]),
    ).not.toMatch(/SPY|QQQ/);
  });
  it("rejects invalid dates, amounts, identifiers, winners and unknown benchmarks", () => {
    for (const patch of [
      { valuationDate: "2026-02-30" },
      { contributed: Infinity },
      { snapshotId: "bad" },
      { selectedBenchmark: "sp500" },
      { selectedBenchmark: "QQQ" },
    ]) {
      expect(() =>
        normalizeHistoricalInvestment({ ...result, ...patch }),
      ).toThrow("Invalid historical investment response");
    }
  });
  it("preserves the exact snapshot in the receipt destination", () => {
    const destination = insightHistoryDestination(
      "hypothetical-investment",
      "2026-09-20",
      "Alternate universe",
      result.snapshotId,
    );
    expect(typeof destination).toBe("object");
    if (typeof destination !== "string")
      expect(destination.params).toMatchObject({
        insightSnapshot: result.snapshotId,
      });
  });
});
