import { Colors } from '@constants/theme';
/**
 * Reusable presentation effects for Wrapped slides: count-up numbers,
 * the animated nebula background, and layout spacers.
 */
import React, { useState, useRef, useCallback, useContext, useEffect } from 'react';
import { Text, View, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';
import { COUNT_UP_DURATION, screenWidth, screenHeight } from './wrappedTheme';

/**
 * True inside the off-screen share render. Effects consult this to render
 * their settled state immediately (final count value, frozen background) so a
 * ViewShot capture is correct no matter when it fires.
 */
export const WrappedStaticRenderContext = React.createContext(false);

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
  minimumFontScale,
}: {
  value: number;
  format?: (n: number) => string;
  style?: any;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}) => {
  const isStaticRender = useContext(WrappedStaticRenderContext);
  const fmt = useCallback(
    (n: number) => (format ? format(n) : String(Math.round(n))),
    [format]
  );
  const [text, setText] = useState(() => fmt(value));

  useEffect(() => {
    if (isStaticRender) {
      setText(fmt(value));
      return;
    }
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
  }, [value, fmt, isStaticRender]);

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {text}
    </Text>
  );
};

export const AnimatedBackground = ({
  children,
  width = screenWidth,
  height = screenHeight,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
}) => {
  const isStaticRender = useContext(WrappedStaticRenderContext);
  const reduceMotion = useReducedMotion();
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animatedValue.setValue(0);

    // Static share render: keep the nebula frozen at its resting frame — no
    // loop to burn GPU on a view that exists only to be screenshotted.
    // Reduced motion: same freeze, by user preference.
    if (isStaticRender || reduceMotion) {
      return;
    }

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
  }, [animatedValue, isStaticRender, reduceMotion]);

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
    <View style={[{ width, height, overflow: 'hidden' }]}>
      {/* Background base — deep forest, matching the brand anchor gradient */}
      <LinearGradient
        colors={[Colors.forest900, Colors.forest800, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Moving Overlay 1 - Gold glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * LAYER_SIZE,
            height: height * LAYER_SIZE,
            left: -width * LAYER_OFFSET,
            top: -height * LAYER_OFFSET,
            opacity: 0.55,
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
          colors={[Colors.transparent, Colors.glowGold, Colors.transparent]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 2 - Accent-green aurora */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * LAYER_SIZE,
            height: height * LAYER_SIZE,
            left: -width * LAYER_OFFSET,
            top: -height * LAYER_OFFSET,
            opacity: 0.5,
            transform: [
              { translateY: translate2 },
              { scale: 1.2 },
              { rotate: rotateRev },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[Colors.transparent, Colors.accent, Colors.transparent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 3 - Mascot-cream light */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: width * LAYER_SIZE,
            height: height * LAYER_SIZE,
            left: -width * LAYER_OFFSET,
            top: -height * LAYER_OFFSET,
            opacity: 0.35,
            transform: [
              { scale: scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[Colors.transparent, Colors.mascotHighlight, Colors.transparent]}
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

/**
 * Soft radial glow rendered behind the hero content on climactic slides
 * (intro, The Damage, archetype, finale). Pure decoration — no touches.
 */
export const HeroGlow = ({
  size = Math.round(screenWidth * 1.15),
  color = Colors.white,
  opacity = 0.22,
}: {
  size?: number;
  color?: string;
  opacity?: number;
}) => (
  <Svg width={size} height={size} pointerEvents="none">
    <Defs>
      <SvgRadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
        <Stop offset="65%" stopColor={color} stopOpacity={opacity * 0.35} />
        <Stop offset="100%" stopColor={color} stopOpacity={0} />
      </SvgRadialGradient>
    </Defs>
    <Rect width={size} height={size} fill="url(#heroGlow)" />
  </Svg>
);

/**
 * Tracks the OS "reduce motion" setting. Consumers swap springs/spins/confetti
 * for simple crossfades when it's on.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
};

/**
 * Fades content in (with a small rise) after a delay — used to land the roast
 * punchline a beat after the hero number. Layout space is reserved from the
 * start so nothing jumps. Static share renders show it immediately.
 */
export const DelayedFadeIn = ({
  delay = 550,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) => {
  const isStaticRender = useContext(WrappedStaticRenderContext);
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (isStaticRender) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    let animation: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(() => {
      animation = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);
      animation.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      animation?.stop();
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [delay, isStaticRender, opacity, translateY]);

  if (isStaticRender) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={{
        alignSelf: 'stretch',
        alignItems: 'center',
        opacity,
        transform: [{ translateY: reduceMotion ? 0 : translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Two-beat "drumroll" reveal for the archetype: content is invisible (but
 * space-reserving) for `delay`, then slams in from oversized scale with a
 * success haptic. Reduced motion gets a plain fade; static renders skip it all.
 */
export const DelayedSlam = ({
  delay = 700,
  hapticOnReveal = false,
  onReveal,
  children,
}: {
  delay?: number;
  hapticOnReveal?: boolean;
  onReveal?: () => void;
  children: React.ReactNode;
}) => {
  const isStaticRender = useContext(WrappedStaticRenderContext);
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.6)).current;
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (isStaticRender) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    let animation: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(() => {
      if (hapticOnReveal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      onRevealRef.current?.();
      if (reduceMotion) {
        scale.setValue(1);
        animation = Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true });
        animation.start();
        return;
      }
      animation = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 165, useNativeDriver: true }),
      ]);
      animation.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      animation?.stop();
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, [delay, hapticOnReveal, isStaticRender, reduceMotion, opacity, scale]);

  if (isStaticRender) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={{ alignSelf: 'stretch', alignItems: 'center', opacity, transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
};

export const Spacer = ({ h = 8 }: { h?: number }) => <View style={{ height: h }} />;
