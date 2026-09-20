import type {
  HistoricalInvestmentResult,
  InvestmentBenchmark,
} from "@/types/historicalInvestment";
const invalid = (): never => {
  throw new Error("Invalid historical investment response");
};
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : invalid();
const number = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : invalid();
export function normalizeHistoricalInvestment(
  value: unknown,
  _field?: string,
): HistoricalInvestmentResult {
  const v = record(value),
    outcomes = record(v.outcomes);
  if (
    v.modelVersion !== "historical-v1" ||
    typeof v.snapshotId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      v.snapshotId,
    ) ||
    typeof v.valuationDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.valuationDate) ||
    !Number.isFinite(Date.parse(v.valuationDate)) ||
    new Date(v.valuationDate).toISOString().slice(0, 10) !== v.valuationDate ||
    typeof v.currencyCode !== "string" ||
    !/^[A-Z]{3}$/.test(v.currencyCode) ||
    (v.selectedBenchmark !== "sp500" && v.selectedBenchmark !== "nasdaq")
  )
    return invalid();
  const contributed = number(v.contributed),
    contributionCount = number(v.contributionCount);
  if (
    contributed <= 0 ||
    !Number.isSafeInteger(contributionCount) ||
    contributionCount < 1
  )
    return invalid();
  const outcome = (benchmark: InvestmentBenchmark) => {
    const o = record(outcomes[benchmark]),
      val = number(o.value),
      gain = number(o.gain);
    if (val < 0 || Math.abs(val - contributed - gain) > 0.011) return invalid();
    return { value: val, gain };
  };
  const normalized = { sp500: outcome("sp500"), nasdaq: outcome("nasdaq") };
  if (
    normalized[v.selectedBenchmark].gain <= 0 ||
    normalized[v.selectedBenchmark].value <
      Math.max(normalized.sp500.value, normalized.nasdaq.value)
  )
    return invalid();
  return {
    modelVersion: "historical-v1",
    snapshotId: v.snapshotId,
    valuationDate: v.valuationDate,
    currencyCode: v.currencyCode,
    contributed,
    contributionCount,
    selectedBenchmark: v.selectedBenchmark,
    outcomes: normalized,
  };
}
