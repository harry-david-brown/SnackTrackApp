import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { DashboardExportRecommendation } from '@components/dashboard/dashboardTrackingState';
import { trackAdminEvent } from '@services/adminAnalytics';

/** One impression per recommendation per Home visit, including refetches. */
export function useDashboardExportOfferImpression(userId: string | undefined, variant: DashboardExportRecommendation | undefined) {
  const focused = useIsFocused();
  const seen = useRef(new Set<DashboardExportRecommendation>());
  useEffect(() => { seen.current.clear(); }, [focused, userId]);
  useEffect(() => {
    if (!focused || !userId || !variant || seen.current.has(variant)) return;
    seen.current.add(variant);
    void trackAdminEvent('export_offer_shown', { properties: { surface: 'dashboard', variant } }).catch(() => undefined);
  }, [focused, userId, variant]);
}
