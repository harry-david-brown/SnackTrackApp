import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/ui/Card';
import { StatusBadge } from '@components/ui/StatusBadge';
import { AppButton } from '@components/ui/AppButton';
import type { AppTheme } from '@constants/theme';
import type { OngoingUpdatesPresentation } from '@features/import-flow/trackingEligibility';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useMemo } from 'react';

export function OngoingUpdatesSection({
  presentation,
  busy,
  onSetup,
}: {
  presentation: OngoingUpdatesPresentation;
  busy: boolean;
  onSetup: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!presentation.visible) return null;
  return (
    <Card accessibilityLabel={`${presentation.title}. ${presentation.statusLabel}. ${presentation.body}`} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="pulse-outline" size={22} color={theme.colors.primary} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.infoBg },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '600' },
  body: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
