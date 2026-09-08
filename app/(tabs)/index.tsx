import { FontFamily, type AppTheme } from '@constants/theme';
import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@contexts/UserContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { router } from 'expo-router';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { useFocusEffect } from '@react-navigation/native';
import { Mascot } from '@components/mascot/Mascot';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { DashboardTrackingCard } from '@components/dashboard/DashboardTrackingCard';
import { resolveDashboardTrackingState, type DashboardTrackingAction } from '@components/dashboard/dashboardTrackingState';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { WhatWeNoticedCarousel } from '@components/dashboard/WhatWeNoticedCarousel';
import { useAnalyticsQuery, useDashboardInsightsQuery } from '@hooks/queries/useAnalyticsQueries';
import { DashboardSpendingHero } from '@components/dashboard/DashboardSpendingHero';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { SectionHeader } from '@components/ui/SectionHeader';
import { resolveDashboardInsightsState } from '@components/dashboard/dashboardInsightsState';
import { DashboardInsightsDevControls } from '@components/dashboard/DashboardInsightsDevControls';
import { resolveAnalyticsSummaryState } from '@features/dashboard/analyticsSummaryState';
import {
  greetingForDate,
  resolveDashboardPeriodSummary,
  type DashboardPeriod,
} from '@features/dashboard/dashboardPeriodSummary';
import { trackAdminEvent } from '@services/adminAnalytics';
import { NativeAdPlacement } from '@features/ads/NativeAdPlacement';
import { isAdEligible } from '@features/ads/contracts';
import { claimAdOpportunity, getDailyAdImpressions, getSessionAdImpressions, isAdSessionSuppressed, recordDailyAdImpression, recordSessionAdImpression } from '@features/ads/adSession';
import { useAdRuntimeConfiguration } from '@features/ads/useAdRuntimeConfiguration';
import { useImportOperation } from '@hooks/useImportOperation';
import { ImportOperationCard } from '@components/import/ImportOperationCard';
import { AppText } from '@components/ui/AppText';
import { useAppTheme } from '@contexts/AppearanceContext';
import { buildProviderHistoryDestination } from '@features/import-flow/providerHistoryNavigation';
import { isActiveImportOperation } from '@features/import-flow/contracts';

export default function DashboardScreen() {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { state, logout } = useUser();
  const { formatCurrency } = useCurrency();
  const [insightsDayOffset, setInsightsDayOffset] = React.useState(0);
  const [dashboardPeriod, setDashboardPeriod] = React.useState<DashboardPeriod>('current_month');
  const [sessionAdImpressions, setSessionAdImpressions] = React.useState(0);
  const [dailyAdImpressions, setDailyAdImpressions] = React.useState<number | null>(null);
  const [adClaimed, setAdClaimed] = React.useState(false);
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const insightsQuery = useDashboardInsightsQuery(state.user?.id, __DEV__ ? insightsDayOffset : 0);
  const adRuntime = useAdRuntimeConfiguration(state.user?.id);
  const { operation: importOperation } = useImportOperation(Boolean(state.user?.id), true);
  const { data: analytics, refetch: loadAnalytics } = analyticsQuery;
  const analyticsSummaryState = resolveAnalyticsSummaryState({
    summary: analytics,
    isPending: analyticsQuery.isPending,
    isError: analyticsQuery.isError,
    isFetching: analyticsQuery.isFetching,
  });
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    isUpdating: isImportStateUpdating,
    refresh: refreshImportPreferences,
    refreshIfStale: refreshImportPreferencesIfStale,
    setOngoingTrackingConsent,
    checkOngoingTracking,
    error: importPreferencesError,
  } = useImportPreferences(Boolean(state.user?.id));
  const trackingCardState = resolveDashboardTrackingState(
    importPreferences,
    areImportPreferencesLoading,
    Boolean(importPreferencesError && !importPreferences),
  );
  const activeImportOperation = isActiveImportOperation(importOperation) ? importOperation : null;
  const dashboardSummary = React.useMemo(
    () => resolveDashboardPeriodSummary(analytics ?? null, dashboardPeriod),
    [analytics, dashboardPeriod],
  );
  const insightSectionState = resolveDashboardInsightsState({
    edition: insightsQuery.data,
    isLoading: insightsQuery.isLoading,
    isFetching: insightsQuery.isFetching,
    isError: insightsQuery.isError,
    receiptCount: analytics?.totalReceipts ?? (analyticsQuery.isLoading ? null : 0),
  });
  React.useEffect(() => {
    setSessionAdImpressions(state.user?.id ? getSessionAdImpressions(state.user.id) : 0);
    if (state.user?.id) void getDailyAdImpressions(state.user.id).then(setDailyAdImpressions);
  }, [adRuntime.appActive, state.user?.id]);
  const baseAdEligible = isAdEligible({
    configuration: adRuntime.configuration,
    configurationFresh: adRuntime.configurationFresh,
    receiptCount: analytics?.totalReceipts ?? null,
    insightsReady: insightSectionState.id === 'success' || insightSectionState.id === 'stale-success',
    appActive: adRuntime.appActive,
    impressionsThisSession: sessionAdImpressions,
    impressionsToday: dailyAdImpressions ?? Number.MAX_SAFE_INTEGER,
    placement: 'dashboard_after_insights',
    sessionSuppressed: (state.user?.id ? isAdSessionSuppressed(state.user.id) : true)
      || Boolean(importOperation && ['pending_dispatch','queued','running','retrying'].includes(importOperation.status)),
  });
  React.useEffect(() => {
    if (baseAdEligible && state.user?.id) setAdClaimed(claimAdOpportunity(state.user.id, 'dashboard_after_insights'));
  }, [baseAdEligible, state.user?.id]);
  const adEligible = baseAdEligible && adClaimed;
  const recordAdImpression = React.useCallback(() => {
    if (!state.user?.id) return;
    setSessionAdImpressions(recordSessionAdImpression(state.user.id));
    void recordDailyAdImpression(state.user.id).then(setDailyAdImpressions);
  }, [state.user?.id]);
  
  useFocusEffect(
    React.useCallback(() => {
      void trackAdminEvent('dashboard_viewed').catch(() => undefined);
      void refreshImportPreferencesIfStale();
    }, [refreshImportPreferencesIfStale])
  );



  // Navigation after logout is handled declaratively by the Redirect guard
  // in app/(tabs)/_layout.tsx — clearing auth state is all that's needed here.
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Even if the API call fails, local auth state is cleared and the
      // tabs layout redirects to the login screen.
    }
  };

  const handleTrackingAction = (action: DashboardTrackingAction) => {
    if (action === 'retry_preferences') {
      void refreshImportPreferences();
      return;
    }
    if (action === 'open_import') {
      router.push(trackingCardState.gmailPurpose === 'connection_recovery' ? '/add-history?intent=reconnect' : '/add-history');
      return;
    }
    if (action === 'connect_gmail' || action === 'import_gmail'
      || action === 'request_export' || action === 'continue_export') {
      if (action === 'request_export' && !trackingCardState.primaryProvider) {
        router.push('/add-history?intent=provider');
        return;
      }
      if (action === 'request_export' && trackingCardState.primaryProvider) {
        router.push(buildProviderHistoryDestination(trackingCardState.primaryProvider, (trackingCardState.primaryProvider === 'uber_eats' ? importPreferences?.export.providers.uberEats : importPreferences?.export.providers.doorDash)?.status));
        return;
      }
      router.push({ pathname: '/add-history', params: {
        intent: action === 'connect_gmail' ? 'reconnect' : action === 'import_gmail' ? 'email' : action === 'continue_export' ? 'resume_export' : 'provider',
        ...(trackingCardState.primaryProvider ? { provider: trackingCardState.primaryProvider } : {}),
      } });
      return;
    }
    if (action === 'open_gmail') {
      router.push('/add-history?intent=resume_export&provider=uber_eats');
      return;
    }
    if (action === 'enable_tracking') {
      showAlert(
        'Allow ongoing order tracking?',
        'SnackTrack will periodically read supported delivery receipt emails from your connected accounts to update your spending and stats. You can turn this off at any time.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => { void setOngoingTrackingConsent('declined'); } },
          {
            text: 'Allow tracking',
            onPress: () => {
              void setOngoingTrackingConsent('granted').catch(() => {
                showSimpleAlert('Couldn’t enable tracking', 'Restore a Gmail or Outlook connection and try again.');
              });
            },
          },
        ]
      );
      return;
    }
    void checkOngoingTracking()
      .then(() => {
        showSimpleAlert('Order check queued', 'SnackTrack will check in the background and refresh your dashboard when it finishes.');
      })
      .catch(() => showSimpleAlert('Couldn’t check for orders', 'Please try again in a moment.'));
  };

  if (!state.user) {
    // Return loading state instead of null to prevent navigation errors
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        bounces={true}
      >
        <View style={styles.content}>
          {/* Error Message */}
          {analyticsSummaryState.id === 'error' && (
            <ErrorMessage
              error="We couldn’t refresh your spending summary."
              type="network"
              onRetry={() => { void loadAnalytics(); }}
            />
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              {/* MASCOT: small logo bust — neutral pose, no label */}
              <Mascot pose="sunglasses" size={52} hideLabel />
              <View style={styles.headerCopy}>
                <AppText variant="pageTitle" style={styles.title}>{greetingForDate()}</AppText>
                <AppText variant="body" style={styles.subtitle}>Here’s your delivery picture.</AppText>
              </View>
            </View>
            {__DEV__ && (
              <AppButton label="Log out" variant="icon" icon="log-out-outline" onPress={handleLogout} />
            )}
          </View>
          
          <DashboardSpendingHero
            summary={dashboardSummary}
            period={dashboardPeriod}
            loading={analyticsSummaryState.id === 'loading'}
            formatCurrency={formatCurrency}
            onChangePeriod={setDashboardPeriod}
          />
          {analyticsSummaryState.id === 'refreshing' ? (
            <AppText variant="metadata" style={styles.refreshingSummary} accessibilityLiveRegion="polite">
              Refreshing your summary…
            </AppText>
          ) : null}

          {activeImportOperation ? (
            <View style={styles.priorityGuidance}>
              <SectionHeader title="In progress" />
              <ImportOperationCard
                operation={activeImportOperation}
                onPress={() => router.push({ pathname: '/import-progress', params: { operationId: activeImportOperation.id, returnTo: 'home' } })}
              />
            </View>
          ) : trackingCardState.placement === 'priority' ? (
            <View style={styles.priorityGuidance}>
              <SectionHeader title={trackingCardState.sectionLabel} />
              <DashboardTrackingCard
                state={trackingCardState}
                preferences={importPreferences}
                busy={isImportStateUpdating}
                onAction={handleTrackingAction}
              />
            </View>
          ) : null}

          {/* Personalized insight carousel */}
          <View style={styles.activityContainer}>
            <SectionHeader title={insightSectionState.title} subtitle={insightSectionState.subtitle} />
            {__DEV__ ? (
              <DashboardInsightsDevControls
                dayOffset={insightsDayOffset}
                isFetching={insightsQuery.isFetching}
                onChangeDayOffset={setInsightsDayOffset}
              />
            ) : null}
            {insightSectionState.id === 'success' || insightSectionState.id === 'stale-success' ? (
              <WhatWeNoticedCarousel
                insights={insightSectionState.edition.insights}
                partialExportProvider={insightSectionState.edition.partialExportProvider}
                onOpenExport={() => router.push('/add-history?intent=provider')}
                onOpenProviderExport={(provider) => router.push(buildProviderHistoryDestination(provider, (provider === 'uber_eats' ? importPreferences?.export.providers.uberEats : importPreferences?.export.providers.doorDash)?.status))}
              />
            ) : insightSectionState.id === 'loading' ? (
              <Card style={styles.emptyState} accessibilityLabel="Preparing today’s dashboard insights">
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText variant="surfaceBody" style={styles.emptyStateSubtitle}>Looking for patterns worth sharing…</AppText>
              </Card>
            ) : insightSectionState.id === 'error' ? (
              <ErrorMessage
                error="Today’s observations couldn’t be loaded."
                type="network"
                onRetry={() => { void insightsQuery.refetch(); }}
              />
            ) : (
              <Card style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={theme.colors.gray400} />
                <AppText variant="surfaceTitle" style={styles.emptyStateTitle}>{insightSectionState.id === 'empty' ? 'Nothing to inspect yet' : 'We need a little more evidence'}</AppText>
                <AppText variant="surfaceBody" style={styles.emptyStateSubtitle}>
                  {insightSectionState.id === 'empty'
                    ? 'Connect the email registered with your delivery apps, or choose another method for phone-number, Apple, and other sign-ins.'
                    : 'A few more tracked orders will unlock stronger, stranger patterns.'}
                </AppText>
              </Card>
            )}
          </View>

          {analytics ? <View style={styles.compactStats}>
            <Card style={styles.compactStatCard}>
              <Ionicons name="receipt-outline" size={19} color={theme.colors.primary} />
              <AppText variant="surfaceTitle" style={styles.compactStatValue}>{analytics.totalReceipts}</AppText>
              <AppText variant="metadata" style={styles.compactStatLabel}>Orders tracked</AppText>
            </Card>
            <Card style={styles.compactStatCard}>
              <Ionicons name="wallet-outline" size={19} color={theme.colors.primary} />
              <AppText variant="surfaceTitle" style={styles.compactStatValue}>{formatCurrency(analytics.averageOrderValue)}</AppText>
              <AppText variant="metadata" style={styles.compactStatLabel}>Average order</AppText>
            </Card>
          </View> : null}

          {adEligible && adRuntime.configuration ? (
            <NativeAdPlacement
              placement="dashboard_after_insights"
              configurationVersion={adRuntime.configuration.configurationVersion}
              onImpression={recordAdImpression}
            />
          ) : null}

          {!activeImportOperation && trackingCardState.placement === 'footer' ? (
            <View style={styles.actionsContainer}>
              <SectionHeader title={trackingCardState.sectionLabel} />
              <DashboardTrackingCard
                state={trackingCardState}
                preferences={importPreferences}
                busy={isImportStateUpdating}
                onAction={handleTrackingAction}
              />
            </View>
          ) : null}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerCopy: { flex: 1 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FontFamily.medium,
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 24,
    marginBottom: 32,
    gap: 10,
  },
  priorityGuidance: { marginTop: 20, gap: 10 },
  refreshingSummary: {
    marginTop: 8,
    textAlign: 'center',
  },
  activityContainer: {
    marginTop: 24,
  },
  compactStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  compactStatCard: { flex: 1, minHeight: 112, padding: 15 },
  compactStatValue: { fontFamily: FontFamily.medium, marginTop: 13 },
  compactStatLabel: { marginTop: 3 },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
  },
});
