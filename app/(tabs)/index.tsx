import { Colors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { router } from 'expo-router';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { SlideInView } from '../../components/ui/SlideInView';
import { useFocusEffect } from '@react-navigation/native';
import { MascotPlaceholder } from '../../components/mascot/MascotPlaceholder';
import { useImportPreferences } from '../../hooks/useImportPreferences';
import { DashboardTrackingCard } from '../../components/dashboard/DashboardTrackingCard';
import { resolveDashboardTrackingState, type DashboardTrackingAction } from '../../components/dashboard/dashboardTrackingState';
import { showAlert, showSimpleAlert } from '../../utils/platformAlert';
import { openUberExportEmail } from '../../utils/exportDownloadHandoff';
import { WhatWeNoticedCarousel } from '../../components/dashboard/WhatWeNoticedCarousel';
import { useAnalyticsQuery } from '../../hooks/queries/useAnalyticsQueries';

export default function DashboardScreen() {
  const { state, logout } = useUser();
  const { formatCurrency } = useCurrency();
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const { data: analytics, refetch: loadAnalytics } = analyticsQuery;
  const automaticTrackingCheckRef = useRef<string | null>(null);
  const automaticInitialGmailScanRef = useRef<string | null>(null);
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    isUpdating: isImportStateUpdating,
    refresh: refreshImportPreferences,
    setOngoingTrackingConsent,
    checkOngoingTracking,
    importGmailReceipts,
  } = useImportPreferences(Boolean(state.user?.id));
  const trackingCardState = resolveDashboardTrackingState(importPreferences, areImportPreferencesLoading);
  
  useEffect(() => {
    if (
      !importPreferences
      || importPreferences.export.status !== 'completed'
      || importPreferences.gmailImport.hasImported
      || importPreferences.gmailImport.status === 'importing'
      || !importPreferences.ongoingTracking.capability.canTrack
      || isImportStateUpdating
    ) return;

    const scanKey = importPreferences.export.updatedAt ?? 'completed-export';
    if (automaticInitialGmailScanRef.current === scanKey) return;
    automaticInitialGmailScanRef.current = scanKey;
    void importGmailReceipts()
      .then(() => loadAnalytics())
      .catch(() => undefined);
  }, [importGmailReceipts, importPreferences, isImportStateUpdating, loadAnalytics]);

  useEffect(() => {
    if (
      importPreferences?.ongoingTracking.effectiveState !== 'active'
      || isImportStateUpdating
    ) return;
    const lastChecked = importPreferences.ongoingTracking.activity.lastSuccessfulCheckAt;
    const lastCheckedMs = lastChecked ? new Date(lastChecked).getTime() : 0;
    if (lastCheckedMs && Date.now() - lastCheckedMs < 15 * 60 * 1000) return;
    const checkKey = lastChecked ?? 'never';
    if (automaticTrackingCheckRef.current === checkKey) return;
    automaticTrackingCheckRef.current = checkKey;
    void checkOngoingTracking()
      .then(() => loadAnalytics())
      .catch(() => undefined);
  }, [checkOngoingTracking, importPreferences, isImportStateUpdating, loadAnalytics]);

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
    if (action === 'open_imports') {
      router.push('/(tabs)/upload');
      return;
    }
    if (action === 'open_export') {
      router.push({ pathname: '/(tabs)/upload', params: { focus: 'export' } });
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
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
	          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <SlideInView direction="left" delay={100}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
                <Text style={styles.cardTitle}>Total Spent</Text>
              </View>
              <Text style={styles.cardValue}>
                {analytics ? formatCurrency(analytics.totalSpent) : '—'}
              </Text>
              <Text style={styles.cardSubtext}>All time</Text>
            </View>
            </SlideInView>
            
            <SlideInView direction="right" delay={200}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt-outline" size={24} color={Colors.success} />
                <Text style={styles.cardTitle}>Receipts</Text>
              </View>
              <Text style={styles.cardValue}>
                {analytics ? analytics.totalReceipts : '—'}
              </Text>
              <Text style={styles.cardSubtext}>Orders tracked</Text>
            </View>
            </SlideInView>
	          </View>

          {/* Contextual import and tracking status */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>{trackingCardState.sectionLabel}</Text>
            <DashboardTrackingCard
              state={trackingCardState}
              preferences={importPreferences}
              busy={isImportStateUpdating}
              onAction={handleTrackingAction}
            />
          </View>

          {/* Personalized insight carousel */}
          <View style={styles.activityContainer}>
            <Text style={styles.sectionTitle}>What we noticed</Text>
            {analytics?.dashboardInsights?.length ? (
              <WhatWeNoticedCarousel
                insights={analytics.dashboardInsights}
                onOpenExport={() => router.push({ pathname: '/(tabs)/upload', params: { focus: 'export' } })}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.gray400} />
                <Text style={styles.emptyStateTitle}>No receipts yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Connect Gmail to get started fast, or upload a full export for deeper history
                </Text>
              </View>
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
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  exportUpsellCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.chipActiveBg,
    shadowColor: Colors.textPrimary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  exportUpsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exportUpsellBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.infoBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  exportUpsellBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  exportUpsellDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  exportUpsellTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  exportUpsellBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  exportUpsellPoints: {
    gap: 10,
    marginBottom: 18,
  },
  exportUpsellPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportUpsellPointText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  exportUpsellActions: {
    flexDirection: 'row',
    gap: 10,
  },
  exportUpsellPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportUpsellPrimaryText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  exportUpsellSecondary: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.infoBg,
  },
  exportUpsellSecondaryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: Colors.gray500,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: Colors.alpha(Colors.white, 0.8),
  },
  activityContainer: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: Colors.white,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
