import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { resolvePostWrappedExperience } from '../components/wrapped/postWrappedState';
import { useUser } from '../contexts/UserContext';
import { useWrappedAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useExportUpsell } from './useExportUpsell';
import { useImportPreferences } from './useImportPreferences';
import { showSimpleAlert } from '../utils/platformAlert';

export function useWrappedJourneyController() {
  const { state } = useUser();
  const userId = state.user?.id;
  const wrappedQuery = useWrappedAnalyticsQuery(userId);
  const { isLoading: isExportLoading, hasCompletedExport, markSeen, markClicked } = useExportUpsell(userId);
  const {
    preferences,
    isLoading: arePreferencesLoading,
    isUpdating: arePreferencesUpdating,
    setMonitoringConsent,
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

  const openExport = useCallback((showTutorial = false) => {
    void markClicked();
    router.push({
      pathname: '/(tabs)/upload',
      params: { focus: 'export', ...(showTutorial ? { showExportTutorial: 'true' } : {}) },
    });
  }, [markClicked]);

  const decideMonitoring = useCallback(async (decision: 'granted' | 'declined') => {
    try {
      const next = await setMonitoringConsent(decision);
      if (decision === 'granted' && next.monitoring.effectiveState === 'reconnect_required') {
        showSimpleAlert('Permission saved', 'Reconnect Gmail from Import before export-ready alerts can work.');
      }
    } catch {
      showSimpleAlert('Could not save your choice', 'Please check your connection and try again.');
      throw new Error('monitoring_consent_update_failed');
    }
  }, [setMonitoringConsent]);

  return {
    analytics: wrappedQuery.data ?? null,
    isLoading: wrappedQuery.isPending,
    dataUpdatedAt: wrappedQuery.dataUpdatedAt,
    postWrappedExperience,
    monitoringState: preferences?.monitoring.effectiveState ?? 'not_offered',
    exportStatus: preferences?.export.status ?? 'not_started',
    areImportPreferencesUpdating: arePreferencesLoading || arePreferencesUpdating,
    decideMonitoring,
    markExportOfferSeen: () => void markSeen('wrapped'),
    openExportUpgrade: () => openExport(false),
    openExportTutorial: () => openExport(true),
    openImport: () => router.push('/(tabs)/upload'),
    finish: () => router.replace('/(tabs)'),
  };
}
