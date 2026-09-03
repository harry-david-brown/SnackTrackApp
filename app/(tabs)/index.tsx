import { Colors } from '@constants/theme';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@contexts/UserContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { router } from 'expo-router';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { useFocusEffect } from '@react-navigation/native';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
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

export default function DashboardScreen() {
  const { state, logout } = useUser();
  const { formatCurrency } = useCurrency();
  const [insightsDayOffset, setInsightsDayOffset] = React.useState(0);
  const [dashboardPeriod, setDashboardPeriod] = React.useState<DashboardPeriod>('current_month');
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const insightsQuery = useDashboardInsightsQuery(state.user?.id, __DEV__ ? insightsDayOffset : 0);
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
    setProviderRelevance,
    setSetupDeferral,
    error: importPreferencesError,
  } = useImportPreferences(Boolean(state.user?.id));
  const trackingCardState = resolveDashboardTrackingState(
    importPreferences,
    areImportPreferencesLoading,
    Boolean(importPreferencesError && !importPreferences),
  );
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
    if (action === 'mark_uber_not_used') {
      showAlert(
        'Stop recommending Uber Eats history?',
        'We’ll stop recommending Uber Eats history. You can add it later from Add & manage data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I don’t use Uber Eats',
            onPress: () => {
              void setProviderRelevance('uber_eats', 'not_used').catch(() => {
                showSimpleAlert(
                  'Uber Eats is still relevant',
                  'SnackTrack found Uber Eats activity or an active history request. Refresh your data status and try again.',
                );
              });
            },
          },
        ],
      );
      return;
    }
    if (action === 'open_import') {
      if (trackingCardState.id === 'setup_deferred') {
        void setSetupDeferral('resume');
      }
      router.push('/(tabs)/upload');
      return;
    }
    if (action === 'connect_gmail' || action === 'import_gmail'
      || action === 'request_export' || action === 'continue_export') {
      router.push({
        pathname: '/(tabs)/upload',
        params: {
          action,
          intentId: `${action}:${Date.now()}`,
          ...(trackingCardState.primaryProvider ? { provider: trackingCardState.primaryProvider } : {}),
          ...(trackingCardState.gmailPurpose ? { gmailPurpose: trackingCardState.gmailPurpose } : {}),
        },
      });
      return;
    }
    if (action === 'open_gmail') {
      router.push('/(tabs)/upload?focus=export&provider=uber_eats&showExportTutorial=true');
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
          <ActivityIndicator size="large" color={Colors.primary} />
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
              <MascotPlaceholder pose="neutral" size={44} hideLabel />
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{greetingForDate()}</Text>
                <Text style={styles.subtitle}>Here’s your delivery picture.</Text>
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
            <Text style={styles.refreshingSummary} accessibilityLiveRegion="polite">
              Refreshing your summary…
            </Text>
          ) : null}

          {trackingCardState.placement === 'priority' ? (
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
                onOpenExport={() => router.push({
                  pathname: '/(tabs)/upload',
                  params: { action: 'request_export', intentId: `request_export:${Date.now()}` },
                })}
                onOpenProviderExport={(provider) => router.push({
                  pathname: '/(tabs)/upload',
                  params: { action: 'request_export', provider, intentId: `request_export:${provider}:${Date.now()}` },
                })}
              />
            ) : insightSectionState.id === 'loading' ? (
              <Card style={styles.emptyState} accessibilityLabel="Preparing today’s dashboard insights">
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.emptyStateSubtitle}>Looking for patterns worth sharing…</Text>
              </Card>
            ) : insightSectionState.id === 'error' ? (
              <ErrorMessage
                error="Today’s observations couldn’t be loaded."
                type="network"
                onRetry={() => { void insightsQuery.refetch(); }}
              />
            ) : (
              <Card style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.gray400} />
                <Text style={styles.emptyStateTitle}>{insightSectionState.id === 'empty' ? 'Nothing to inspect yet' : 'We need a little more evidence'}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {insightSectionState.id === 'empty'
                    ? 'Connect the email registered with your delivery apps, or choose another method for phone-number, Apple, and other sign-ins.'
                    : 'A few more tracked orders will unlock stronger, stranger patterns.'}
                </Text>
              </Card>
            )}
          </View>

          {trackingCardState.placement === 'footer' ? (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
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
    fontSize: 25,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    marginTop: 24,
    marginBottom: 32,
    gap: 10,
  },
  priorityGuidance: { marginTop: 20, gap: 10 },
  refreshingSummary: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  activityContainer: {
    marginTop: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
