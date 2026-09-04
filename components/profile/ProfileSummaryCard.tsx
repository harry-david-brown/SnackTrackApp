import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, FontFamily, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { Card } from '@components/ui/Card';
import { AppText } from '@components/ui/AppText';
import { Mascot } from '@components/mascot/Mascot';

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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Card style={styles.card} accessibilityLabel={`Profile for ${email}`}>
      <View style={styles.identityRow}>
        <View style={styles.mascot}><Mascot pose="sunglasses" size={88} /></View>
        <View style={styles.identityCopy}>
          <AppText variant="surfaceTitle" style={styles.email} numberOfLines={1}>{email}</AppText>
          <AppText variant="metadata" style={styles.memberSince}>Tracking since {formatMemberSince(createdAt)}</AppText>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <AppText variant="surfaceTitle" style={styles.statValue} numberOfLines={2}>{totalSpent}</AppText>
          <AppText variant="metadata" style={styles.statLabel}>Tracked spend</AppText>
        </View>
        <View style={styles.stat}>
          <AppText variant="surfaceTitle" style={styles.statValue} numberOfLines={2}>{totalReceipts}</AppText>
          <AppText variant="metadata" style={styles.statLabel}>Orders</AppText>
        </View>
      </View>
    </Card>
  );
}

const createStyles = (_theme: AppTheme) => StyleSheet.create({
  card: { padding: 18, marginBottom: 20, backgroundColor: Colors.forest850 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  mascot: { width: 90, height: 80, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1 },
  email: { fontFamily: FontFamily.medium, marginBottom: 4, color: Colors.white },
  memberSince: { fontSize: 12, lineHeight: 17, color: Colors.alpha(Colors.white, 0.65) },
  stats: { flexDirection: 'row', gap: 20, marginTop: 16, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.alpha(Colors.white, 0.13) },
  stat: { flex: 1 },
  statValue: { fontSize: 20, lineHeight: 25, fontFamily: FontFamily.medium, color: Colors.white, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.alpha(Colors.white, 0.62) },
});
