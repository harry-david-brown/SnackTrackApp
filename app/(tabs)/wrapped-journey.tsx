import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import WrappedShareJourney from '../../components/WrappedShareJourney';

export default function WrappedJourneyScreen() {
  const { state } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    if (!state.user) {
      router.replace('/');
      return;
    }

    try {
      const summary = await analyticsApi.getUserSummary(state.user.id);
      setAnalytics(summary);
    } catch (error) {
      console.error('Error loading analytics for wrapped journey:', error);
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

