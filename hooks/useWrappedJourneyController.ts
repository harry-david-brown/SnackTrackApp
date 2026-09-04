import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { resolvePostWrappedExperience } from '@components/wrapped/postWrappedState';
import { useUser } from '@contexts/UserContext';
import { useWrappedAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useExportUpsell } from './useExportUpsell';
import { useImportPreferences } from './useImportPreferences';
import { showSimpleAlert } from '@utils/platformAlert';
import { resolveTrackingEligibility, resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';
import { resolveExportOpportunity, resolveImportCoverage } from '@features/import-flow/importJourneyState';

export function useWrappedJourneyController() {
  const { state } = useUser();
  const userId = state.user?.id;
  const wrappedQuery = useWrappedAnalyticsQuery(userId);
  const { isLoading: isExportLoading, hasCompletedAllExports, markSeen, markClicked } = useExportUpsell(userId);
  const {
    preferences,
    isLoading: arePreferencesLoading,
    isUpdating: arePreferencesUpdating,
    setOngoingTrackingConsent,
  } = useImportPreferences(Boolean(userId));

  const importCoverage = useMemo(() => resolveImportCoverage(preferences), [preferences]);
  const exportOpportunity = useMemo(() => resolveExportOpportunity(importCoverage), [importCoverage]);
  const postWrappedExperience = useMemo(() => resolvePostWrappedExperience({
    isExportStateLoading: isExportLoading || arePreferencesLoading,
    hasCompletedAllExports,
    coverage: wrappedQuery.data?.wrappedAnalytics?.coverage,
  }), [
    arePreferencesLoading,
    hasCompletedAllExports,
    isExportLoading,
    wrappedQuery.data?.wrappedAnalytics?.coverage,
  ]);
  const trackingEligibility = useMemo(
    () => resolveTrackingEligibility(preferences),
    [preferences],
  );
  const trackingRecovery = useMemo(
    () => resolveTrackingRecovery(preferences),
    [preferences],
  );

  const openExport = useCallback((showTutorial = false) => {
    void markClicked();
    router.push({
      pathname: '/data-tracking',
      params: {
        focus: 'export',
        ...(exportOpportunity ? { provider: exportOpportunity.provider } : {}),
        ...(showTutorial ? { showExportTutorial: 'true' } : {}),
      },
    });
  }, [exportOpportunity, markClicked]);

  const openExportSourcePicker = useCallback(() => {
    void markClicked();
    router.push('/data-setup?sourcePicker=true');
  }, [markClicked]);

  const decideTracking = useCallback(async (decision: 'granted' | 'declined') => {
    try {
      const next = await setOngoingTrackingConsent(decision);
      if (decision === 'granted' && next.ongoingTracking.effectiveState === 'reconnect_required') {
        showSimpleAlert('Permission saved', 'Restore a Gmail or Outlook connection from Import before ongoing tracking can work.');
      }
    } catch {
      showSimpleAlert('Could not save your choice', 'Please check your connection and try again.');
      throw new Error('monitoring_consent_update_failed');
    }
  }, [setOngoingTrackingConsent]);

  const openTrackingSetup = useCallback(() => {
    if (trackingRecovery.kind === 'unavailable') {
      showSimpleAlert('Email is temporarily unavailable', 'Your connection and history are safe. Try setting up ongoing updates again shortly.');
      return;
    }
    const action = trackingRecovery.kind === 'baseline'
      ? 'import_gmail'
      : 'connect_gmail';
    router.push({
      pathname: '/data-tracking',
      params: {
        action,
        gmailPurpose: 'ongoing_tracking',
        intentId: `${action}:${Date.now()}`,
      },
    });
  }, [trackingRecovery.kind]);

  return {
    analytics: wrappedQuery.data ?? null,
    isLoading: wrappedQuery.isPending,
    dataUpdatedAt: wrappedQuery.dataUpdatedAt,
    postWrappedExperience,
    trackingState: preferences?.ongoingTracking.effectiveState ?? 'not_offered',
    trackingEligibility,
    exportStatus: exportOpportunity?.status ?? 'not_started',
    exportProviderName: exportOpportunity?.name ?? null,
    exportProvider: exportOpportunity?.provider ?? null,
    areImportPreferencesUpdating: arePreferencesLoading || arePreferencesUpdating,
    decideTracking,
    markExportOfferSeen: () => void markSeen('wrapped'),
    openExportUpgrade: () => openExport(false),
    openExportTutorial: openExportSourcePicker,
    openImport: () => router.push('/data-setup'),
    openTrackingSetup,
    finish: () => router.replace('/(tabs)'),
  };
}
