import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@constants/theme';
import type { ImportCompletionSummary } from '@features/import-flow/importCompletion';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { IconSurface } from '@components/ui/IconSurface';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';

interface ImportCompletionPanelProps {
  summary: ImportCompletionSummary;
  onHome: () => void;
  onNext: () => void;
  onMarkUberNotUsed?: () => void;
  onTryAnotherEmail: () => void;
  onDefer: () => void;
}

export function ImportCompletionPanel({ summary, onHome, onNext, onMarkUberNotUsed, onTryAnotherEmail, onDefer }: ImportCompletionPanelProps) {
  const isEmpty = summary.emptyHistory === true;
  const hasChanges = summary.orderCount > 0;
  const recommendsProvider = summary.nextAction.kind === 'provider';
  return (
    <View accessibilityLiveRegion="polite">
      <View style={styles.mascot}><MascotPlaceholder pose={isEmpty ? "sad" : "prop-receipt"} size={88} /></View>
      <Text style={styles.eyebrow}>{isEmpty ? 'No orders found' : 'History updated'}</Text>
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
        <IconSurface icon={isEmpty ? "search-outline" : "checkmark-circle"} color={isEmpty ? Colors.warningDeep : Colors.successDark} />
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
        {recommendsProvider ? (
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
        {summary.canMarkUberNotUsed && onMarkUberNotUsed ? (
          <AppButton label="I don’t use Uber Eats" variant="secondary" onPress={onMarkUberNotUsed} />
        ) : null}
        {isEmpty ? (
          <>
            <AppButton label="Try another email" variant="secondary" onPress={onTryAnotherEmail} />
            <AppButton label="Do this later" variant="secondary" onPress={onDefer} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  mascot: { alignItems: 'center', marginBottom: 10 },
  title: { color: Colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, lineHeight: 24 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.secondary },
  card: { padding: 22, flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 },
  resultCopy: { flex: 1 },
  count: { color: Colors.textPrimary, fontSize: 34, lineHeight: 38, fontWeight: '800' },
  countLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  source: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  actions: { gap: 10 },
});

export default ImportCompletionPanel;
