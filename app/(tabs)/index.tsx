import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, InteractionManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { router } from 'expo-router';
import { ErrorMessage, ErrorType } from '../../components/ErrorMessage';
import { SlideInView } from '../../components/SlideInView';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const { state, logout, loadAnalytics } = useUser();
  const { formatCurrency } = useCurrency();
  const [analyticsError, setAnalyticsError] = useState<{ message: string; type: ErrorType } | null>(null);
  const initialLoadDoneRef = useRef(false);
  
  // Use analytics from context instead of local state
  const analytics = state.analytics;

  // Load analytics only when user logs in/out, not on every user property change
  useEffect(() => {
    if (state.user && !state.analytics && !state.analyticsLoading) {
      // Only load if not already loading (prevents duplicate calls after login)
      loadAnalytics().then(() => {
        // Set flag after load completes to prevent useFocusEffect from triggering too early
        initialLoadDoneRef.current = true;
      });
    } else if (!state.user) {
      // Reset flag when user logs out
      initialLoadDoneRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id, state.analytics, state.analyticsLoading]);

  // Reload analytics when screen comes into focus (e.g., after wrapped journey or upload)
  // Skip if we haven't done the initial load yet (prevents duplicate on login)
  useFocusEffect(
    React.useCallback(() => {
      // Only reload if we've already done the initial load AND we don't have analytics
      // This prevents unnecessary calls when just switching tabs
      if (state.user && initialLoadDoneRef.current && !state.analytics) {
        loadAnalytics();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.user, state.analytics])
  );



  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch {
      // Force navigation even if logout fails
      router.replace('/');
    }
  };

  // If user logs out while on this screen, navigate to login
  useEffect(() => {
    if (!state.user && !state.isLoading) {
      // Defer navigation until after all interactions are complete
      // This ensures the router is fully mounted before attempting navigation
      const interactionHandle = InteractionManager.runAfterInteractions(() => {
        try {
          router.replace('/');
        } catch {
          // If navigation fails, router isn't ready yet - try again after a short delay
          setTimeout(() => {
            try {
              router.replace('/');
            } catch (retryError) {
              // If it still fails, ignore - user might be navigating away anyway
              console.warn('Navigation to login screen failed:', retryError);
            }
          }, 200);
        }
      });
      
      return () => {
        interactionHandle.cancel();
      };
    }
  }, [state.user, state.isLoading]);

  if (!state.user) {
    // Return loading state instead of null to prevent navigation errors
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
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
              <Text style={styles.title}>🥡 SnackTrack</Text>
              <Text style={styles.subtitle}>Welcome back!</Text>
            </View>
            {__DEV__ && (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color="#666" />
              </TouchableOpacity>
            )}
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
                  <Text style={styles.actionButtonTitle}>Upload Uber Data</Text>
                  <Text style={styles.actionButtonSubtitle}>Import your order history</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

          </View>

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
