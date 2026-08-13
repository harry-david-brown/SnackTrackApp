import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import { Card } from '@components/ui/Card';

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
      <View style={styles.avatar} accessible accessibilityLabel={`${email.charAt(0).toUpperCase()} avatar`}>
        <Text style={styles.avatarText}>{email.charAt(0).toUpperCase()}</Text>
      </View>
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
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarText: { fontSize: 32, color: Colors.white, fontWeight: 'bold' },
  email: { fontSize: 18, fontWeight: '600', marginBottom: 4, textAlign: 'center', color: Colors.textPrimary },
  memberSince: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 20, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
});
