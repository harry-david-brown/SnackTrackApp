import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import { getCachedAnalytics } from '../../utils/offlineCache';

// Lazy load WrappedShareJourney component for code splitting
const WrappedShareJourney = lazy(() => import('../../components/wrapped/WrappedShareJourney'));

const hasWrappedData = (summary: UserSummary | null | undefined): summary is UserSummary =>
  Boolean(summary?.wrappedAnalytics && summary.totalReceipts && summary.totalReceipts > 0);

export default function WrappedJourneyScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();

  const initialAnalytics = useMemo(
    () => (hasWrappedData(state.analytics) ? state.analytics : null),
    [state.analytics]
  );

  const [analytics, setAnalytics] = useState<UserSummary | null>(initialAnalytics);
  const [isLoading, setIsLoading] = useState<boolean>(!initialAnalytics);
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());
  const [isFullyReady, setIsFullyReady] = useState<boolean>(Boolean(initialAnalytics));
  const fetchingWrappedRef = useRef<string | null>(null);

  useEffect(() => {
    const summary = state.analytics;

    // If no analytics in state, try to load from cache (for offline viewing)
    if (!summary && state.user) {
      getCachedAnalytics(state.user.id).then((cached) => {
        if (cached && hasWrappedData(cached)) {
          setAnalytics(cached);
          setIsLoading(false);
          setIsFullyReady(true);
          setLoadTimestamp(Date.now());
          return;
        }
      });
    }

    if (!summary) {
      setAnalytics(null);
      setIsLoading(false);
      setIsFullyReady(true);
      fetchingWrappedRef.current = null;
      return;
    }

    if (summary.wrappedAnalytics && summary.totalReceipts > 0) {
      setAnalytics(summary);
      setLoadTimestamp(Date.now());
      setIsLoading(false);
      fetchingWrappedRef.current = null;
      setTimeout(() => setIsFullyReady(true), 100);
      return;
    }

    if (summary.totalReceipts === 0) {
      setAnalytics(null);
      setIsLoading(false);
      setIsFullyReady(true);
      fetchingWrappedRef.current = null;
      return;
    }

    if (!state.user) {
      setIsLoading(false);
      setIsFullyReady(true);
      return;
    }

    // We have receipts but no wrapped analytics yet – fetch with includeWrapped=true once per user session
    if (fetchingWrappedRef.current === state.user.id) {
      return;
    }

    fetchingWrappedRef.current = state.user.id;
    setIsLoading(true);
    setIsFullyReady(false);

    analyticsApi
      .getUserSummary(state.user.id, true)
      .then((wrappedSummary) => {
        if (hasWrappedData(wrappedSummary)) {
          setAnalytics(wrappedSummary);
          setGlobalAnalytics(wrappedSummary);
          setLoadTimestamp(Date.now());
          setTimeout(() => setIsFullyReady(true), 100);
        } else {
          setAnalytics(null);
          setIsFullyReady(true);
        }
      })
      .catch(async () => {
        // On error, try to use cached data
        if (state.user) {
          const cached = await getCachedAnalytics(state.user.id);
          if (cached && hasWrappedData(cached)) {
            setAnalytics(cached);
            setIsFullyReady(true);
            setLoadTimestamp(Date.now());
          } else {
            setAnalytics(null);
            setIsFullyReady(true);
          }
        } else {
          setAnalytics(null);
          setIsFullyReady(true);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [state.analytics, state.user, setGlobalAnalytics]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!hasWrappedData(analytics)) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color="#667eea" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Your Wrapped Journey Awaits</Text>
        <Text style={styles.emptySubtitle}>
          Upload your Uber Eats order history to unlock a personalized recap of your year in delivery.
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/upload')}>
          <Ionicons name="cloud-upload-outline" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Upload Receipts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isFullyReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <Suspense fallback={
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    }>
      <WrappedShareJourney
        key={loadTimestamp}
        analytics={analytics}
        onClose={() => router.replace('/(tabs)')}
      />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f6ff',
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: 'rgba(102, 126, 234, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

