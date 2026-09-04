import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing, type AppTheme } from '@constants/theme';
import type { ImportCompletionSummary } from '@features/import-flow/importCompletion';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { IconSurface } from '@components/ui/IconSurface';
import { Mascot } from '@components/mascot/Mascot';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useMemo } from 'react';

interface ImportCompletionPanelProps {
  summary: ImportCompletionSummary;
  onHome: () => void;
  onNext: () => void;
  onTryAnotherEmail: () => void;
}

export function ImportCompletionPanel({ summary, onHome, onNext, onTryAnotherEmail }: ImportCompletionPanelProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEmpty = summary.emptyHistory === true;
  const hasChanges = summary.orderCount > 0;
  const recommendsProvider = summary.nextAction.kind === 'provider';
  return (
    <View accessibilityLiveRegion="polite">
      <View style={styles.mascot}><Mascot pose={isEmpty ? "sad" : "prop-receipt"} size={88} /></View>
      <Text style={styles.eyebrow}>{isEmpty ? 'No orders found' : 'Import complete'}</Text>
      <Text style={styles.title}>{summary.title}</Text>
      <Text style={styles.subtitle}>{summary.message}</Text>
      <View style={styles.progress} accessibilityLabel="Step 3 of 3">
        {[1, 2, 3].map((value) => <View key={value} style={styles.progressSegment} />)}
      </View>

      <Card
        style={styles.card}
        accessibilityLabel={!isEmpty
          ? hasChanges
            ? `${summary.orderCount} orders included from ${summary.sourceName}`
            : `${summary.sourceName} history is already current`
          : `No new orders found from ${summary.sourceName}`}
      >
        <IconSurface icon={isEmpty ? "search-outline" : "checkmark-circle"} color={isEmpty ? theme.colors.warningDeep : theme.colors.successDark} />
        <View style={styles.resultCopy}>
          <Text style={styles.count}>{isEmpty ? '0' : hasChanges ? summary.orderCount : 'Current'}</Text>
          <Text style={styles.countLabel}>
            {isEmpty
              ? 'No supported orders found'
              : hasChanges
              ? summary.orderCount === 1 ? 'order included' : 'orders included'
              : 'No changes needed'}
          </Text>
          <Text style={styles.source}>From {summary.sourceName}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        {isEmpty ? (
          <>
            <AppButton label="Try another email" onPress={onTryAnotherEmail} />
            <AppButton label="Import delivery history" variant="secondary" onPress={onNext} />
          </>
        ) : recommendsProvider ? (
          <>
            <AppButton label={summary.nextAction.label} onPress={onNext} />
            <AppButton label="See my Home" variant="secondary" onPress={onHome} />
          </>
        ) : (
          <>
            <AppButton label="See my Home" icon="home-outline" onPress={onHome} />
            {summary.nextAction.kind !== 'done' ? (
              <AppButton label={summary.nextAction.label} variant="secondary" onPress={onNext} />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  eyebrow: { color: theme.colors.primary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  mascot: { alignItems: 'center', marginBottom: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 5, borderRadius: Radius.pill, backgroundColor: theme.colors.secondary },
  card: { padding: 22, flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 },
  resultCopy: { flex: 1 },
  count: { color: theme.colors.textPrimary, fontSize: 34, lineHeight: 38, fontWeight: '600' },
  countLabel: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  source: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  actions: { gap: 10 },
});

export default ImportCompletionPanel;
