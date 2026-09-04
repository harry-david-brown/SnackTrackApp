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
      <View style={styles.identityRow}>
        <View style={styles.mascot}><MascotPlaceholder pose="sunglasses" size={88} /></View>
        <View style={styles.identityCopy}>
          <Text style={styles.email} numberOfLines={1}>{email}</Text>
          <Text style={styles.memberSince}>Tracking since {formatMemberSince(createdAt)}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={2}>{totalSpent}</Text>
          <Text style={styles.statLabel}>Tracked spend</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={2}>{totalReceipts}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, marginBottom: 20, backgroundColor: Colors.forest850 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  mascot: { width: 90, height: 80, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1 },
  email: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: Colors.white },
  memberSince: { fontSize: 12, lineHeight: 17, color: Colors.alpha(Colors.white, 0.65) },
  stats: { flexDirection: 'row', gap: 20, marginTop: 16, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.alpha(Colors.white, 0.13) },
  stat: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '600', color: Colors.white, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.alpha(Colors.white, 0.62) },
});
