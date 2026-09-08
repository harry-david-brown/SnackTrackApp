import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'icon' | 'gold';

interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  pending?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}

export function AppButton({
  label,
  variant = 'primary',
  pending = false,
  disabled,
  icon,
  accentColor,
  accessibilityLabel = label,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const inactive = Boolean(disabled || pending);
  const foreground = accentColor === colors.white ? colors.forest700 : variant === 'secondary' || variant === 'tertiary' || variant === 'icon'
    ? colors.buttonSecondaryText
    : variant === 'gold' ? colors.hallDeep : colors.buttonPrimaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: theme.radii.button },
        variant === 'primary' && { backgroundColor: colors.primary, shadowColor: colors.primary },
        variant === 'primary' && styles.shadow,
        variant === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.buttonSecondaryBorder },
        variant === 'tertiary' && styles.tertiary,
        variant === 'destructive' && { backgroundColor: colors.error },
        variant === 'icon' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
        variant === 'icon' && styles.icon,
        variant === 'gold' && { backgroundColor: colors.evidenceGold },
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        accentColor && variant === 'primary' && { backgroundColor: accentColor },
      ]}
      {...props}
    >
      {pending ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
      {variant !== 'icon' ? <AppText variant="button" style={{ color: foreground, flexShrink: 1, textAlign: 'center', paddingVertical: 10 }}>{pending ? 'Please wait…' : label}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shadow: { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  tertiary: { minHeight: 44 },
  icon: { width: 50, paddingHorizontal: 0 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.55 },
});
