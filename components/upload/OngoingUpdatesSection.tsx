import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/ui/Card';
import { StatusBadge } from '@components/ui/StatusBadge';
import { AppButton } from '@components/ui/AppButton';
import { Colors } from '@constants/theme';
import type { OngoingUpdatesPresentation } from '@features/import-flow/trackingEligibility';

export function OngoingUpdatesSection({
  presentation,
  busy,
  onSetup,
}: {
  presentation: OngoingUpdatesPresentation;
  busy: boolean;
  onSetup: () => void;
}) {
  if (!presentation.visible) return null;
  return (
    <Card accessibilityLabel={`${presentation.title}. ${presentation.statusLabel}. ${presentation.body}`} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="pulse-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{presentation.title}</Text>
            <StatusBadge label={presentation.statusLabel} tone={presentation.tone} />
          </View>
          <Text style={styles.body}>{presentation.body}</Text>
        </View>
      </View>
      {presentation.actionLabel ? (
        <AppButton
          label={presentation.actionLabel}
          variant={presentation.actionVariant ?? 'secondary'}
          pending={busy}
          onPress={onSetup}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.infoBg },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  body: { marginTop: 5, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
