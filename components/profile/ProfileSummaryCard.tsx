import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import { Card } from '@components/ui/Card';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';

interface ProfileSummaryCardProps {
  email: string;
  createdAt: string;
  totalSpent: string;
  totalReceipts: number;
}

const formatMemberSince = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function ProfileSummaryCard({ email, createdAt, totalSpent, totalReceipts }: ProfileSummaryCardProps) {
  return (
    <Card style={styles.card} accessibilityLabel={`Profile for ${email}`}>
      <View style={styles.mascot}><MascotPlaceholder pose="neutral" size={84} /></View>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.memberSince}>Member since {formatMemberSince(createdAt)}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={2}>{totalSpent}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={2}>{totalReceipts}</Text>
          <Text style={styles.statLabel}>Receipts</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 30, marginBottom: 20 },
  mascot: { marginBottom: 12 },
  email: { fontSize: 18, fontWeight: '600', marginBottom: 4, textAlign: 'center', color: Colors.textPrimary },
  memberSince: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 20, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
});
