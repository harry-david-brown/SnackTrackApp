import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Surface } from '@components/ui/Surface';
import { AppText } from '@components/ui/AppText';
import { useAppTheme } from '@contexts/AppearanceContext';

/** The disclosure is identical wherever a mailbox receives its first import. */
export function EmailImportReview({ automaticUpdatesDescription }: { automaticUpdatesDescription: string }) {
  const theme = useAppTheme();
  const rows = [
    { icon: 'search-outline' as const, title: 'Uber Eats & DoorDash receipts', body: 'We look for supported delivery receipts from both services.' },
    { icon: 'copy-outline' as const, title: 'Keep existing orders', body: 'Matching orders may gain details without being added twice.' },
    { icon: 'sync-outline' as const, title: 'Automatic email updates', body: automaticUpdatesDescription },
  ];
  return <Surface>{rows.map((row, i) => <View key={row.title} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider }]}>
    <Ionicons name={row.icon} size={24} color={theme.colors.primary} />
    <View style={styles.copy}><AppText variant="rowTitle">{row.title}</AppText><AppText variant="metadata" tone="muted">{row.body}</AppText></View>
  </View>)}</Surface>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12 }, copy: { flex: 1, gap: 4 } });
