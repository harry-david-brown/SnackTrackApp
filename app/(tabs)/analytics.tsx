import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  Share
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


export default function AnalyticsScreen() {
  const { state } = useUser();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [shareableImage, setShareableImage] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!state.user) return;
    
    try {
      setIsLoading(true);
      const summary = await analyticsApi.getUserSummary(state.user.id);
      setAnalytics(summary);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  useEffect(() => {
    if (state.user) {
      loadAnalytics();
    }
  }, [state.user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleShare = async () => {
    try {
      // For now, we'll share text. In the future, we can capture the chart as an image
      const shareText = `🥡 My Snack Track Analytics:
      
💰 Total Spent: ${formatCurrency(analytics?.totalSpent || 0)}
📊 Total Orders: ${analytics?.totalReceipts || 0}
🏆 Top Restaurant: ${analytics?.topRestaurants[0]?.name || 'N/A'}

Track your food spending with Snack Track!`;

      await Share.share({
        message: shareText,
        title: 'My Snack Track Analytics',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };


  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
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
            <Text style={styles.summaryValue}>{formatCurrency(analytics.totalSpent)}</Text>
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
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});