import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/ui/Card';
import { useMemo } from 'react';
import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from '@components/ui/AppText';
import type { ImportOperation } from '@features/import-flow/contracts';
import { isActiveImportOperation } from '@features/import-flow/contracts';
import { resolveImportOperationResult, importResultCopy } from '@features/import-flow/importOperationResult';

const sourceName = (operation: ImportOperation): string => {
  switch (operation.kind) {
    case 'gmail_historical': return 'Gmail scan';
    case 'outlook_historical': return 'Outlook scan';
    case 'manual_tracking': return 'New-order check';
    case 'gmail_push_tracking': return 'Automatic update';
    case 'receipt_rebuild': return 'History review';
    case 'receipt_publish': return 'History update';
    case 'receipt_rollback': return 'History restoration';
    case 'scheduled_tracking': return 'Automatic update';
    case 'export_ready_check': return 'Ready-email check';
    case 'export_file': return 'History-file import';
  }
};

export function ImportOperationCard({
  operation,
  onPress,
}: {
  readonly operation: ImportOperation|null;
  readonly onPress?: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!operation || operation.kind === 'export_ready_check') return null;
  const active = isActiveImportOperation(operation);
  const succeeded = operation.status === 'succeeded';
  const cancelled = operation.status === 'cancelled';
  const title = active ? `${sourceName(operation)} in progress` : succeeded ? `${sourceName(operation)} complete` : cancelled ? `${sourceName(operation)} cancelled` : `${sourceName(operation)} needs attention`;
  const summary = resolveImportOperationResult(operation);
  const resultCount = summary.newOrders;
  const enrichedCount = summary.updatedOrders ?? 0;
  const reconciliationDetail = [
    enrichedCount > 0 ? `${enrichedCount} existing orders updated.` : '',
  ].filter(Boolean).join(' ');
  const historyMaintenance = operation.kind.startsWith('receipt_');
  const detail = historyMaintenance && succeeded ? `${Number(operation.result?.changed ?? 0)} orders reviewed or updated.` : active
    ? operation.status === 'retrying' ? 'We hit a temporary issue. Your progress is saved, and we’ll retry automatically.' : operation.presentation?.mode === 'delayed' ? 'Your history is safe. Explore while SnackTrack finishes in the background.' : 'SnackTrack is securely building your order history.'
    : succeeded ? resultCount !== null && resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'order was' : 'orders were'} added.` : importResultCopy(summary).body
    : cancelled ? 'The pending import was cancelled by an administrator. Your existing history is safe.'
    : operation.errorMessage ?? 'Your existing history is safe. Try the source again when ready.';
  const progress = Math.max(0, Math.min(100, Math.round(operation.progress)));
  const content = (
    <Card style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View style={[styles.icon, succeeded ? styles.successIcon : !active ? styles.errorIcon : null]}>
          {active ? <ActivityIndicator color={theme.colors.primary} /> : <Ionicons name={succeeded ? 'checkmark' : 'alert'} size={20} color={succeeded ? theme.colors.success : theme.colors.error} />}
        </View>
        <View style={styles.copy}>
          <AppText variant="rowTitle">{title}</AppText>
          <AppText variant="metadata" style={styles.detail}>{detail}{succeeded && reconciliationDetail ? ` ${reconciliationDetail}` : ''}</AppText>
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={19} color={theme.colors.textSecondary} /> : null}
      </View>
      {active ? (
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
          <View style={styles.progressLabels}>
            <AppText variant="metadata" tone="muted">Import progress</AppText>
            <AppText variant="metadata" tone="brand">{progress}%</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      ) : null}
    </Card>
  );
  const accessibleDetail = `${detail}${succeeded && reconciliationDetail ? ` ${reconciliationDetail}` : ''}`;
  if (!onPress) return <View accessibilityLabel={`${title}. ${accessibleDetail}`}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${accessibleDetail}. ${progress}% complete. View progress.`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
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
  progress: { marginTop: 4, gap: 8 },
  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressTrack },
  progressFill: { height: '100%', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressFill },
  pressed: { opacity: 0.78 },
});
