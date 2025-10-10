import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary } from '../types/api';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80;

interface RestaurantBreakdownChartProps {
  analytics: UserSummary;
  maxRestaurants?: number;
}

export default function RestaurantBreakdownChart({ 
  analytics, 
  maxRestaurants = 5 
}: RestaurantBreakdownChartProps) {
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const prepareChartData = () => {
    if (!analytics?.topRestaurants || analytics.topRestaurants.length === 0) {
      return null;
    }

    const topRestaurants = analytics.topRestaurants.slice(0, maxRestaurants);
    
    // Ensure we have at least 1 restaurant for the chart
    if (topRestaurants.length === 0) {
      return null;
    }

    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FECA57', // Yellow
      '#FF9FF3', // Pink
      '#54A0FF', // Light Blue
      '#5F27CD', // Purple
    ];

    return {
      data: topRestaurants.map((restaurant, index) => ({
        name: restaurant.name.split(' ')[0], // Shorten names for chart
        population: restaurant.totalSpent,
        color: colors[index % colors.length],
        legendFontColor: '#333',
        legendFontSize: 12,
      })),
      fullData: topRestaurants, // Keep full data for details
    };
  };

  const chartData = prepareChartData();

  if (!chartData || chartData.data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No restaurant data available</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalSpent = chartData.data.reduce((sum, item) => sum + item.population, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FECA57']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData.data}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
            hasLegend={false}
          />
        </View>
      </LinearGradient>
      
      {/* Legend */}
      <View style={styles.legendContainer}>
        {chartData.data.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.legendItem,
              selectedSegment === index && styles.legendItemSelected
            ]}
            onPress={() => setSelectedSegment(selectedSegment === index ? null : index)}
          >
            <View style={styles.legendColorContainer}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendName}>{chartData.fullData[index].name}</Text>
                <Text style={styles.legendAmount}>{formatCurrency(item.population)}</Text>
              </View>
            </View>
            <View style={styles.legendStats}>
              <Text style={styles.legendPercentage}>
                {((item.population / totalSpent) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.legendOrders}>
                {chartData.fullData[index].count} orders
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Selected Restaurant Details */}
      {selectedSegment !== null && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Ionicons name="restaurant" size={20} color="#007AFF" />
            <Text style={styles.detailsTitle}>Restaurant Details</Text>
          </View>
          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Spent:</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(chartData.fullData[selectedSegment].totalSpent)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Number of Orders:</Text>
              <Text style={styles.detailValue}>
                {chartData.fullData[selectedSegment].count}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Average Order:</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(
                  chartData.fullData[selectedSegment].totalSpent / 
                  chartData.fullData[selectedSegment].count
                )}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  legendContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendItemSelected: {
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  legendColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  legendAmount: {
    fontSize: 12,
    color: '#666',
  },
  legendStats: {
    alignItems: 'flex-end',
  },
  legendPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  legendOrders: {
    fontSize: 12,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  detailsContent: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
