import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import ChartContainer from '../../components/ChartContainer';
import SpendingTrendChart from '../../components/SpendingTrendChart';
import RestaurantBreakdownChart from '../../components/RestaurantBreakdownChart';
import CategoryAnalysisChart from '../../components/CategoryAnalysisChart';
import InsightsPanel from '../../components/InsightsPanel';
import WrappedShareJourney from '../../components/WrappedShareJourney';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage, ErrorType } from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/errorUtils';


export default function AnalyticsScreen() {
  const { state } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [showShareModal, setShowShareModal] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<{ message: string; type: ErrorType } | null>(null);

  const loadAnalytics = async () => {
    if (!state.user) return;
    
    try {
      setIsLoading(true);
      setAnalyticsError(null);
      const summary = await analyticsApi.getUserSummary(state.user.id);
      setAnalytics(summary);
    } catch (error) {
      const apiError = parseApiError(error);
      setAnalyticsError({
        message: apiError.message,
        type: apiError.type,
      });
      
      // Create a fallback analytics object with empty data
      const fallbackAnalytics: UserSummary = {
        userId: state.user.id,
        totalSpent: 0,
        totalReceipts: 0,
        averageOrderValue: 0,
        topRestaurants: [],
        monthlyBreakdown: [],
        refundedReceipts: 0,
        dataQuality: {
          issues: [],
          recommendations: ['Upload some CSV data to see beautiful analytics!']
        }
      };
      setAnalytics(fallbackAnalytics);
    } finally {
      setIsLoading(false);
    }
  };

  // Only load analytics when user logs in/out, not on every user property change
  useEffect(() => {
    if (state.user) {
      loadAnalytics();
    }
  }, [state.user?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };


  if (!analytics && !analyticsError) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner text="Loading analytics..." />
      </SafeAreaView>
    );
  }

  // If no analytics data available, show error state
  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <ErrorMessage
            error={analyticsError?.message || "No analytics data available"}
            type={analyticsError?.type || "validation"}
            onRetry={loadAnalytics}
            onDismiss={() => setAnalyticsError(null)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadAnalytics} />
        }
      >
        {/* Error Message */}
        {analyticsError && (
          <View style={{ margin: 20 }}>
            <ErrorMessage
              error={analyticsError.message}
              type={analyticsError.type}
              onRetry={loadAnalytics}
              onDismiss={() => setAnalyticsError(null)}
            />
          </View>
        )}

        {/* Header */}
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📊 Analytics</Text>
              <Text style={styles.headerSubtitle}>Your spending insights</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === 'monthly' && styles.timeframeButtonActive
            ]}
            onPress={() => setSelectedTimeframe('monthly')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === 'monthly' && styles.timeframeTextActive
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === 'yearly' && styles.timeframeButtonActive
            ]}
            onPress={() => setSelectedTimeframe('yearly')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === 'yearly' && styles.timeframeTextActive
            ]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(analytics.totalSpent)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Orders</Text>
            <Text style={styles.summaryValue}>{analytics.totalReceipts}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Order</Text>
            <Text style={styles.summaryValue}>{formatCurrency(analytics.averageOrderValue)}</Text>
          </View>
        </View>

        {/* Spending Trend Chart */}
        <ChartContainer 
          title="📈 Spending Trend" 
          subtitle={`${selectedTimeframe === 'monthly' ? 'Monthly' : 'Yearly'} spending over time`}
        >
          <SpendingTrendChart analytics={analytics} timeframe={selectedTimeframe} />
        </ChartContainer>

        {/* Restaurant Breakdown - Only show if there's restaurant data */}
        {analytics.topRestaurants.length > 0 && (
          <ChartContainer 
            title="🍽️ Top Restaurants" 
            subtitle="Your favorite places to eat"
          >
            <RestaurantBreakdownChart analytics={analytics} />
          </ChartContainer>
        )}

        {/* Category Analysis - Only show if there's restaurant data */}
        {analytics.topRestaurants.length > 0 && (
          <ChartContainer 
            title="🥡 Food Categories" 
            subtitle="What types of food you love most"
          >
            <CategoryAnalysisChart analytics={analytics} />
          </ChartContainer>
        )}

        {/* Insights Section */}
        <InsightsPanel analytics={analytics} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
  },
  timeframeContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeframeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  timeframeTextActive: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
});