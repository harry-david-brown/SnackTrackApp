import { Colors } from '@constants/theme';
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSummary } from '@/types/api';
import { useCurrency } from '@contexts/CurrencyContext';
import SimpleChart from './SimpleChart';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 120; // Account for container margin (20) + padding (40) + extra space (60)
const monthParts = (month: string) => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(month);
  return match ? { year: match[1], month: Number(match[2]) } : null;
};

interface SpendingTrendChartProps {
  analytics: UserSummary;
  timeframe: 'monthly' | 'yearly';
  showLabels?: boolean;
}

export default function SpendingTrendChart({ analytics, timeframe, showLabels = true }: SpendingTrendChartProps) {
  const { formatCurrency } = useCurrency();
  
  const prepareChartData = (): number[] | null => {
    if (!analytics?.monthlyBreakdown || analytics.monthlyBreakdown.length === 0) {
      return null;
    }

    let sortedMonths = [...analytics.monthlyBreakdown]
      .sort((a, b) => a.month.localeCompare(b.month));

    let data: number[] = [];

    if (timeframe === 'yearly') {
      // Group by year
      const yearlyData: { [year: string]: number } = {};
      sortedMonths.forEach(month => {
        const year = monthParts(month.month)?.year ?? month.month.slice(0, 4);
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

  // Get data immediately without animation
  const animatedData = prepareChartData() || [];

  const getLabels = (): string[] => {
    if (!showLabels) {
      // Return empty labels to hide x-axis
      const data = prepareChartData();
      return data ? new Array(data.length).fill('') : ['', ''];
    }

    if (!analytics?.monthlyBreakdown || analytics.monthlyBreakdown.length === 0) {
      return ['No Data', 'No Data'];
    }

    let sortedMonths = [...analytics.monthlyBreakdown]
      .sort((a, b) => a.month.localeCompare(b.month));

    let labels: string[] = [];

    if (timeframe === 'yearly') {
      const yearlyData: { [year: string]: number } = {};
      sortedMonths.forEach(month => {
        const year = monthParts(month.month)?.year ?? month.month.slice(0, 4);
        yearlyData[year] = (yearlyData[year] || 0) + month.totalSpent;
      });
      
      const years = Object.keys(yearlyData).sort();
      labels = years.map(year => year.slice(-2)); // Show last 2 digits of year
    } else {
      sortedMonths = sortedMonths.slice(-12);
      labels = sortedMonths.map(month => {
        const parts = monthParts(month.month);
        if (!parts) return month.month;
        const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' })
          .format(new Date(2000, parts.month - 1, 1));
        return `${monthLabel} '${parts.year.slice(-2)}`;
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
        <Text style={styles.emptySubtext}>Add order history to see your spending trend.</Text>
      </View>
    );
  }

  const chartData = {
    labels,
    datasets: [{
      data: animatedData,
      color: (opacity = 1) => Colors.alpha(Colors.primary, opacity),
      strokeWidth: 3,
    }],
  };

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
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary,
      fill: Colors.white,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: Colors.divider,
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
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
              {formatCurrency(Math.max(...data))}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {formatCurrency(data.reduce((a, b) => a + b, 0) / data.length)}
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
});
