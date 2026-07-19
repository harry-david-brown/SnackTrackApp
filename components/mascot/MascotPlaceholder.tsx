import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

/**
 * Poses required from the mascot art team. Each pose maps 1:1 to a final
 * asset in assets/mascot/ (e.g. pose "flex" → assets/mascot/flex.png).
 *
 * Already illustrated on the current style sheet:
 *   neutral, wink, cheer, thinking, shocked, sunglasses,
 *   prop-receipt, prop-salad, prop-phone-chart, prop-piggy-bank
 * Still needed from the art team:
 *   wave, flex, celebrate, sleepy, sheepish, sad, pointing,
 *   prop-coffee, trophy
 */
export type MascotPose =
  | 'neutral' // crossed-arms bust, confident smirk — logo/header use
  | 'wink'
  | 'cheer' // open-mouth smile, arms crossed
  | 'thinking' // hand on chin — loading/processing states
  | 'shocked' // wide eyes, "o" mouth — big-number reveals
  | 'sunglasses' // cool — archetype reveals, share cards
  | 'wave' // arms open, greeting — onboarding, welcome back
  | 'flex' // double-bicep flex — milestones, all-time stats
  | 'celebrate' // arms up, confetti energy — success moments
  | 'sleepy' // droopy eyes — late-night/3am slides
  | 'sheepish' // sweat-drop guilt — roast slides
  | 'sad' // apologetic — error states
  | 'pointing' // gesturing toward CTA — empty states
  | 'prop-receipt' // holding a receipt
  | 'prop-salad' // holding a salad bowl
  | 'prop-phone-chart' // holding phone showing a chart
  | 'prop-piggy-bank' // hugging piggy bank — savings slides
  | 'prop-coffee' // holding a coffee cup
  | 'trophy'; // holding trophy / wearing crown

interface MascotPlaceholderProps {
  pose: MascotPose;
  size?: number;
  /** 'outline' = white sticker-outline variant for dark/gradient backgrounds. */
  variant?: 'filled' | 'outline';
  /** Hide the pose label (e.g. tiny header/logo usage). */
  hideLabel?: boolean;
}

/**
 * Temporary stand-in for final mascot artwork. Renders a clearly-marked
 * placeholder so every mascot position and pose is visible in the running
 * app. Replace the body of this component with <Image> lookups once the
 * assets land in assets/mascot/ — call sites should not need to change.
 */
export function MascotPlaceholder({
  pose,
  size = 120,
  variant = 'filled',
  hideLabel = false,
}: MascotPlaceholderProps) {
  const isOutline = variant === 'outline';
  const showLabel = !hideLabel && size >= 56;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: isOutline ? 'rgba(255, 255, 255, 0.16)' : Colors.mascotHighlight,
          borderColor: isOutline ? 'rgba(255, 255, 255, 0.85)' : Colors.mascotOutline,
        },
      ]}
      accessibilityLabel={`SnackTrack mascot (${pose})`}
    >
      <Text style={{ fontSize: size * (showLabel ? 0.38 : 0.55) }}>🥟</Text>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: Math.max(9, size * 0.09),
              color: isOutline ? '#FFFFFF' : Colors.mascotOutline,
            },
          ]}
          numberOfLines={2}
        >
          {pose}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 4,
  },
  label: {
    marginTop: 2,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default MascotPlaceholder;
