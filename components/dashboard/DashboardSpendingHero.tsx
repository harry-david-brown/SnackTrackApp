import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, FontFamily, Gradients, Radius, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from '@components/ui/AppText';
import type {
  DashboardPeriod,
  DashboardPeriodSummary,
} from '@features/dashboard/dashboardPeriodSummary';

interface DashboardSpendingHeroProps {
  summary: DashboardPeriodSummary;
  period: DashboardPeriod;
  loading: boolean;
  formatCurrency: (value: number) => string;
  onChangePeriod: (period: DashboardPeriod) => void;
}

export function DashboardSpendingHero({
  summary,
  period,
  loading,
  formatCurrency,
  onChangePeriod,
}: DashboardSpendingHeroProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const comparison = summary.comparison;
  const comparisonText = comparison
    ? comparison.direction === 'same'
      ? `About the same as ${comparison.previousLabel}`
      : `${formatCurrency(Math.abs(comparison.difference))} ${comparison.direction === 'down' ? 'less' : 'more'} than ${comparison.previousLabel}`
    : period === 'all_time'
      ? 'Across all imported orders'
      : summary.receiptCount > 0
        ? 'Your first tracked month'
        : 'No tracked orders this month yet';

  return (
    <View>
      <View style={styles.segment} accessibilityRole="tablist">
        <PeriodTab
          label="This month"
          selected={period === 'current_month'}
          onPress={() => onChangePeriod('current_month')}
        />
        <PeriodTab
          label="All time"
          selected={period === 'all_time'}
          onPress={() => onChangePeriod('all_time')}
        />
      </View>
      <LinearGradient
        colors={Gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
        accessibilityRole="summary"
        accessibilityLabel={`${summary.label}. ${loading ? 'Loading' : formatCurrency(summary.totalSpent)}. ${summary.receiptCount} orders. Average ${formatCurrency(summary.averageOrderValue)}.`}
      >
        <AppText variant="metadata" style={styles.label}>{summary.label}</AppText>
        <AppText variant="heroValue" style={styles.value} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>
          {loading ? '—' : formatCurrency(summary.totalSpent)}
        </AppText>
        <View style={styles.comparison}>
          <Ionicons
            name={comparison?.direction === 'up' ? 'trending-up' : comparison?.direction === 'down' ? 'trending-down' : 'remove'}
            size={16}
            color={Colors.white}
          />
          <AppText variant="metadata" style={styles.comparisonText}>{comparisonText}</AppText>
        </View>
        <View style={styles.metrics}>
          <Metric value={loading ? '—' : String(summary.receiptCount)} label="orders" />
          <Metric value={loading ? '—' : formatCurrency(summary.averageOrderValue)} label="average order" />
        </View>
      </LinearGradient>
    </View>
  );
}

function PeriodTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}
    >
      <AppText variant="button" style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</AppText>
    </Pressable>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={staticStyles.metric}>
      <AppText variant="surfaceTitle" style={staticStyles.metricValue} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>{value}</AppText>
      <AppText variant="metadata" style={staticStyles.metricLabel}>{label}</AppText>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  metric: { flex: 1, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.alpha(Colors.white, 0.28) },
  metricValue: { color: Colors.white, fontSize: 20, lineHeight: 25, fontFamily: FontFamily.medium },
  metricLabel: { marginTop: 3, color: Colors.alpha(Colors.white, 0.76) },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, marginBottom: 12, borderRadius: Radius.input, backgroundColor: theme.colors.gray100 },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  tabSelected: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider },
  tabPressed: { opacity: 0.78 },
  tabText: { color: theme.colors.textSecondary },
  tabTextSelected: { color: theme.colors.primary },
  hero: { padding: 22, borderRadius: Radius.card },
  label: { color: Colors.alpha(Colors.white, 0.82) },
  value: { marginTop: 7, color: Colors.white, fontFamily: FontFamily.semibold },
  comparison: { minHeight: 26, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  comparisonText: { flex: 1, color: Colors.alpha(Colors.white, 0.88) },
  metrics: { marginTop: 17, flexDirection: 'row', gap: 18 },
});
