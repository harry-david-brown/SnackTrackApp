import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/ui/Card';
import { useMemo } from 'react';
import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from '@components/ui/AppText';
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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!operation) return null;
  const active = isActiveImportOperation(operation);
  const succeeded = operation.status === 'succeeded';
  const cancelled = operation.status === 'cancelled';
  const title = active ? `${sourceName(operation)} in progress` : succeeded ? `${sourceName(operation)} complete` : cancelled ? `${sourceName(operation)} cancelled` : `${sourceName(operation)} needs attention`;
  const resultCount = Number(operation.result?.newOrders ?? operation.result?.importedCount ?? 0);
  const detail = active
    ? operation.status === 'retrying' ? 'A temporary problem occurred. SnackTrack is retrying safely.' : operation.presentation?.mode === 'delayed' ? 'Your history is safe. Explore while SnackTrack finishes in the background.' : 'SnackTrack is securely building your order history.'
    : succeeded ? resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'order was' : 'orders were'} added.` : 'Finished with no new supported orders.'
    : cancelled ? 'The pending import was cancelled by an administrator. Your existing history is safe.'
    : operation.errorMessage ?? 'Your existing history is safe. Try the source again when ready.';
  return (
    <Card style={styles.card} accessibilityLiveRegion="polite" accessibilityLabel={`${title}. ${detail}`}>
      <View style={styles.row}>
        <View style={[styles.icon, succeeded ? styles.successIcon : !active ? styles.errorIcon : null]}>
          {active ? <ActivityIndicator color={theme.colors.primary} /> : <Ionicons name={succeeded ? 'checkmark' : 'alert'} size={20} color={succeeded ? theme.colors.success : theme.colors.error} />}
        </View>
        <View style={styles.copy}>
          <AppText variant="rowTitle">{title}</AppText>
          <AppText variant="metadata" style={styles.detail}>{detail}</AppText>
        </View>
      </View>
    </Card>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: { padding: 16, gap: 12, borderColor: theme.colors.infoBorder, backgroundColor: theme.colors.infoBg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.chipActiveBg },
  successIcon: { backgroundColor: theme.colors.successBg },
  errorIcon: { backgroundColor: theme.colors.errorSurface },
  copy: { flex: 1, gap: 3 },
  detail: { marginTop: 3 },
});
