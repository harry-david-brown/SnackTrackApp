import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@constants/theme';

export type StatusTone = 'complete' | 'recommended' | 'optional' | 'warning' | 'error';

const PRESENTATION = {
  complete: { bg: Colors.successSurfaceCool, color: Colors.successDark, icon: 'checkmark-circle' },
  recommended: { bg: Colors.chipActiveBg, color: Colors.primary, icon: 'sparkles' },
  optional: { bg: Colors.slate50, color: Colors.textSecondary, icon: 'ellipse-outline' },
  warning: { bg: Colors.warningSurface, color: Colors.warningDeep, icon: 'alert-circle' },
  error: { bg: Colors.errorSurface, color: Colors.errorDark, icon: 'close-circle' },
} as const;

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const presentation = PRESENTATION[tone];
  return (
    <View accessibilityLabel={`${label} status`} style={[styles.badge, { backgroundColor: presentation.bg }]}>
      <Ionicons name={presentation.icon} size={13} color={presentation.color} />
      <Text style={[styles.label, { color: presentation.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minHeight: 24, borderRadius: Radius.fab, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '700' },
});

