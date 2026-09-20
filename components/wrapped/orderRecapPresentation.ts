import type { UserSummary } from "@/types/api";

/** Presentation only: counting, membership and money remain server decisions. */
export function orderRecapPresentation(analytics: UserSummary) {
  const wrapped = analytics.wrappedAnalytics;
  const metrics = wrapped?.orderMetrics ?? analytics.orderMetrics;
  if (!metrics) return undefined;
  return { metrics, ranking: wrapped?.deliveryDayRanking };
}
