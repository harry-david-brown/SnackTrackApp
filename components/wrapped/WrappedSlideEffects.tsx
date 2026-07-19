/**
 * Reusable presentation effects for Wrapped slides: count-up numbers,
 * the animated nebula background, and layout spacers.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Text, View, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COUNT_UP_DURATION, screenWidth, screenHeight } from './wrappedTheme';

/**
 * Animated count-up for hero stats — the number ticks from 0 to its final
 * value when the slide mounts, giving each reveal a "drumroll" feel.
 * Falls back to the exact final value once the animation settles, so any
 * screenshot taken after the reveal captures the correct number.
 */
export const AnimatedCount = ({
  value,
  format,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: {
  value: number;
  format?: (n: number) => string;
  style?: any;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}) => {
  const fmt = useCallback(
    (n: number) => (format ? format(n) : String(Math.round(n))),
    [format]
  );
  const [text, setText] = useState(() => fmt(value));

  useEffect(() => {
    // Lightweight stepped count-up: ~22fps via setTimeout (no Animated value,
    // no per-frame listener) and we only re-render when the formatted string
    // actually changes. Keeps the JS thread free so taps stay responsive.
    const start = Date.now();
    let last = '';
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = fmt(value * eased);
      if (next !== last) {
        last = next;
        setText(next);
      }
      if (t < 1) {
        timer = setTimeout(tick, 45);
      } else {
        setText(fmt(value)); // snap to exact final value
      }
    };

    setText(fmt(0));
    tick();
    return () => clearTimeout(timer);
  }, [value, fmt]);

  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {text}
    </Text>
  );
};

export const AnimatedBackground = ({ children }: { children: React.ReactNode }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animatedValue.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  // Movement 1: Diagonally up-left and back
  const translate1 = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -150, 0],
  });

  // Movement 2: Diagonally down-right and back
  const translate2 = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 100, 0],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.05, 1.25, 1.05],
  });

  // Smaller overlay layers = far less GPU overdraw (big perf win on this slide),
  // while the offset keeps the screen fully covered through the motion.
  const LAYER_SIZE = 1.7;
  const LAYER_OFFSET = 0.35;

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateRev = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={[{ width: screenWidth, height: screenHeight, overflow: 'hidden' }]}>
      {/* Background Base - Deep Vivid Purple/Blue */}
      <LinearGradient
        colors={['#2E1E62', '#4B1057', '#C86B33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Moving Overlay 1 - Pink/Orange Nebula */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.7,
            transform: [
              { translateY: translate1 },
              { translateX: translate1 },
              { scale },
              { rotate },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#FF00CC', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 2 - Cyan/Blue Aqua */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.6,
            transform: [
              { translateY: translate2 },
              { scale: 1.2 },
              { rotate: rotateRev },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#00FFFF', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 3 - Gold Light */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.5,
            transform: [
              { scale: scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#FFD700', 'transparent']}
          start={{ x: 0.8, y: 0.8 }}
          end={{ x: 0.2, y: 0.2 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content Container */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        {children}
      </View>
    </View>
  );
};

export const Spacer = ({ h = 8 }: { h?: number }) => <View style={{ height: h }} />;
