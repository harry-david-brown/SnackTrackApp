import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/ui/Card';
import { Colors, Radius } from '@constants/theme';
import type { ImportOperation } from '@features/import-flow/contracts';
import { isActiveImportOperation } from '@features/import-flow/contracts';

const sourceName = (operation: ImportOperation): string => {
  switch (operation.kind) {
    case 'gmail_historical': return 'Gmail scan';
    case 'outlook_historical': return 'Outlook scan';
    case 'manual_tracking': return 'New-order check';
    case 'scheduled_tracking': return 'Automatic update';
    case 'export_file': return 'History-file import';
  }
};

export function ImportOperationCard({ operation }: { readonly operation: ImportOperation|null }) {
  if (!operation) return null;
  const active = isActiveImportOperation(operation);
  const succeeded = operation.status === 'succeeded';
  const cancelled = operation.status === 'cancelled';
  const title = active ? `${sourceName(operation)} in progress` : succeeded ? `${sourceName(operation)} complete` : cancelled ? `${sourceName(operation)} cancelled` : `${sourceName(operation)} needs attention`;
  const resultCount = Number(operation.result?.newOrders ?? operation.result?.importedCount ?? 0);
  const detail = active
    ? operation.status === 'retrying' ? 'A temporary problem occurred. SnackTrack is retrying safely.' : 'You can leave this screen. The import will continue in the background.'
    : succeeded ? resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'order was' : 'orders were'} added.` : 'Finished with no new supported orders.'
    : cancelled ? 'The pending import was cancelled by an administrator. Your existing history is safe.'
    : operation.errorMessage ?? 'Your existing history is safe. Try the source again when ready.';
  return (
    <Card style={styles.card} accessibilityLiveRegion="polite" accessibilityLabel={`${title}. ${detail}`}>
      <View style={styles.row}>
        <View style={[styles.icon, succeeded ? styles.successIcon : !active ? styles.errorIcon : null]}>
          {active ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name={succeeded ? 'checkmark' : 'alert'} size={20} color={succeeded ? Colors.success : Colors.error} />}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        {active ? <Text style={styles.percent}>{operation.progress}%</Text> : null}
      </View>
      {active ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, operation.progress)}%` }]} /></View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderColor: Colors.infoBorder, backgroundColor: Colors.infoBg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.chipActiveBg },
  successIcon: { backgroundColor: Colors.successBg },
  errorIcon: { backgroundColor: Colors.errorSurface },
  copy: { flex: 1, gap: 3 },
  title: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  detail: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  percent: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.slate200, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
});
