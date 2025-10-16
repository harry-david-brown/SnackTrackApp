import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import WrappedShareJourney from '../../components/WrappedShareJourney';

export default function WrappedJourneyScreen() {
  const { state } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());

  // Reload analytics whenever screen comes into focus (new upload)
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true); // Show loading while fetching fresh data
      loadWrappedAnalytics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadWrappedAnalytics = async () => {
    if (!state.user) {
      router.replace('/');
      return;
    }

    try {
      // Fetch with wrapped analytics included directly (not through context)
      // This ensures we get the wrappedAnalytics field
      const summary = await analyticsApi.getUserSummary(state.user.id, true);
      setAnalytics(summary);
      setLoadTimestamp(Date.now()); // Update timestamp to trigger reset
    } catch {
      // If we can't load analytics, go back to dashboard
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Return to dashboard after journey
    router.replace('/(tabs)');
  };

  if (isLoading || !analytics) {
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

