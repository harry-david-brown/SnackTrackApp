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
import { openUberExportEmail } from '@utils/exportDownloadHandoff';
import { WhatWeNoticedCarousel } from '@components/dashboard/WhatWeNoticedCarousel';
import { useAnalyticsQuery, useDashboardInsightsQuery } from '@hooks/queries/useAnalyticsQueries';
import { DashboardSummaryCards } from '@components/dashboard/DashboardSummaryCards';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { SectionHeader } from '@components/ui/SectionHeader';
import { resolveDashboardInsightsState } from '@components/dashboard/dashboardInsightsState';
import { DashboardInsightsDevControls } from '@components/dashboard/DashboardInsightsDevControls';

export default function DashboardScreen() {
  const { state, logout } = useUser();
  const { formatCurrency } = useCurrency();
  const [insightsDayOffset, setInsightsDayOffset] = React.useState(0);
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const insightsQuery = useDashboardInsightsQuery(state.user?.id, __DEV__ ? insightsDayOffset : 0);
  const { data: analytics, refetch: loadAnalytics } = analyticsQuery;
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    isUpdating: isImportStateUpdating,
    refresh: refreshImportPreferences,
    setOngoingTrackingConsent,
    checkOngoingTracking,
  } = useImportPreferences(Boolean(state.user?.id));
  const trackingCardState = resolveDashboardTrackingState(importPreferences, areImportPreferencesLoading);
  const insightSectionState = resolveDashboardInsightsState({
    edition: insightsQuery.data,
    isLoading: insightsQuery.isLoading,
    isFetching: insightsQuery.isFetching,
    isError: insightsQuery.isError,
    receiptCount: analytics?.totalReceipts ?? (analyticsQuery.isLoading ? null : 0),
  });
  
  useFocusEffect(
    React.useCallback(() => {
      void refreshImportPreferences();
    }, [refreshImportPreferences])
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
    if (action === 'connect_gmail' || action === 'import_gmail'
      || action === 'request_export' || action === 'continue_export') {
      router.push({
        pathname: '/(tabs)/upload',
        params: { action, intentId: `${action}:${Date.now()}` },
      });
      return;
    }
    if (action === 'open_gmail') {
      void openUberExportEmail().catch(() => {
        showSimpleAlert('Couldn’t open Gmail', 'Open Gmail and search for “Your Uber data is ready for download.”');
      });
      return;
    }
    if (action === 'enable_tracking') {
      showAlert(
        'Allow ongoing order tracking?',
        'SnackTrack will periodically read delivery receipt emails from your connected Gmail account to update your spending and stats. You can turn this off at any time.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => { void setOngoingTrackingConsent('declined'); } },
          {
            text: 'Allow tracking',
            onPress: () => {
              void setOngoingTrackingConsent('granted').catch(() => {
                showSimpleAlert('Couldn’t enable tracking', 'Reconnect Gmail and try again.');
              });
            },
          },
        ]
      );
      return;
    }
    void checkOngoingTracking()
      .then(() => loadAnalytics())
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
          {analyticsQuery.isError && (
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
              <View>
                <Text style={styles.title}>SnackTrack</Text>
                <Text style={styles.subtitle}>Welcome back!</Text>
              </View>
            </View>
            {__DEV__ && (
              <AppButton label="Log out" variant="icon" icon="log-out-outline" onPress={handleLogout} />
            )}
          </View>
          
	          {/* Stats Cards */}
          <DashboardSummaryCards
            totalSpent={analytics ? formatCurrency(analytics.totalSpent) : '—'}
            receiptCount={analytics?.totalReceipts ?? null}
          />

          {/* Contextual import and tracking status */}
          <View style={styles.actionsContainer}>
            <SectionHeader title={trackingCardState.sectionLabel} />
            <DashboardTrackingCard
              state={trackingCardState}
              preferences={importPreferences}
              busy={isImportStateUpdating}
              onAction={handleTrackingAction}
            />
          </View>

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
                onOpenExport={() => router.push({
                  pathname: '/(tabs)/upload',
                  params: { action: 'request_export', intentId: `request_export:${Date.now()}` },
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
                    ? 'Connect Gmail to get started fast, or upload an Uber Eats or DoorDash export for deeper history.'
                    : 'A few more tracked orders will unlock stronger, stranger patterns.'}
                </Text>
              </Card>
            )}
          </View>
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
  },
  exportUpsellMascot: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  activityContainer: {
    marginBottom: 32,
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
