import { formatReceiptMoney } from '@utils/receiptMoney';
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
  const displayMoney = (value: number) => formatReceiptMoney(value, summary.currencyCode, formatCurrency);
  const comparison = summary.comparison;
  const title = comparison
    ? comparison.direction === 'same'
      ? `About the same as ${comparison.previousLabel}`
      : `${displayMoney(Math.abs(comparison.difference))} ${comparison.direction === 'down' ? 'less' : 'more'} than ${comparison.previousLabel}`
    : summary.receiptCount > 0
      ? summary.isFirstTrackedMonth ? 'Your first tracked month' : 'Month comparison unavailable'
      : 'No tracked orders found';
  const count = summary.pricedCount ?? summary.receiptCount;
  const basis = count === summary.receiptCount ? '' : ` priced${summary.currencyCode ? ` in ${summary.currencyCode}` : ''}`;
  let body = `${count} ${count === 1 ? 'order' : 'orders'}${basis} averaged ${displayMoney(summary.averageOrderValue)} each.`;
  if (summary.receiptCount === 0) body = `SnackTrack did not find any orders for ${summary.monthLabel ?? 'this month'}.`;
  else if (count === 0) body = 'No priced orders are available for this average.';

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
