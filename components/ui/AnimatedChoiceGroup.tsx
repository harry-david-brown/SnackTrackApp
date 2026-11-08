import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { Motion } from '@constants/motion';
import { Radius, Spacing } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { AppText } from './AppText';

interface Choice<Value extends string> { value: Value; label: string }
interface Props<Value extends string> {
  options: readonly Choice<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}

/** Measured choices keep the highlight aligned when labels wrap or text scales. */
export function AnimatedChoiceGroup<Value extends string>({ options, value, onChange }: Props<Value>) {
  const theme = useAppTheme();
  const reduceMotion = useAppReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const selected = layouts[value];
  const position = useRef(new Animated.ValueXY()).current;
  const width = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const initialized = useRef(false);

  useEffect(() => {
    if (!selected) return;
    const { x, y, width: nextWidth, height: nextHeight } = selected;
    if (reduceMotion || !initialized.current) {
      position.setValue({ x, y });
      width.setValue(nextWidth);
      height.setValue(nextHeight);
      initialized.current = true;
      return;
    }
    const config = { duration: Motion.selection, easing: Motion.easing, useNativeDriver: false };
    const animation = Animated.parallel([
      Animated.timing(position, { ...config, toValue: { x, y } }),
      Animated.timing(width, { ...config, toValue: nextWidth }),
      Animated.timing(height, { ...config, toValue: nextHeight }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [height, position, reduceMotion, selected, width]);

  return <View style={styles.choices}>
    {selected ? <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[styles.highlight, { backgroundColor: theme.colors.chipActiveBg, left: position.x, top: position.y, width, height }]}
    /> : null}
    {options.map(option => {
      const active = option.value === value;
      return <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${option.label}`}
        accessibilityState={{ selected: active }}
        onLayout={({ nativeEvent: { layout } }) => setLayouts(current => {
          const previous = current[option.value];
          if (previous && previous.x === layout.x && previous.y === layout.y && previous.width === layout.width && previous.height === layout.height) return current;
          return { ...current, [option.value]: layout };
        })}
        onPress={() => { if (!active) onChange(option.value); }}
        style={({ pressed }) => [styles.choice, {
          borderColor: active ? theme.colors.chipActiveBg : theme.colors.divider,
          backgroundColor: active && !selected ? theme.colors.chipActiveBg : 'transparent',
          opacity: pressed ? 0.76 : 1,
        }]}
      >
        <View accessible={false} style={{ opacity: active ? 1 : 0 }}><Ionicons name="checkmark" size={16} color={theme.colors.chipActiveText} /></View>
        <AppText variant="metadata" style={{ flexShrink: 1, fontFamily: theme.typography.medium, color: active ? theme.colors.chipActiveText : theme.colors.textSecondary }}>{option.label}</AppText>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  highlight: { position: 'absolute', borderRadius: Radius.pill },
  choice: { minHeight: 44, maxWidth: '100%', paddingHorizontal: Spacing.compact, paddingVertical: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderWidth: 1 },
});
