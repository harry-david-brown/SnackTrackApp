import React, { useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { UserSummary } from '../../types/api';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  STORY_GRADIENTS,
  STORY_SLIDE_DURATION,
  SAFE_BOTTOM,
  screenWidth,
  screenHeight,
} from './wrappedTheme';
import { AnimatedBackground } from './WrappedSlideEffects';
import { buildWrappedSlides, type Slide } from './buildWrappedSlides';
import { styles } from './wrappedStyles';

// Re-exported for existing consumers (archetype gradients reference these keys).
export { STORY_GRADIENTS } from './wrappedTheme';

interface WrappedShareJourneyProps {
  analytics: UserSummary;
  onClose: () => void;
  showExportUpsell?: boolean;
  onExportUpsellSeen?: () => void;
  onExportUpgrade?: () => void;
  onExportTutorial?: () => void;
  onDismissExportUpsell?: () => void;
}

export default function WrappedShareJourney({
  analytics,
  onClose,
  showExportUpsell = false,
  onExportUpsellSeen,
  onExportUpgrade,
  onExportTutorial,
  onDismissExportUpsell,
}: WrappedShareJourneyProps) {
  const insets = useSafeAreaInsets();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideTranslateY = useRef(new Animated.Value(28)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const slideScale = useRef(new Animated.Value(0.97)).current;
  const slideRotate = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  // +1 = moving forward, -1 = going back. Drives the entrance direction.
  const directionRef = useRef<1 | -1>(1);
  const viewShotRefs = useRef<(ViewShot | null)[]>([]);

  // Reset to first slide when component mounts
  React.useEffect(() => {
    setCurrentSlide(0);
  }, []); // Only run on mount

  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyFromContext(amount);
  }, [formatCurrencyFromContext]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Build slides dynamically based on available data
  // Memoized to prevent recalculation on every render

  // Slide content is defined in buildWrappedSlides — pure data in, slides out.
  const slides = useMemo(
    () =>
      buildWrappedSlides({
        analytics,
        formatCurrency,
        formatDate,
        showExportUpsell,
        onExportUpgrade,
        onExportTutorial,
        onDismissExportUpsell,
      }),
    [analytics, formatCurrency, formatDate, showExportUpsell, onExportUpgrade, onExportTutorial, onDismissExportUpsell]
  );
  const activeSlide = slides[currentSlide];
  const shareTargetIndex = activeSlide?.shareTargetIndex ?? currentSlide;
  const shareTargetSlide = slides[shareTargetIndex];
  const shouldAutoAdvance = currentSlide < slides.length - 1 && activeSlide?.id !== 'export-upsell';

  React.useEffect(() => {
    if (currentSlide > slides.length - 1) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [currentSlide, slides.length]);

  React.useEffect(() => {
    if (activeSlide?.id === 'export-upsell') {
      onExportUpsellSeen?.();
    }
  }, [activeSlide, onExportUpsellSeen]);

  // useLayoutEffect so the off-screen reset happens BEFORE the new slide paints.
  // Otherwise the slide briefly renders at the previous slide's resting values
  // (in place, fully visible) and only then jumps to its start — the flash that
  // reads as "it goes to the current slide before animating".
  useLayoutEffect(() => {
    progressAnim.stopAnimation();
    progressAnim.setValue(0);

    // Haptic punch on every slide change — celebratory slides get a heavier
    // success buzz, the rest get a light tap synced to the entrance.
    if (activeSlide?.confetti) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const direction = directionRef.current;

    // Always start hidden + reset rotation; per-branch sets the offset.
    slideOpacity.setValue(0);
    slideRotate.setValue(0);

    if (direction === -1) {
      // Going BACK — natural reverse: slide in from the left. Consistent so the
      // gesture always reads as "backward" rather than a random forward entrance.
      slideTranslateX.setValue(-screenWidth * 0.9);
      slideTranslateY.setValue(0);
      slideScale.setValue(0.94);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateX, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Going FORWARD — cycle through 4 distinct "crazy" entrances.
    const animType = currentSlide % 4;

    if (animType === 0) {
      // Spring rise from below
      slideTranslateY.setValue(60);
      slideTranslateX.setValue(0);
      slideScale.setValue(0.88);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      ]).start();
    } else if (animType === 1) {
      // Zoom blast — scale from huge
      slideTranslateY.setValue(0);
      slideTranslateX.setValue(0);
      slideScale.setValue(1.55);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start();
    } else if (animType === 2) {
      // Slide in from right
      slideTranslateY.setValue(0);
      slideTranslateX.setValue(screenWidth * 0.9);
      slideScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateX, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      // Drop from top with spin
      slideTranslateY.setValue(-screenHeight * 0.35);
      slideTranslateX.setValue(0);
      slideScale.setValue(0.7);
      slideRotate.setValue(0.08);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateY, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(slideRotate, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [currentSlide, activeSlide, progressAnim, slideOpacity, slideScale, slideTranslateY, slideTranslateX, slideRotate]);

  React.useEffect(() => {
    if (!shouldAutoAdvance) {
      progressAnim.stopAnimation();
      progressAnim.setValue(currentSlide === slides.length - 1 ? 1 : 0);
      return;
    }

    if (isPaused) {
      progressAnim.stopAnimation();
      return;
    }

    let animation: Animated.CompositeAnimation | null = null;

    progressAnim.stopAnimation((value) => {
      const remainingDuration = Math.max(300, STORY_SLIDE_DURATION * (1 - value));
      animation = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      animation.start(({ finished }) => {
        if (finished) {
          directionRef.current = 1; // auto-advance always moves forward
          setCurrentSlide((current) => Math.min(current + 1, slides.length - 1));
        }
      });
    });

    return () => {
      animation?.stop();
    };
  }, [currentSlide, isPaused, progressAnim, shouldAutoAdvance, slides.length]);

  // Swipe-down-to-dismiss (Stories/Wrapped convention). Capture-phase responder
  // only claims clearly-vertical downward drags, so left/right tap navigation
  // and hold-to-pause keep working untouched.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx) * 1.5,
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_evt, gesture) => {
        setIsPaused(false);
        if (gesture.dy > 140 || gesture.vy > 0.8) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          Animated.timing(dragY, {
            toValue: screenHeight,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsPaused(false);
        Animated.spring(dragY, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Container shrinks/fades slightly as you drag down — the rubber-band cue
  // that the sheet is dismissible.
  const dragScale = dragY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });
  const dragOpacity = dragY.interpolate({
    inputRange: [0, screenHeight * 0.5],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  // Ensure slides are available before rendering
  if (!slides || slides.length === 0) {
    return null;
  }

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ref = viewShotRefs.current[shareTargetIndex];
      if (!ref) return;

      const uri = await ref.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your SnackTrack Wrapped',
        });
      }
    } catch {
      // Silently fail - sharing is optional
    }
  };

  const goToNext = () => {
    directionRef.current = 1;
    setCurrentSlide((current) => {
      if (current >= slides.length - 1) {
        return current;
      }

      progressAnim.setValue(0);
      return current + 1;
    });
  };

  const goToPrevious = () => {
    directionRef.current = -1;
    setCurrentSlide((current) => {
      if (current <= 0) {
        return current;
      }

      progressAnim.setValue(0);
      return current - 1;
    });
  };

  const renderSlideInner = (slide: Slide, animatedContent = false) => {
    const content = (
      <Animated.View
        style={[
          styles.slideContent,
          slide.id === 'export-upsell' && styles.slideContentPromo,
          animatedContent && {
            opacity: slideOpacity,
            transform: [
              { translateX: slideTranslateX },
              { translateY: slideTranslateY },
              { scale: slideScale },
              {
                rotate: slideRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '30deg'],
                }),
              },
            ],
          },
        ]}
      >
        {slide.image ? (
          <Image source={slide.image} style={styles.logoImage} resizeMode="contain" />
        ) : slide.mascotPose ? (
          /* MASCOT: slide hero — pose varies per slide theme */
          <View style={styles.mascotHero}>
            <MascotPlaceholder pose={slide.mascotPose} size={104} variant="outline" />
          </View>
        ) : (
          <Text style={styles.emoji}>{slide.emoji}</Text>
        )}
        <View style={styles.frame}>
          {slide.content}
        </View>
      </Animated.View>
    );

    const watermark = (
      <View style={[styles.watermarkCorner, { bottom: Math.max(SAFE_BOTTOM, insets.bottom + 16) }]} pointerEvents="none">
        <Text style={styles.watermarkText}>@snacktrack</Text>
      </View>
    );

    if (slide.backgroundType === 'animated') {
      return (
        <AnimatedBackground>
          {content}
          {watermark}
        </AnimatedBackground>
      );
    }

    return (
      <LinearGradient
        colors={STORY_GRADIENTS[slide.gradient].colors}
        locations={STORY_GRADIENTS[slide.gradient].locations}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {content}
        {watermark}
      </LinearGradient>
    );
  };

  // Drive the active segment with a left-anchored scaleX on the native driver,
  // so the per-frame progress animation never touches the JS thread.
  const activeProgressScaleX = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Slide layer — drags down to dismiss, taps left/right to navigate */}
      <Animated.View
        style={[
          styles.dragLayer,
          { opacity: dragOpacity, transform: [{ translateY: dragY }, { scale: dragScale }] },
        ]}
        {...panResponder.panHandlers}
      >
        {activeSlide && (
          <ViewShot
            key={currentSlide}
            ref={(ref) => { viewShotRefs.current[currentSlide] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.slideContainer}
          >
            {renderSlideInner(activeSlide, true)}
          </ViewShot>
        )}

        {shareTargetSlide && shareTargetIndex !== currentSlide && (
          <ViewShot
            ref={(ref) => { viewShotRefs.current[shareTargetIndex] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.hiddenShareShot}
          >
            {renderSlideInner(shareTargetSlide)}
          </ViewShot>
        )}

        {activeSlide?.id !== 'export-upsell' && (
          <>
            <Pressable
              style={[styles.tapZone, styles.tapZoneLeft]}
              onPress={goToPrevious}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
            <Pressable
              style={[styles.tapZone, styles.tapZoneRight]}
              onPress={goToNext}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
          </>
        )}
      </Animated.View>

      {/* Celebratory confetti — decorative overlay, never blocks touches */}
      {activeSlide?.confetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            key={`confetti-${currentSlide}`}
            count={70}
            origin={{ x: screenWidth / 2, y: -20 }}
            autoStart
            fadeOut
            explosionSpeed={420}
            fallSpeed={2800}
          />
        </View>
      )}

      {/* Fixed chrome — stays put while the slide drags */}
      <View style={[styles.progressRail, { paddingTop: Math.max(12, insets.top + 8) }]}>
        {slides.map((_, index) => (
          <View key={index} style={styles.progressSegment}>
            <View
              style={[
                styles.progressFill,
                index < currentSlide && styles.progressFillComplete,
              ]}
            />
            {index === currentSlide && (
              <Animated.View
                style={[
                  styles.progressFill,
                  styles.progressFillActive,
                  { transform: [{ scaleX: activeProgressScaleX }] },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.iconButton, styles.closeButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={onClose}
        hitSlop={8}
      >
        <Ionicons name="close" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.iconButton, styles.shareIconButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={handleShare}
        hitSlop={8}
      >
        <Ionicons name="share-outline" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );
}
