import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Radius, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';

export type StatusTone = 'complete' | 'recommended' | 'optional' | 'warning' | 'error';

const presentationFor = (theme: AppTheme) => ({
  complete: { bg: theme.colors.successSurfaceCool, color: theme.colors.successDark, icon: 'checkmark-circle' },
  recommended: { bg: theme.colors.chipActiveBg, color: theme.colors.primary, icon: 'sparkles' },
  optional: { bg: theme.colors.slate50, color: theme.colors.textSecondary, icon: 'ellipse-outline' },
  warning: { bg: theme.colors.warningSurface, color: theme.colors.warningDeep, icon: 'alert-circle' },
  error: { bg: theme.colors.errorSurface, color: theme.colors.errorDark, icon: 'close-circle' },
} as const);

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const presentation = presentationFor(useAppTheme())[tone];
  return (
    <View accessibilityLabel={`${label} status`} style={[styles.badge, { backgroundColor: presentation.bg }]}>
      <Ionicons name={presentation.icon} size={13} color={presentation.color} />
      <Text style={[styles.label, { color: presentation.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minHeight: 24, borderRadius: Radius.fab, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '500' },
});
