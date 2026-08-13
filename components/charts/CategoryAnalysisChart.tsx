import { Colors } from '@constants/theme';
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSummary } from '@/types/api';
import { useCurrency } from '@contexts/CurrencyContext';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 120; // Account for container margin (20) + padding (40) + extra space (60)

interface CategoryAnalysisChartProps {
  analytics: UserSummary;
}

function CategoryAnalysisChart({ analytics }: CategoryAnalysisChartProps) {
  const { formatCurrency } = useCurrency();
  const [animatedData, setAnimatedData] = useState<number[]>([]);

  const categorizeRestaurant = useCallback((restaurantName: string): string => {
    const name = restaurantName.toLowerCase();
    
    if (name.includes('mcdonald') || name.includes('burger') || name.includes('kfc') || 
        name.includes('wendy') || name.includes('burger king') || name.includes('subway')) {
      return 'Fast Food';
    } else if (name.includes('pizza') || name.includes('domino') || name.includes('papa john')) {
      return 'Pizza';
    } else if (name.includes('chinese') || name.includes('thai') || name.includes('japanese') || 
               name.includes('sushi') || name.includes('korean') || name.includes('vietnamese')) {
      return 'Asian';
    } else if (name.includes('mexican') || name.includes('burrito') || name.includes('taco') || 
               name.includes('chipotle') || name.includes('qdoba')) {
      return 'Mexican';
    } else if (name.includes('italian') || name.includes('pasta') || name.includes('olive garden')) {
      return 'Italian';
    } else if (name.includes('coffee') || name.includes('starbucks') || name.includes('tim horton')) {
      return 'Coffee & Cafe';
    } else if (name.includes('dessert') || name.includes('ice cream') || name.includes('sweet')) {
      return 'Desserts';
    } else {
      return 'Other';
    }
  }, []);

  const prepareChartData = useCallback(() => {
    if (!analytics?.topRestaurants || analytics.topRestaurants.length === 0) {
      return null;
    }

    const categories: { [key: string]: { total: number; count: number } } = {};

    analytics.topRestaurants.forEach(restaurant => {
      const category = categorizeRestaurant(restaurant.name);
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0 };
      }
      categories[category].total += restaurant.totalSpent;
      categories[category].count += restaurant.count;
    });

    // Filter out categories with no spending and sort by total
    const sortedCategories = Object.entries(categories)
      .filter(([_, data]) => data.total > 0)
      .sort(([, a], [, b]) => b.total - a.total);

    // Ensure we have at least 2 categories for the chart
    if (sortedCategories.length === 0) {
      return null;
    }

    return {
      labels: sortedCategories.map(([category, _]) => category),
      data: sortedCategories.map(([_, data]) => data.total),
      fullData: sortedCategories.map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
      })),
    };
  }, [analytics.topRestaurants, categorizeRestaurant]);

  const chartData = useMemo(() => {
    return prepareChartData();
  }, [prepareChartData]);

  useEffect(() => {
    if (chartData) {
      setAnimatedData(new Array(chartData.data.length).fill(0));
      
      // Animate to actual values
      const timer = setTimeout(() => {
        setAnimatedData(chartData.data);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [chartData]);

  if (!chartData || chartData.data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No category data available</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: Colors.white,
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => Colors.alpha(Colors.primary, opacity),
    labelColor: (opacity = 1) => Colors.alpha(Colors.black, opacity),
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: Colors.divider,
      strokeWidth: 1,
    },
  };


  const totalSpent = analytics.totalSpent;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.secondary, Colors.forest400]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: animatedData }],
            }}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            showBarTops={false}
            fromZero={true}
            withInnerLines={false}
          />
        </View>
      </LinearGradient>
      
      <View style={styles.categoriesContainer}>
        {chartData.fullData.map((category, index) => (
          <View key={category.category} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text style={styles.categoryOrders}>{category.count} orders</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
                <Text style={styles.categoryPercentage}>
                  {totalSpent > 0 ? ((category.total / totalSpent) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${totalSpent > 0 ? Math.min(100, (category.total / totalSpent) * 100) : 0}%`,
                    backgroundColor: chartConfig.color(0.8),
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(CategoryAnalysisChart);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  chartContainer: {
    backgroundColor: Colors.alpha(Colors.white, 0.1),
    borderRadius: 12,
    padding: 10,
  },
  chart: {
    borderRadius: 12,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  categoriesContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryOrders: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
