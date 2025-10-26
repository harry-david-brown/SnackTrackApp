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
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../contexts/UserContext';
import ChartContainer from '../../components/ChartContainer';
import SpendingTrendChart from '../../components/SpendingTrendChart';
import RestaurantBreakdownChart from '../../components/RestaurantBreakdownChart';
import CategoryAnalysisChart from '../../components/CategoryAnalysisChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage, ErrorType } from '../../components/ErrorMessage';


export default function AnalyticsScreen() {
  const { state, loadAnalytics } = useUser();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [analyticsError, setAnalyticsError] = useState<{ message: string; type: ErrorType } | null>(null);
  
  // Use analytics from context instead of local state
  const analytics = state.analytics;
  const isLoading = state.analyticsLoading;

  // Load analytics only once if not already loaded
  useEffect(() => {
    if (state.user && !state.analytics) {
      loadAnalytics();
    }
  }, [state.user?.id, state.analytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
          shareable={false}
        >
          <View>
            <View style={{ position: 'absolute', opacity: selectedTimeframe === 'monthly' ? 1 : 0, zIndex: selectedTimeframe === 'monthly' ? 1 : 0 }}>
              <SpendingTrendChart analytics={analytics} timeframe="monthly" showLabels={false} />
            </View>
            <View style={{ opacity: selectedTimeframe === 'yearly' ? 1 : 0, zIndex: selectedTimeframe === 'yearly' ? 1 : 0 }}>
              <SpendingTrendChart analytics={analytics} timeframe="yearly" showLabels={false} />
            </View>
          </View>
        </ChartContainer>

        {/* Restaurant Breakdown - Only show if there's restaurant data */}
        {analytics.topRestaurants.length > 0 && (
          <ChartContainer 
            title="🍽️ Top Restaurants" 
            subtitle="Your favorite places to eat"
            shareable={false}
          >
            <RestaurantBreakdownChart analytics={analytics} />
          </ChartContainer>
        )}

        {/* Category Analysis - Only show if there's restaurant data */}
        {analytics.topRestaurants.length > 0 && (
          <ChartContainer 
            title="🥡 Food Categories" 
            subtitle="What types of food you love most"
            shareable={false}
          >
            <CategoryAnalysisChart analytics={analytics} />
          </ChartContainer>
        )}
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