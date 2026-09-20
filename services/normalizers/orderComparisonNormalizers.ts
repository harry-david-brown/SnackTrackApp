import type { PercentileStanding, WrappedPercentiles } from "@/types/api";

const invalid = (field: string): never => {
  throw new Error(`Invalid analytics response: ${field}`);
};
const record = (value: unknown, field: string): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid(field);
const integer = (
  value: unknown,
  field: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= min &&
  value <= max
    ? value
    : invalid(field);

export function normalizeWrappedPercentiles(
  value: unknown,
  field: string,
): WrappedPercentiles {
  const row = record(value, field);
  if (row.policyVersion !== undefined && row.policyVersion !== 3)
    return invalid(`${field}.policyVersion`);
  const current = row.policyVersion === 3;
  const standing = (key: string): PercentileStanding | undefined => {
    if (row[key] === undefined) return undefined;
    const item = record(row[key], `${field}.${key}`);
    const percentile = integer(
      item.percentile,
      `${field}.${key}.percentile`,
      0,
      current ? 99 : 100,
    );
    const topPercent = integer(
      item.topPercent,
      `${field}.${key}.topPercent`,
      1,
      100,
    );
    if (current && topPercent !== 100 - percentile)
      return invalid(`${field}.${key}.topPercent`);
    if (!current && item.sampleSize !== undefined)
      return invalid(`${field}.${key}.sampleSize`);
    return {
      percentile,
      topPercent,
      ...(current
        ? {
            sampleSize: integer(
              item.sampleSize,
              `${field}.${key}.sampleSize`,
              100,
            ),
          }
        : {}),
    };
  };
  const result: WrappedPercentiles = {
    sampleSize: integer(row.sampleSize, `${field}.sampleSize`, 100),
    totalSpent: standing("totalSpent"),
    orderCount: standing("orderCount"),
    nightOwl: standing("nightOwl"),
  };
  const values = [result.totalSpent, result.orderCount, result.nightOwl].filter(
    (s) => s !== undefined,
  );
  if (!values.length) return invalid(field);
  if (!current) return result;
  if (
    typeof row.currencyCode !== "string" ||
    !["CAD", "USD", "EUR", "GBP", "UNKNOWN"].includes(row.currencyCode) ||
    (result.totalSpent && row.currencyCode === "UNKNOWN")
  )
    return invalid(`${field}.currencyCode`);
  if (typeof row.methodology !== "string" || !row.methodology.trim())
    return invalid(`${field}.methodology`);
  if (result.sampleSize !== Math.max(...values.map((s) => s.sampleSize!)))
    return invalid(`${field}.sampleSize`);
  return {
    ...result,
    policyVersion: 3,
    currencyCode: row.currencyCode,
    methodology: row.methodology,
  };
}
