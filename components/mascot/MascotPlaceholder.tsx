import React from 'react';
import {
  Image,
  ImageSourcePropType,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors } from '@constants/theme';

/**
 * Poses required from the mascot art team. Each pose maps 1:1 to a final
 * asset in assets/mascot/ (e.g. pose "flex" → assets/mascot/flex.png).
 *
 * Integrated artwork:
 *   neutral, wink, thinking, shocked, sunglasses, wave, flex, sleepy,
 *   sheepish, sad, prop-receipt
 * Still needed from the art team:
 *   cheer, celebrate, pointing, prop-salad, prop-phone-chart,
 *   prop-piggy-bank, prop-coffee, trophy
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

/**
 * React Native requires local image paths to be statically discoverable, so
 * keep the asset lookup explicit. Poses without finished artwork intentionally
 * fall through to the labeled placeholder below.
 */
const MASCOT_ASSETS: Partial<Record<MascotPose, ImageSourcePropType>> = {
  neutral: require('../../assets/mascot/bust.png'),
  wink: require('../../assets/mascot/archer-flex-wink-smile.png'),
  thinking: require('../../assets/mascot/thinking.png'),
  shocked: require('../../assets/mascot/very-shocked-hands.png'),
  sunglasses: require('../../assets/mascot/sunglasses.png'),
  wave: require('../../assets/mascot/waving.png'),
  flex: require('../../assets/mascot/flex.png'),
  sleepy: require('../../assets/mascot/sleepy.png'),
  sheepish: require('../../assets/mascot/guilty-sheepish.png'),
  sad: require('../../assets/mascot/sad-apolagetic.png'),
  celebrate: require('../../assets/mascot/celebrate.png'),
  'prop-receipt': require('../../assets/mascot/prop-receipt-disbelief.png'),
};

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
  const source = MASCOT_ASSETS[pose];

  if (source) {
    return (
      <View
        style={{ width: size, height: size }}
        accessibilityRole="image"
        accessibilityLabel={`SnackTrack mascot (${pose})`}
      >
        <Image
          source={source}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  }

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
          backgroundColor: isOutline ? Colors.alpha(Colors.white, 0.16) : Colors.mascotHighlight,
          borderColor: isOutline ? Colors.alpha(Colors.white, 0.85) : Colors.mascotOutline,
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
              color: isOutline ? Colors.white : Colors.mascotOutline,
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
  image: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.75 }],
  },
});

export default MascotPlaceholder;
