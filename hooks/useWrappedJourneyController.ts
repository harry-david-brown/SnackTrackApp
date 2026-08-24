import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { resolvePostWrappedExperience } from '@components/wrapped/postWrappedState';
import { useUser } from '@contexts/UserContext';
import { useWrappedAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useExportUpsell } from './useExportUpsell';
import { useImportPreferences } from './useImportPreferences';
import { showSimpleAlert } from '@utils/platformAlert';
import { resolveTrackingEligibility } from '@features/import-flow/trackingEligibility';

export function useWrappedJourneyController() {
  const { state } = useUser();
  const userId = state.user?.id;
  const wrappedQuery = useWrappedAnalyticsQuery(userId);
  const { isLoading: isExportLoading, hasCompletedExport, markSeen, markClicked } = useExportUpsell(userId);
  const {
    preferences,
    isLoading: arePreferencesLoading,
    isUpdating: arePreferencesUpdating,
    setOngoingTrackingConsent,
  } = useImportPreferences(Boolean(userId));

  const postWrappedExperience = useMemo(() => resolvePostWrappedExperience({
    isExportStateLoading: isExportLoading || arePreferencesLoading,
    hasCompletedExport: preferences?.export.status === 'completed' || hasCompletedExport,
    coverage: wrappedQuery.data?.wrappedAnalytics?.coverage,
  }), [
    arePreferencesLoading,
    hasCompletedExport,
    isExportLoading,
    preferences?.export.status,
    wrappedQuery.data?.wrappedAnalytics?.coverage,
  ]);
  const trackingEligibility = useMemo(
    () => resolveTrackingEligibility(preferences),
    [preferences],
  );

  const openExport = useCallback((showTutorial = false) => {
    void markClicked();
    router.push({
      pathname: '/(tabs)/upload',
      params: { focus: 'export', ...(showTutorial ? { showExportTutorial: 'true' } : {}) },
    });
  }, [markClicked]);

  const decideTracking = useCallback(async (decision: 'granted' | 'declined') => {
    try {
      const next = await setOngoingTrackingConsent(decision);
      if (decision === 'granted' && next.ongoingTracking.effectiveState === 'reconnect_required') {
        showSimpleAlert('Permission saved', 'Reconnect Gmail from Import before ongoing tracking can work.');
      }
    } catch {
      showSimpleAlert('Could not save your choice', 'Please check your connection and try again.');
      throw new Error('monitoring_consent_update_failed');
    }
  }, [setOngoingTrackingConsent]);

  return {
    analytics: wrappedQuery.data ?? null,
    isLoading: wrappedQuery.isPending,
    dataUpdatedAt: wrappedQuery.dataUpdatedAt,
    postWrappedExperience,
    trackingState: preferences?.ongoingTracking.effectiveState ?? 'not_offered',
    trackingEligibility,
    exportStatus: preferences?.export.status ?? 'not_started',
    areImportPreferencesUpdating: arePreferencesLoading || arePreferencesUpdating,
    decideTracking,
    markExportOfferSeen: () => void markSeen('wrapped'),
    openExportUpgrade: () => openExport(false),
    openExportTutorial: () => openExport(true),
    openImport: () => router.push('/(tabs)/upload'),
    finish: () => router.replace('/(tabs)'),
  };
}
