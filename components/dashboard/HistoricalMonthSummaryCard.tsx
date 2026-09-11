import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@components/ui/AppText';
import { Card } from '@components/ui/Card';
import { Radius, Spacing, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { DashboardPeriodSummary } from '@features/dashboard/dashboardPeriodSummary';

interface HistoricalMonthSummaryCardProps {
  summary: DashboardPeriodSummary;
  formatCurrency: (value: number) => string;
}

export function HistoricalMonthSummaryCard({
  summary,
  formatCurrency,
}: HistoricalMonthSummaryCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const comparison = summary.comparison;
  const title = comparison
    ? comparison.direction === 'same'
      ? `About the same as ${comparison.previousLabel}`
      : `${formatCurrency(Math.abs(comparison.difference))} ${comparison.direction === 'down' ? 'less' : 'more'} than ${comparison.previousLabel}`
    : summary.receiptCount > 0
      ? 'Your first tracked month'
      : 'No tracked orders found';
  const body = summary.receiptCount > 0
    ? `${summary.receiptCount} ${summary.receiptCount === 1 ? 'order' : 'orders'} averaged ${formatCurrency(summary.averageOrderValue)} each.`
    : `SnackTrack did not find any orders for ${summary.monthLabel ?? 'this month'}.`;

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`${summary.monthLabel ?? 'Selected month'}. ${title}. ${body}`}
    >
      <View style={styles.heading}>
        <View style={styles.iconWell}>
          <Ionicons
            name={comparison?.direction === 'up' ? 'trending-up' : comparison?.direction === 'down' ? 'trending-down' : 'calendar-outline'}
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <AppText variant="surfaceTitle" style={styles.title}>{title}</AppText>
      </View>
      <AppText variant="surfaceBody" tone="muted" style={styles.body}>{body}</AppText>
    </Card>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: { padding: Spacing.section, marginTop: Spacing.compact },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.compact },
  iconWell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.icon + 2,
    backgroundColor: theme.colors.chipActiveBg,
  },
  title: { flex: 1 },
  body: { marginTop: Spacing.sm },
});
