export type InvestmentBenchmark = "sp500" | "nasdaq";
export interface HistoricalInvestmentResult {
  modelVersion: "historical-v1";
  snapshotId: string;
  valuationDate: string;
  currencyCode: string;
  contributionCount: number;
  contributed: number;
  selectedBenchmark: InvestmentBenchmark;
  outcomes: Record<InvestmentBenchmark, { value: number; gain: number }>;
}
