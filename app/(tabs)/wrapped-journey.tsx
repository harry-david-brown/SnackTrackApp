import { Colors } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import { getCachedAnalytics } from '../../utils/offlineCache';
import { useExportUpsell } from '../../hooks/useExportUpsell';
import { MascotPlaceholder } from '../../components/mascot/MascotPlaceholder';
import WrappedShareJourney from '../../components/wrapped/WrappedShareJourney';
import { resolvePostWrappedExperience } from '../../components/wrapped/postWrappedState';
import { useImportPreferences } from '../../hooks/useImportPreferences';
import { showSimpleAlert } from '../../utils/platformAlert';

type WrappedSummary = UserSummary & {
  wrappedAnalytics: NonNullable<UserSummary['wrappedAnalytics']>;
};

const hasWrappedData = (summary: UserSummary | null | undefined): summary is WrappedSummary =>
  Boolean(summary?.wrappedAnalytics && summary.totalReceipts && summary.totalReceipts > 0);

export default function WrappedJourneyScreen() {
  // Wrapped display typography (Fredoka). Loaded here so the journey never
  // renders with fallback system fonts.
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const {
    isLoading: isExportStateLoading,
    hasCompletedExport,
    markSeen,
    markClicked,
  } = useExportUpsell(state.user?.id);
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    isUpdating: areImportPreferencesUpdating,
    setMonitoringConsent,
  } = useImportPreferences(Boolean(state.user?.id));

  const initialAnalytics = useMemo(
    () => (hasWrappedData(state.analytics) ? state.analytics : null),
    [state.analytics]
  );

  const [analytics, setAnalytics] = useState<UserSummary | null>(initialAnalytics);
  const [isLoading, setIsLoading] = useState<boolean>(!initialAnalytics);
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());
  const postWrappedExperience = useMemo(
    () => resolvePostWrappedExperience({
      isExportStateLoading: isExportStateLoading || areImportPreferencesLoading,
      hasCompletedExport:
        importPreferences?.export.status === 'completed' || hasCompletedExport,
      coverage: analytics?.wrappedAnalytics?.coverage,
    }),
    [
      analytics?.wrappedAnalytics?.coverage,
      areImportPreferencesLoading,
      hasCompletedExport,
      importPreferences?.export.status,
      isExportStateLoading,
    ]
  );

  useEffect(() => {
    const summary = state.analytics;
    const user = state.user;
    let cancelled = false;

    if (!summary && !user) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    if (hasWrappedData(summary)) {
      setAnalytics(summary);
      setIsLoading(false);
      return;
    }

    if (summary?.totalReceipts === 0) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    void (async () => {
      // The UserProvider preloads Wrapped analytics in the background. Its
      // cached result may already be ready even if the in-memory summary is a
      // base summary, so prefer it before starting another network wait.
      const cached = await getCachedAnalytics(user.id);
      if (cancelled) {
        return;
      }
      if (hasWrappedData(cached)) {
        setAnalytics(cached);
        setGlobalAnalytics(cached);
        setLoadTimestamp(Date.now());
        setIsLoading(false);
        return;
      }

      try {
        const wrappedSummary = await analyticsApi.getUserSummary(user.id, true);
        if (cancelled) {
          return;
        }
        if (hasWrappedData(wrappedSummary)) {
          setAnalytics(wrappedSummary);
          setGlobalAnalytics(wrappedSummary);
          setLoadTimestamp(Date.now());
        } else {
          setAnalytics(null);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.analytics, state.user, setGlobalAnalytics]);

  // Stable handler identities — WrappedShareJourney memoizes its slide deck on
  // these, and inline arrows were rebuilding it (and re-firing entrance
  // animations) on every re-render of this screen.
  const handleExportUpsellSeen = useCallback(() => {
    void markSeen('wrapped');
  }, [markSeen]);

  const handleExportUpgrade = useCallback(() => {
    void markClicked();
    router.push({
      pathname: '/(tabs)/upload',
      params: {
        focus: 'export',
      },
    });
  }, [markClicked]);

  const handleExportTutorial = useCallback(() => {
    void markClicked();
    router.push({
      pathname: '/(tabs)/upload',
      params: {
        focus: 'export',
        showExportTutorial: 'true',
      },
    });
  }, [markClicked]);

  const handleFinishPostWrapped = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const handleMonitoringDecision = useCallback(async (
    decision: 'granted' | 'declined'
  ) => {
    try {
      const nextPreferences = await setMonitoringConsent(decision);
      if (
        decision === 'granted'
        && nextPreferences.monitoring.effectiveState === 'reconnect_required'
      ) {
        showSimpleAlert(
          'Permission saved',
          'Reconnect Gmail from Import before export-ready alerts can work.'
        );
      }
    } catch {
      showSimpleAlert(
        'Could not save your choice',
        'Please check your connection and try again.'
      );
      throw new Error('monitoring_consent_update_failed');
    }
  }, [setMonitoringConsent]);

  const handleManageGmail = useCallback(() => {
    router.push('/(tabs)/upload');
  }, []);

  const handleClose = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
        <Text style={styles.loadingText}>Preparing your summary...</Text>
      </View>
    );
  }

  if (!hasWrappedData(analytics)) {
    return (
      <View style={styles.emptyContainer}>
        {/* MASCOT: empty-state guide — pointing toward the import CTA */}
        <View style={styles.emptyIcon}>
          <MascotPlaceholder pose="pointing" size={120} />
        </View>
        <Text style={styles.emptyTitle}>Your Wrapped Journey Awaits</Text>
        <Text style={styles.emptySubtitle}>
          Import receipts with Gmail to unlock your first recap fast, or upload a full export for deeper history.
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/upload')}>
          <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Import Receipts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WrappedShareJourney
      key={loadTimestamp}
      analytics={analytics}
      postWrappedExperience={postWrappedExperience}
      monitoringState={importPreferences?.monitoring.effectiveState ?? 'not_offered'}
      exportStatus={importPreferences?.export.status ?? 'not_started'}
      areImportPreferencesUpdating={
        areImportPreferencesLoading || areImportPreferencesUpdating
      }
      onMonitoringDecision={handleMonitoringDecision}
      onManageGmail={handleManageGmail}
      onExportUpsellSeen={handleExportUpsellSeen}
      onExportUpgrade={handleExportUpgrade}
      onExportTutorial={handleExportTutorial}
      onFinishPostWrapped={handleFinishPostWrapped}
      onClose={handleClose}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: Colors.background,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: Colors.alpha(Colors.secondary, 0.4),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
