import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import { SlideInView } from '@components/ui/SlideInView';
import { Card } from '@components/ui/Card';

interface DashboardSummaryCardsProps {
  totalSpent: string;
  receiptCount: number | null;
}

export function DashboardSummaryCards({ totalSpent, receiptCount }: DashboardSummaryCardsProps) {
  return (
    <View style={styles.row} accessibilityRole="summary">
      <SlideInView direction="left" delay={100} style={styles.item}>
        <Card style={styles.card} accessibilityLabel={`Total spent, ${totalSpent}, all time`}>
          <View style={styles.header}>
            <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            <Text style={styles.label}>Total Spent</Text>
          </View>
          <Text style={styles.value} adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1}>{totalSpent}</Text>
          <Text style={styles.detail}>All time</Text>
        </Card>
      </SlideInView>
      <SlideInView direction="right" delay={200} style={styles.item}>
        <Card style={styles.card} accessibilityLabel={`Receipts, ${receiptCount ?? 'not loaded'}, orders tracked`}>
          <View style={styles.header}>
            <Ionicons name="receipt-outline" size={24} color={Colors.success} />
            <Text style={styles.label}>Receipts</Text>
          </View>
          <Text style={styles.value} numberOfLines={1}>{receiptCount ?? '—'}</Text>
          <Text style={styles.detail}>Orders tracked</Text>
        </Card>
      </SlideInView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  item: { flex: 1 },
  card: { minHeight: 145, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { flexShrink: 1, fontSize: 14, color: Colors.textSecondary, marginLeft: 8 },
  value: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  detail: { fontSize: 12, color: Colors.gray500 },
});
