import type { HistoricalInvestmentResult } from "@/types/historicalInvestment";
export const investmentBenchmarkNames = {
  sp500: "S&P 500",
  nasdaq: "Nasdaq",
} as const;
export const historicalInvestmentMethodology =
  "Index-tracking funds with reinvested dividends; Nasdaq refers to the Nasdaq-100. Fund expenses are reflected. Excludes exchange-rate effects, personal taxes, and trading costs. Hypothetical, not financial advice.";
export function historicalInvestmentLabel(
  result: HistoricalInvestmentResult,
): string {
  return `Based on ${investmentBenchmarkNames[result.selectedBenchmark]} performance through ${result.valuationDate}`;
}
