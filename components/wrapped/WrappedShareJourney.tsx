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
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { UserSummary } from '../../types/api';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';
import { useCurrency } from '../../contexts/CurrencyContext';
import { showAlert } from '../../utils/platformAlert';
import {
  STORY_GRADIENTS,
  STORY_SLIDE_DURATION,
  CONFETTI_COLORS,
  SAFE_BOTTOM,
  SHARE_FRAME_W,
  SHARE_FRAME_H,
  EXPORT_W,
  EXPORT_H,
  screenWidth,
  screenHeight,
} from './wrappedTheme';
import { AnimatedBackground, HeroGlow, WrappedStaticRenderContext, useReducedMotion } from './WrappedSlideEffects';
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
  const reduceMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideTranslateY = useRef(new Animated.Value(28)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const slideScale = useRef(new Animated.Value(0.97)).current;
  const slideRotate = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  // +1 = moving forward, -1 = going back. Drives the entrance direction.
  const directionRef = useRef<1 | -1>(1);
  // Off-screen share render + captured-image cache (keyed by slide index).
  const hiddenShareShotRef = useRef<ViewShot | null>(null);
  const shareUriCache = useRef<Map<number, string>>(new Map());

  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyFromContext(amount);
  }, [formatCurrencyFromContext]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    // Device locale — currency formatting already respects it via CurrencyContext.
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
  // Ref mirror so effects that only care about "which slide index is showing"
  // don't re-fire when the deck array is rebuilt with identical content.
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const shareTargetIndex = activeSlide?.shareTargetIndex ?? currentSlide;
  const shareTargetSlide = slides[shareTargetIndex];
  const shouldAutoAdvance = currentSlide < slides.length - 1 && activeSlide?.id !== 'export-upsell';

  React.useEffect(() => {
    if (currentSlide > slides.length - 1) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [currentSlide, slides.length]);

  const activeSlideId = activeSlide?.id;
  React.useEffect(() => {
    if (activeSlideId === 'export-upsell') {
      onExportUpsellSeen?.();
    }
  }, [activeSlideId, onExportUpsellSeen]);

  // Captured share images go stale if the slide deck is rebuilt.
  React.useEffect(() => {
    shareUriCache.current.clear();
  }, [slides]);

  const captureShareImage = useCallback(async (): Promise<string | null> => {
    const cached = shareUriCache.current.get(shareTargetIndex);
    if (cached) {
      return cached;
    }
    const uri = await hiddenShareShotRef.current?.capture?.();
    if (uri) {
      shareUriCache.current.set(shareTargetIndex, uri);
    }
    return uri ?? null;
  }, [shareTargetIndex]);

  // Confetti fires per-slide, optionally delayed (the archetype launches it in
  // sync with the name reveal). Reduced motion skips it entirely.
  React.useEffect(() => {
    setConfettiVisible(false);
    const slide = slidesRef.current[currentSlide];
    if (!slide?.confetti || reduceMotion) {
      return;
    }
    const delay = slide.confettiDelayMs ?? 0;
    if (delay === 0) {
      setConfettiVisible(true);
      return;
    }
    const timer = setTimeout(() => setConfettiVisible(true), delay);
    return () => clearTimeout(timer);
  }, [currentSlide, reduceMotion]);

  // Pre-warm: capture the off-screen share render shortly after it mounts so
  // the share sheet opens instantly instead of waiting on a capture round-trip.
  React.useEffect(() => {
    if (shareUriCache.current.has(shareTargetIndex)) {
      return;
    }
    const timer = setTimeout(() => {
      captureShareImage().catch(() => {
        // Best-effort warm-up; a real failure surfaces on the share tap.
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [shareTargetIndex, captureShareImage]);

  // useLayoutEffect so the off-screen reset happens BEFORE the new slide paints.
  // Otherwise the slide briefly renders at the previous slide's resting values
  // (in place, fully visible) and only then jumps to its start — the flash that
  // reads as "it goes to the current slide before animating".
  useLayoutEffect(() => {
    // Read via ref: depending on the slide *object* here re-fired the entrance
    // whenever the deck was rebuilt without the slide changing.
    const slide = slidesRef.current[currentSlide];

    progressAnim.stopAnimation();
    progressAnim.setValue(0);

    // Screen readers hear the slide's stat; visuals alone say nothing.
    if (slide?.a11y) {
      AccessibilityInfo.announceForAccessibility(slide.a11y);
    }

    const direction = directionRef.current;

    // Always start hidden + reset rotation; per-branch sets the offset.
    slideOpacity.setValue(0);
    slideRotate.setValue(0);

    // Reduced motion: plain crossfade, no springs/spins/slides.
    if (reduceMotion) {
      slideTranslateX.setValue(0);
      slideTranslateY.setValue(0);
      slideScale.setValue(1);
      Animated.timing(slideOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }

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
  }, [currentSlide, reduceMotion, progressAnim, slideOpacity, slideScale, slideTranslateY, slideTranslateX, slideRotate]);

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
      const slideDuration = slidesRef.current[currentSlide]?.durationMs ?? STORY_SLIDE_DURATION;
      const remainingDuration = Math.max(300, slideDuration * (1 - value));
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const uri = await captureShareImage();
      if (!uri) {
        throw new Error('Share image capture failed');
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your SnackTrack Wrapped',
        });
      } else {
        showAlert('Sharing unavailable', "Sharing isn't supported on this device.");
      }
    } catch {
      showAlert('Sharing failed', "Couldn't create your share image.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try Again', onPress: () => { void handleShare(); } },
      ]);
    }
  };

  const handleSaveToPhotos = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      // writeOnly: iOS "add photos only" permission — we never read the library.
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) {
        showAlert('Permission needed', 'Allow photo access to save your Wrapped card.');
        return;
      }
      const uri = await captureShareImage();
      if (!uri) {
        throw new Error('Share image capture failed');
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showAlert('Saved', 'Your Wrapped card is in your Photos.');
    } catch {
      showAlert('Save failed', "Couldn't save the image to your Photos.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try Again', onPress: () => { void handleSaveToPhotos(); } },
      ]);
    }
  };

  // The entrance useLayoutEffect resets progressAnim on every slide change, so
  // navigation only needs to flip the index. Haptics fire here (user-initiated
  // taps) rather than on every auto-advance.
  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    directionRef.current = 1;
    setCurrentSlide((current) => Math.min(current + 1, slides.length - 1));
  };

  const goToPrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    directionRef.current = -1;
    setCurrentSlide((current) => Math.max(current - 1, 0));
  };

  // `shareFrame` renders the slide at the fixed 9:16 export size (instead of
  // the device screen) for the off-screen capture.
  const renderSlideInner = (slide: Slide, animatedContent = false, shareFrame = false) => {
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
          /* MASCOT: slide hero — pose varies per slide theme; the slide emoji
             rides along as a small badge instead of a 92px hero. */
          <View style={styles.mascotHero}>
            <MascotPlaceholder pose={slide.mascotPose} size={104} variant="outline" />
            {slide.emoji ? <Text style={styles.mascotEmojiBadge}>{slide.emoji}</Text> : null}
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
      <View
        style={[
          styles.watermarkCorner,
          // The export frame has no device safe area — use the story-safe margin.
          { bottom: shareFrame ? SAFE_BOTTOM : Math.max(SAFE_BOTTOM, insets.bottom + 16) },
        ]}
        pointerEvents="none"
      >
        <View style={styles.watermarkLockup}>
          <Image source={require('../../assets/icon.png')} style={styles.watermarkLogo} />
          <Text style={styles.watermarkText}>@snacktrack</Text>
        </View>
      </View>
    );

    const glow = slide.glow ? (
      <View style={styles.glowWrap} pointerEvents="none">
        <HeroGlow />
      </View>
    ) : null;

    if (slide.backgroundType === 'animated') {
      return (
        <AnimatedBackground
          width={shareFrame ? SHARE_FRAME_W : screenWidth}
          height={shareFrame ? SHARE_FRAME_H : screenHeight}
        >
          {glow}
          {content}
          {watermark}
        </AnimatedBackground>
      );
    }

    const gradient = STORY_GRADIENTS[slide.gradient];
    return (
      <LinearGradient
        colors={gradient.colors}
        locations={gradient.locations}
        style={[styles.gradient, shareFrame && { width: SHARE_FRAME_W, height: SHARE_FRAME_H }]}
        start={gradient.start}
        end={gradient.end}
      >
        {glow}
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
          <View key={currentSlide} style={styles.slideContainer}>
            {renderSlideInner(activeSlide, true)}
          </View>
        )}

        {/* Off-screen share render: static (no entrance/count-up/nebula motion),
            fixed 9:16 frame, captured at 1080x1920 — so shares are always
            correct and crisp regardless of when the user taps share. */}
        {shareTargetSlide && (
          <ViewShot
            key={`share-${shareTargetIndex}`}
            ref={hiddenShareShotRef}
            options={{ format: 'png', quality: 1.0, width: EXPORT_W, height: EXPORT_H }}
            style={styles.hiddenShareShot}
          >
            <WrappedStaticRenderContext.Provider value={true}>
              {renderSlideInner(shareTargetSlide, false, true)}
            </WrappedStaticRenderContext.Provider>
          </ViewShot>
        )}

        {activeSlide?.id !== 'export-upsell' && (
          <>
            <Pressable
              style={[styles.tapZone, styles.tapZoneLeft]}
              onPress={goToPrevious}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
            />
            <Pressable
              style={[styles.tapZone, styles.tapZoneRight]}
              onPress={goToNext}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
              accessibilityRole="button"
              accessibilityLabel="Next slide"
            />
          </>
        )}
      </Animated.View>

      {/* Celebratory confetti — decorative overlay, never blocks touches */}
      {confettiVisible && activeSlide?.confetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            key={`confetti-${currentSlide}`}
            count={70}
            origin={{ x: screenWidth / 2, y: -20 }}
            colors={CONFETTI_COLORS}
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
        accessibilityRole="button"
        accessibilityLabel="Close Wrapped"
      >
        <Ionicons name="close" size={26} color="white" />
      </TouchableOpacity>

      {/* Explicit share CTA on the most-shareable slides (archetype, summary).
          Lives in the chrome layer so it never appears in captured images. */}
      {activeSlide?.showShareCta && (
        <TouchableOpacity
          style={[styles.shareCtaButton, { bottom: Math.max(SAFE_BOTTOM, insets.bottom + 16) }]}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share this card"
        >
          <Ionicons name="share-outline" size={18} color="#222222" />
          <Text style={styles.shareCtaText}>Share this card</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.iconButton, styles.shareIconButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={handleShare}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Share this slide"
      >
        <Ionicons name="share-outline" size={22} color="white" />
      </TouchableOpacity>

      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.iconButton, styles.saveIconButton, { top: Math.max(44, insets.top + 16) }]}
          onPress={handleSaveToPhotos}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Save this slide to Photos"
        >
          <Ionicons name="download-outline" size={22} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
