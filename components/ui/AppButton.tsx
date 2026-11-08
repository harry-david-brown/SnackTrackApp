import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Motion } from '@constants/motion';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'icon' | 'gold';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  pending?: boolean;
  size?: 'default' | 'journey';
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}

export function AppButton({
  label,
  variant = 'primary',
  pending = false,
  size = 'default',
  disabled,
  icon,
  accentColor,
  accessibilityLabel = label,
  onPressIn,
  onPressOut,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const inactive = Boolean(disabled || pending);
  const reduceMotion = useAppReducedMotion();
  const [pressed, setPressed] = useState(false);
  const press = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (inactive || reduceMotion) {
      setPressed(false);
      press.stopAnimation();
      press.setValue(0);
    }
    return () => press.stopAnimation();
  }, [inactive, press, reduceMotion]);
  const animatePress = (toValue: number) => {
    press.stopAnimation();
    Animated.timing(press, { toValue, duration: reduceMotion ? 0 : Motion.press, easing: Motion.easing, useNativeDriver: true }).start();
  };
  const foreground = accentColor === colors.white ? colors.forest700 : variant === 'secondary' || variant === 'tertiary' || variant === 'icon'
    ? colors.buttonSecondaryText
    : variant === 'gold' ? colors.hallDeep : colors.buttonPrimaryText;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPressIn={event => { if (!inactive) { setPressed(true); animatePress(1); } onPressIn?.(event); }}
      onPressOut={event => { setPressed(false); animatePress(0); onPressOut?.(event); }}
      style={[
        styles.base,
        size === 'journey' && styles.journey,
        { borderRadius: theme.radii.button },
        { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : Motion.pressedScale] }) }] },
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
    </AnimatedPressable>
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
  journey: { minHeight: 62, paddingVertical: 6 },
  shadow: { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  tertiary: { minHeight: 44 },
  icon: { width: 50, paddingHorizontal: 0 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.55 },
});
