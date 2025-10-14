import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { router } from 'expo-router';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage, ErrorType } from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/errorUtils';
import WrappedShareJourney from '../../components/WrappedShareJourney';
import QuickShareButton from '../../components/QuickShareButton';
import { cacheAnalytics, getCachedAnalytics } from '../../utils/offlineCache';
import { FadeInView } from '../../components/FadeInView';
import { SlideInView } from '../../components/SlideInView';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const { state, refreshUserData, logout } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<{ message: string; type: ErrorType } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const loadAnalytics = async () => {
    if (!state.user) return;
    
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    
    try {
      // Fetch fresh data from API
      const summary = await analyticsApi.getUserSummary(state.user.id);
      setAnalytics(summary);
      await cacheAnalytics(state.user.id, summary);
      
    } catch (error: any) {
      // Ignore SESSION_EXPIRED errors - the interceptor will handle logout
      if (error.message === 'SESSION_EXPIRED') {
        // Token refresh failed, user will be redirected to login
        return;
      }
      
      // API failed - try to use cached data
      const cached = await getCachedAnalytics(state.user.id);
      if (cached) {
        // Only set if we don't already have data
        if (!analytics) {
          setAnalytics(cached);
        }
        setAnalyticsError({
          message: 'Showing cached data. Pull to refresh when online.',
          type: 'network',
        });
      } else {
        // No cache available
        const apiError = parseApiError(error);
        setAnalyticsError({
          message: apiError.message,
          type: apiError.type,
        });
      }
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Load analytics only when user logs in/out, not on every user property change
  useEffect(() => {
    if (state.user) {
      loadAnalytics().then(() => {
        // Set flag after load completes to prevent useFocusEffect from triggering too early
        initialLoadDoneRef.current = true;
      });
    } else {
      // Reset flag when user logs out
      initialLoadDoneRef.current = false;
    }
  }, [state.user?.id]);

  // Reload analytics when screen comes into focus (e.g., after wrapped journey or upload)
  // Skip if we haven't done the initial load yet (prevents duplicate on login)
  useFocusEffect(
    React.useCallback(() => {
      // Only reload if we've already done the initial load
      // This prevents duplicate call when user first logs in
      if (state.user && initialLoadDoneRef.current) {
        loadAnalytics();
      }
    }, [state.user])
  );

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshUserData(),
        loadAnalytics()
      ]);
    } catch (error) {
      // Errors are handled by individual functions
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      // Force navigation even if logout fails
      router.replace('/');
    }
  };

  // If user logs out while on this screen, navigate to login
  useEffect(() => {
    if (!state.user && !state.isLoading) {
      router.replace('/');
    }
  }, [state.user, state.isLoading]);

  if (!state.user) {
    return null; // Will navigate in useEffect above
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoadingAnalytics} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Error Message */}
          {analyticsError && (
            <ErrorMessage
              error={analyticsError.message}
              type={analyticsError.type}
              onRetry={loadAnalytics}
              onDismiss={() => setAnalyticsError(null)}
            />
          )}

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🥡 Snack Track</Text>
              <Text style={styles.subtitle}>Welcome back, {state.user.email.split('@')[0]}!</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <SlideInView direction="left" delay={100}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="wallet-outline" size={24} color="#007AFF" />
                <Text style={styles.cardTitle}>Total Spent</Text>
              </View>
              <Text style={styles.cardValue}>
                {analytics ? formatCurrency(analytics.totalSpent) : formatCurrency(state.user.totalSpent)}
              </Text>
              <Text style={styles.cardSubtext}>All time</Text>
            </View>
            </SlideInView>
            
            <SlideInView direction="right" delay={200}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt-outline" size={24} color="#34C759" />
                <Text style={styles.cardTitle}>Receipts</Text>
              </View>
              <Text style={styles.cardValue}>
                {analytics ? analytics.totalReceipts : state.user.receiptCount}
              </Text>
              <Text style={styles.cardSubtext}>Orders tracked</Text>
            </View>
            </SlideInView>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/upload')}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="cloud-upload" size={24} color="white" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Upload CSV</Text>
                  <Text style={styles.actionButtonSubtitle}>Import your Uber Eats data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => router.push('/(tabs)/analytics')}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="analytics" size={24} color="#007AFF" />
                <View style={styles.actionButtonText}>
                  <Text style={[styles.actionButtonTitle, { color: '#007AFF' }]}>View Analytics</Text>
                  <Text style={[styles.actionButtonSubtitle, { color: '#666' }]}>See your spending insights</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Share Button - Show if user has data */}
          {analytics && analytics.totalReceipts > 0 && (
            <View style={styles.shareContainer}>
              <QuickShareButton 
                onPress={() => setShowShareModal(true)}
                variant="primary"
                size="medium"
                icon="share-social"
                title="Share Your Stats"
              />
            </View>
          )}

          {/* Recent Activity */}
          <View style={styles.activityContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {analytics && analytics.topRestaurants.length > 0 ? (
              <View style={styles.topRestaurantsCard}>
                <Text style={styles.subsectionTitle}>Top Restaurants</Text>
                {analytics.topRestaurants.slice(0, 3).map((restaurant, index) => (
                  <View key={index} style={styles.restaurantItem}>
                    <View style={styles.restaurantRank}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName}>{restaurant.name}</Text>
                      <Text style={styles.restaurantStats}>
                        {restaurant.count} orders • {formatCurrency(restaurant.totalSpent)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No receipts yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Upload your CSV file to start tracking your food spending
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Wrapped Share Journey Modal */}
      {showShareModal && analytics && (
        <WrappedShareJourney
          analytics={analytics}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#666',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#999',
  },
  actionsContainer: {
    marginBottom: 32,
  },
  shareContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonSecondary: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
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
    color: 'white',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activityContainer: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  topRestaurantsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  restaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  restaurantStats: {
    fontSize: 14,
    color: '#666',
  },
});
