import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import WrappedShareJourney from '../../components/WrappedShareJourney';

export default function WrappedJourneyScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true to show loading screen
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());
  const [isFullyReady, setIsFullyReady] = useState(false); // Track when component is fully ready

  // Use existing analytics data immediately if available
  React.useEffect(() => {
    if (state.analytics && !analytics) {
      setAnalytics(state.analytics);
      setLoadTimestamp(Date.now()); // Force remount to reset slide position
      setIsLoading(false);
      // Add a small delay to ensure component is fully ready
      setTimeout(() => setIsFullyReady(true), 100);
    }
  }, [state.analytics, analytics]);

  // Reload analytics whenever screen comes into focus (new upload)
  useFocusEffect(
    React.useCallback(() => {
      loadWrappedAnalytics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadWrappedAnalytics = async () => {
    if (!state.user) {
      router.replace('/');
      return;
    }

    // Always clear current analytics and force remount
    setAnalytics(null);
    setLoadTimestamp(Date.now());

    // If we already have analytics data, use it immediately
    if (state.analytics) {
      // Check if we need wrapped analytics
      if (state.analytics.wrappedAnalytics) {
        // We have everything we need
        setAnalytics(state.analytics);
        setIsLoading(false);
        // Add a small delay to ensure component is fully ready
        setTimeout(() => setIsFullyReady(true), 100);
        return;
      } else {
        // We have basic analytics but need wrapped analytics
        try {
          const summary = await analyticsApi.getUserSummary(state.user.id, true);
          setAnalytics(summary);
          setGlobalAnalytics(summary);
          setIsLoading(false);
          // Add a small delay to ensure component is fully ready
          setTimeout(() => setIsFullyReady(true), 100);
        } catch {
          router.replace('/(tabs)');
        }
        return;
      }
    }

    // No analytics data, fetch everything
    try {
      const summary = await analyticsApi.getUserSummary(state.user.id, true);
      setAnalytics(summary);
      setGlobalAnalytics(summary);
      setIsLoading(false);
      // Add a small delay to ensure component is fully ready
      setTimeout(() => setIsFullyReady(true), 100);
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleClose = () => {
    // Return to dashboard after journey
    router.replace('/(tabs)');
  };

  // Always show the wrapped journey, even while loading
  if (!analytics && state.analytics) {
    // Use existing analytics data if available
    setAnalytics(state.analytics);
  }

  // Don't render if we don't have analytics data yet or component isn't fully ready
  if (!analytics || !isFullyReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <WrappedShareJourney
      key={loadTimestamp} // Force remount on new data
      analytics={analytics}
      onClose={handleClose}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
});

