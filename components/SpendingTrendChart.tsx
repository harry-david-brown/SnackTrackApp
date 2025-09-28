import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSummary } from '../types/api';
import SimpleChart from './SimpleChart';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80;

interface SpendingTrendChartProps {
  analytics: UserSummary;
  timeframe: 'monthly' | 'yearly';
}

export default function SpendingTrendChart({ analytics, timeframe }: SpendingTrendChartProps) {
  const [animatedData, setAnimatedData] = useState<number[]>([]);

  useEffect(() => {
    // Animate the chart data
    const data = prepareChartData();
    if (data && data.length >= 2) {
      setAnimatedData(new Array(data.length).fill(0));
      
      // Animate to actual values
      const timer = setTimeout(() => {
        setAnimatedData(data);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [analytics, timeframe]);

  const prepareChartData = (): number[] | null => {
    if (!analytics?.monthlyBreakdown || analytics.monthlyBreakdown.length === 0) {
      return null;
    }

    let sortedMonths = analytics.monthlyBreakdown
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    let data: number[] = [];

    if (timeframe === 'yearly') {
      // Group by year
      const yearlyData: { [year: string]: number } = {};
      sortedMonths.forEach(month => {
        const year = new Date(month.month).getFullYear().toString();
        yearlyData[year] = (yearlyData[year] || 0) + month.totalSpent;
      });
      
      const years = Object.keys(yearlyData).sort();
      data = years.map(year => yearlyData[year]);
    } else {
      // Last 12 months
      sortedMonths = sortedMonths.slice(-12);
      data = sortedMonths.map(month => month.totalSpent);
    }

    // Ensure we have at least 2 data points for the chart
    if (data.length < 2) {
      // If we have only 1 data point, duplicate it to create a valid range
      if (data.length === 1) {
        data = [data[0], data[0]];
      } else {
        // If no data, create sample data
        data = [0, 0];
      }
    }

    return data;
  };

  const getLabels = (): string[] => {
    if (!analytics?.monthlyBreakdown || analytics.monthlyBreakdown.length === 0) {
      return ['No Data', 'No Data'];
    }

    let sortedMonths = analytics.monthlyBreakdown
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    let labels: string[] = [];

    if (timeframe === 'yearly') {
      const yearlyData: { [year: string]: number } = {};
      sortedMonths.forEach(month => {
        const year = new Date(month.month).getFullYear().toString();
        yearlyData[year] = (yearlyData[year] || 0) + month.totalSpent;
      });
      
      const years = Object.keys(yearlyData).sort();
      labels = years.map(year => year.slice(-2)); // Show last 2 digits of year
    } else {
      sortedMonths = sortedMonths.slice(-12);
      labels = sortedMonths.map(month => {
        const date = new Date(month.month);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });
    }

    // Ensure we have at least 2 labels for the chart
    if (labels.length < 2) {
      if (labels.length === 1) {
        labels = [labels[0], labels[0]];
      } else {
        labels = ['No Data', 'No Data'];
      }
    }

    return labels;
  };

  const data = prepareChartData();
  const labels = getLabels();

  // Always ensure we have valid data for the chart
  const hasRealData = analytics?.monthlyBreakdown && analytics.monthlyBreakdown.length > 0;
  
  // Use simple chart if we don't have enough data for LineChart
  if (!data || data.length < 2 || !labels || labels.length < 2) {
    if (hasRealData && data && data.length === 1) {
      // Show simple chart for single data point
      return (
        <SimpleChart
          title="📈 Spending Trend"
          subtitle="Your spending over time"
          data={[{ label: labels[0], value: data[0] }]}
          maxValue={data[0]}
        />
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No spending data available</Text>
        <Text style={styles.emptySubtext}>Upload CSV data to see beautiful charts!</Text>
      </View>
    );
  }

  const chartData = {
    labels,
    datasets: [{
      data: animatedData,
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      strokeWidth: 3,
    }],
  };

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
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
      fill: '#ffffff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: '#e0e0e0',
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            withScrollableDot={false}
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLines={true}
            withVerticalLines={false}
          />
        </View>
      </LinearGradient>
      
      {hasRealData && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Peak Month</Text>
            <Text style={styles.statValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(Math.max(...data))}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(data.reduce((a, b) => a + b, 0) / data.length)}
            </Text>
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
