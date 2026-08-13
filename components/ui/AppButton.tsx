import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { Colors, Radius, Shadows } from '@constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'icon';

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
  const inactive = Boolean(disabled || pending);
  const foreground = variant === 'secondary' || variant === 'icon'
    ? Colors.buttonSecondaryText
    : Colors.buttonPrimaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'destructive' && styles.destructive,
        variant === 'icon' && styles.icon,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        accentColor && variant === 'primary' && { backgroundColor: accentColor },
      ]}
      {...props}
    >
      {pending ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
      {variant !== 'icon' ? <Text style={[styles.label, { color: foreground }]}>{pending ? 'Please wait…' : label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: Colors.primary, ...Shadows.button },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.buttonSecondaryBorder },
  destructive: { backgroundColor: Colors.error },
  icon: { width: 48, paddingHorizontal: 0, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  label: { fontSize: 16, fontWeight: '800' },
});
