import { Colors } from '@/constants/theme';
import React, { useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
  AccessibilityInfo,
  Modal,
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
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
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
import { getSlideEntranceRole } from './wrappedSlideSelection';
import { useWrappedAudio } from './useWrappedAudio';
import { styles } from './wrappedStyles';

// Re-exported for existing consumers (archetype gradients reference these keys).
export { STORY_GRADIENTS } from './wrappedTheme';

interface WrappedShareJourneyProps {
  analytics: UserSummary;
  onClose: () => void;
  /** First name for personalized cards; omitted until the API exposes one. */
  userName?: string;
  showExportUpsell?: boolean;
  onExportUpsellSeen?: () => void;
  onExportUpgrade?: () => void;
  onExportTutorial?: () => void;
  onDismissExportUpsell?: () => void;
}

export default function WrappedShareJourney({
  analytics,
  onClose,
  userName,
  showExportUpsell = false,
  onExportUpsellSeen,
  onExportUpgrade,
  onExportTutorial,
  onDismissExportUpsell,
}: WrappedShareJourneyProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const reduceMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [showPostDeckOffer, setShowPostDeckOffer] = useState(false);
  const { isMuted, toggleMuted } = useWrappedAudio(isFocused && !showPostDeckOffer);

  // All animation state lives in Reanimated shared values, so entrances, the
  // progress bar, and the dismiss gesture run entirely on the UI thread.
  const progress = useSharedValue(0);
  const slideOpacity = useSharedValue(0);
  const slideTranslateX = useSharedValue(0);
  const slideTranslateY = useSharedValue(28);
  const slideScale = useSharedValue(0.97);
  const slideRotate = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  // +1 = moving forward, -1 = going back. Drives the entrance direction.
  const directionRef = useRef<1 | -1>(1);
  // A long press pauses the story. React Native can still emit `onPress` when
  // that hold is released, so remember that the gesture was consumed and do
  // not interpret its release as next/previous navigation.
  const holdConsumedRef = useRef(false);
  // Monotonic navigation token, bumped on every slide change (tap, drag, or
  // auto-advance). An auto-advance timer captures the token when armed and
  // only fires if it still matches — so a stale advance whose completion lands
  // just after the user navigates is rejected, even when navigation returns to
  // the same index the advance was armed on (the last-slide "back" case).
  const navGenRef = useRef(0);
  // Nav generation the progress timer was last armed for. Same gen on re-arm
  // means "resuming this slide after a pause" (partial progress kept); a new
  // gen means a fresh slide (full duration). Tracked JS-side because reading
  // progress.value in the same commit as a reset write can return the stale
  // pre-reset value (the write lands on the UI runtime asynchronously).
  const armedGenRef = useRef(-1);
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

  // Slide content is defined in buildWrappedSlides — pure data in, slides out.
  const slides = useMemo(
    () =>
      buildWrappedSlides({
        analytics,
        formatCurrency,
        formatDate,
        userName,
      }),
    [analytics, formatCurrency, formatDate, userName]
  );
  const activeSlide = slides[currentSlide];
  // Ref mirror so effects that only care about "which slide index is showing"
  // don't re-fire when the deck array is rebuilt with identical content.
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const shareTargetIndex = activeSlide?.shareTargetIndex ?? currentSlide;
  const shareTargetSlide = slides[shareTargetIndex];
  const shouldAutoAdvance = currentSlide < slides.length - 1;

  React.useEffect(() => {
    if (currentSlide > slides.length - 1) {
      navGenRef.current += 1;
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [currentSlide, slides.length]);

  React.useEffect(() => {
    if (showPostDeckOffer) {
      onExportUpsellSeen?.();
    }
  }, [showPostDeckOffer, onExportUpsellSeen]);

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

    cancelAnimation(progress);
    progress.value = 0;

    // Screen readers hear the slide's stat; visuals alone say nothing.
    if (slide?.a11y) {
      AccessibilityInfo.announceForAccessibility(slide.a11y);
    }

    const direction = directionRef.current;

    // Always start hidden + reset rotation; per-branch sets the offset.
    slideOpacity.value = 0;
    slideRotate.value = 0;

    // Reduced motion: plain crossfade, no springs/spins/slides.
    if (reduceMotion) {
      slideTranslateX.value = 0;
      slideTranslateY.value = 0;
      slideScale.value = 1;
      slideOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      return;
    }

    if (direction === -1) {
      // Going BACK — natural reverse: slide in from the left. Consistent so the
      // gesture always reads as "backward" rather than a random forward entrance.
      slideTranslateX.value = -screenWidth * 0.75;
      slideTranslateY.value = 0;
      slideScale.value = 0.94;
      slideOpacity.value = withTiming(1, { duration: 190, easing: Easing.out(Easing.cubic) });
      slideTranslateX.value = withSpring(0, { damping: 25, stiffness: 410 });
      slideScale.value = withSpring(1, { damping: 25, stiffness: 410 });
      return;
    }

    // Going FORWARD — motion follows the slide's narrative role, not its
    // position. Sparse decks therefore keep the same visual grammar.
    const entrance = slide
      ? getSlideEntranceRole(slide.category, slide.id)
      : 'rise';

    if (entrance === 'quiet') {
      // The verdict is a breath before the reveal: restrained crossfade only.
      slideTranslateY.value = 12;
      slideTranslateX.value = 0;
      slideScale.value = 0.99;
      slideOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
      slideTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
      slideScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    } else if (entrance === 'rise') {
      // Spring rise from below
      slideTranslateY.value = 48;
      slideTranslateX.value = 0;
      slideScale.value = 0.92;
      slideOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      slideTranslateY.value = withSpring(0, { damping: 21, stiffness: 470 });
      slideScale.value = withSpring(1, { damping: 21, stiffness: 445 });
    } else if (entrance === 'zoom') {
      // Headline impact — forceful, but smaller than the final reveal.
      slideTranslateY.value = 0;
      slideTranslateX.value = 0;
      slideScale.value = 1.2;
      slideOpacity.value = withTiming(1, { duration: 190, easing: Easing.out(Easing.quad) });
      slideScale.value = withSpring(1, { damping: 21, stiffness: 500 });
    } else if (entrance === 'slide') {
      // Slide in from right
      slideTranslateY.value = 0;
      slideTranslateX.value = screenWidth * 0.75;
      slideScale.value = 0.94;
      slideOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
      slideTranslateX.value = withSpring(0, { damping: 24, stiffness: 470 });
      slideScale.value = withSpring(1, { damping: 24, stiffness: 470 });
    } else if (entrance === 'drop') {
      // Drop from top with spin
      slideTranslateY.value = -screenHeight * 0.28;
      slideTranslateX.value = 0;
      slideScale.value = 0.78;
      slideRotate.value = 0.06;
      slideOpacity.value = withTiming(1, { duration: 210, easing: Easing.out(Easing.cubic) });
      slideTranslateY.value = withSpring(0, { damping: 18, stiffness: 410 });
      slideScale.value = withSpring(1, { damping: 18, stiffness: 410 });
      slideRotate.value = withSpring(0, { damping: 21, stiffness: 445 });
    } else {
      // Identity reveal — the strongest whole-slide entrance. The name's
      // DelayedSlam, heavy haptic, glow, and confetti remain archetype-only.
      slideTranslateY.value = 0;
      slideTranslateX.value = 0;
      slideScale.value = 1.36;
      slideOpacity.value = withTiming(1, { duration: 210, easing: Easing.out(Easing.quad) });
      slideScale.value = withSpring(1, { damping: 17, stiffness: 550 });
    }
  }, [currentSlide, reduceMotion, progress, slideOpacity, slideScale, slideTranslateY, slideTranslateX, slideRotate]);

  // Fires when a slide's auto-advance timer completes. Rejected if the deck has
  // moved on since the timer was armed (compared by nav token, not index, so a
  // return to the same index still invalidates the earlier visit's advance).
  const autoAdvance = useCallback((armedGen: number) => {
    if (armedGen !== navGenRef.current) {
      return; // user (or another advance) navigated first — stale
    }
    navGenRef.current += 1;
    directionRef.current = 1; // auto-advance always moves forward
    setCurrentSlide((current) => Math.min(current + 1, slidesRef.current.length - 1));
  }, []);

  React.useEffect(() => {
    if (!shouldAutoAdvance) {
      cancelAnimation(progress);
      progress.value = currentSlide === slides.length - 1 ? 1 : 0;
      return;
    }

    if (isPaused) {
      cancelAnimation(progress);
      return;
    }

    const slideDuration = slidesRef.current[currentSlide]?.durationMs ?? STORY_SLIDE_DURATION;
    // Fresh slide → full duration. Re-arming for the same visit (released a
    // hold-to-pause) → resume from the paused fraction. Never infer this from
    // progress.value alone: right after a slide change its JS read can still
    // report the previous slide's parked value (e.g. 1 on the final slide),
    // which collapsed the duration to the 300ms floor when navigating back.
    const isResume = armedGenRef.current === navGenRef.current;
    const startFraction = isResume ? progress.value : 0;
    if (!isResume) {
      progress.value = 0;
    }
    armedGenRef.current = navGenRef.current;
    const remainingDuration = Math.max(300, slideDuration * (1 - startFraction));
    const armedGen = navGenRef.current;
    progress.value = withTiming(1, { duration: remainingDuration, easing: Easing.linear }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(autoAdvance)(armedGen);
      }
    });

    return () => cancelAnimation(progress);
  }, [currentSlide, isPaused, progress, shouldAutoAdvance, slides.length, autoAdvance]);

  const setPaused = useCallback((paused: boolean) => setIsPaused(paused), []);
  const handleSlidePressIn = useCallback(() => {
    holdConsumedRef.current = false;
    setPaused(true);
  }, [setPaused]);
  const handleSlideLongPress = useCallback(() => {
    holdConsumedRef.current = true;
  }, []);
  const handleSlidePressOut = useCallback(() => {
    setPaused(false);
  }, [setPaused]);
  const fireLightHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // Swipe-down-to-dismiss (Stories/Wrapped convention). The pan only activates
  // on clearly-vertical downward drags — horizontal movement or upward drags
  // fail it — so tap navigation and hold-to-pause keep working untouched.
  // Runs as a worklet: drag tracking never touches the JS thread.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-24, 24])
        .failOffsetY(-12)
        .onStart(() => {
          'worklet';
          runOnJS(setPaused)(true);
        })
        .onUpdate((event) => {
          'worklet';
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          'worklet';
          if (event.translationY > 140 || event.velocityY > 800) {
            isDismissing.value = true;
            runOnJS(fireLightHaptic)();
            dragY.value = withTiming(
              screenHeight,
              { duration: 220, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) {
                  runOnJS(onClose)();
                }
              }
            );
          } else {
            dragY.value = withSpring(0, { damping: 25, stiffness: 410 });
          }
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(setPaused)(false);
          // Interrupted mid-drag without a dismiss: rubber-band back.
          if (!isDismissing.value && dragY.value > 0) {
            dragY.value = withSpring(0, { damping: 25, stiffness: 410 });
          }
        }),
    [dragY, isDismissing, fireLightHaptic, onClose, setPaused]
  );

  // Container shrinks/fades slightly as you drag down — the rubber-band cue
  // that the sheet is dismissible.
  const dragAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, screenHeight * 0.5], [1, 0.4], Extrapolation.CLAMP),
    transform: [
      { translateY: dragY.value },
      { scale: interpolate(dragY.value, [0, screenHeight], [1, 0.85], Extrapolation.CLAMP) },
    ],
  }));

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [
      { translateX: slideTranslateX.value },
      { translateY: slideTranslateY.value },
      { scale: slideScale.value },
      { rotate: `${slideRotate.value * 30}deg` },
    ],
  }));

  // Left-anchored scaleX (transformOrigin in the static style) — the per-frame
  // progress animation lives on the UI thread.
  const activeProgressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

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

  // The entrance useLayoutEffect resets progress on every slide change, so
  // navigation only needs to flip the index. Haptics fire here (user-initiated
  // taps) rather than on every auto-advance.
  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navGenRef.current += 1;
    directionRef.current = 1;
    setCurrentSlide((current) => Math.min(current + 1, slides.length - 1));
  };

  const goToPrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navGenRef.current += 1;
    directionRef.current = -1;
    setCurrentSlide((current) => Math.max(current - 1, 0));
  };

  // `shareFrame` renders the slide at the fixed 9:16 export size (instead of
  // the device screen) for the off-screen capture.
  const renderSlideInner = (slide: Slide, animatedContent = false, shareFrame = false) => {
    const inner = (
      <>
        {slide.hideHero ? null : slide.image ? (
          <Image source={slide.image} style={styles.logoImage} resizeMode="contain" />
        ) : slide.mascotPose ? (
          /* MASCOT: slide hero — pose varies per slide theme. */
          <View style={styles.mascotHero}>
            <MascotPlaceholder pose={slide.mascotPose} size={104} variant="outline" />
          </View>
        ) : (
          <Text style={styles.emoji}>{slide.emoji}</Text>
        )}
        <View style={[styles.frame, slide.category === 'extreme-moment' && styles.evidenceFrame]}>
          {slide.category === 'extreme-moment' && (
            <Text style={styles.evidenceStamp}>EXHIBIT · EXTREME MOMENT</Text>
          )}
          {slide.content}
        </View>
      </>
    );

    // The live slide keys its *content* by index so per-slide effects
    // (count-ups, staged reveals) restart on every transition, while the
    // gradient/glow/watermark shells stay mounted across slides.
    const content = animatedContent ? (
      <Reanimated.View
        key={currentSlide}
        style={[
          styles.slideContent,
          slide.showShareCta && styles.slideContentWithActions,
          slideAnimatedStyle,
        ]}
      >
        {inner}
      </Reanimated.View>
    ) : (
      <View style={styles.slideContent}>
        {inner}
      </View>
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

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Slide layer — drags down to dismiss, taps left/right to navigate */}
      <GestureDetector gesture={panGesture}>
        <Reanimated.View style={[styles.dragLayer, dragAnimatedStyle]}>
          {activeSlide && (
            <View style={styles.slideContainer}>
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

          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            onPress={() => {
              if (holdConsumedRef.current) {
                holdConsumedRef.current = false;
                return;
              }
              goToPrevious();
            }}
            onPressIn={handleSlidePressIn}
            onLongPress={handleSlideLongPress}
            onPressOut={handleSlidePressOut}
            delayLongPress={250}
            accessibilityRole="button"
            accessibilityLabel="Previous slide"
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            onPress={() => {
              if (holdConsumedRef.current) {
                holdConsumedRef.current = false;
                return;
              }
              goToNext();
            }}
            onPressIn={handleSlidePressIn}
            onLongPress={handleSlideLongPress}
            onPressOut={handleSlidePressOut}
            delayLongPress={250}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          />
        </Reanimated.View>
      </GestureDetector>

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
              <Reanimated.View
                style={[
                  styles.progressFill,
                  styles.progressFillActive,
                  activeProgressStyle,
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
        <Ionicons name="close" size={26} color={Colors.white} />
      </TouchableOpacity>

      {/* Explicit share CTA on the most-shareable slides (archetype, summary).
          Lives in the chrome layer so it never appears in captured images. */}
      {activeSlide?.showShareCta && (
        <View style={[styles.finalActionRow, { bottom: Math.max(16, insets.bottom + 12) }]}>
          <TouchableOpacity
            style={styles.shareCtaButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share this card"
          >
            <Ionicons name="share-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.shareCtaText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneCtaButton}
            onPress={() => showExportUpsell ? setShowPostDeckOffer(true) : onClose()}
            accessibilityRole="button"
            accessibilityLabel={showExportUpsell ? 'Continue after Wrapped' : 'Finish Wrapped'}
          >
            <Text style={styles.doneCtaText}>{showExportUpsell ? 'Continue' : 'Done'}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.iconButton, styles.shareIconButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={handleShare}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Share this slide"
      >
        <Ionicons name="share-outline" size={22} color={Colors.white} />
      </TouchableOpacity>

      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.iconButton, styles.saveIconButton, { top: Math.max(44, insets.top + 16) }]}
          onPress={handleSaveToPhotos}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Save this slide to Photos"
        >
          <Ionicons name="download-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.iconButton, styles.muteIconButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={toggleMuted}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Unmute music' : 'Mute music'}
      >
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color={Colors.white} />
      </TouchableOpacity>

      <Modal
        visible={showPostDeckOffer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostDeckOffer(false)}
      >
        <View style={styles.offerBackdrop}>
          <View style={styles.offerCard}>
            <Text style={styles.offerEyebrow}>WANT TO GO FURTHER?</Text>
            <Text style={styles.offerTitle}>Expand your imported history</Text>
            <Text style={styles.offerBody}>
              Add an Uber export to bring in older orders your inbox may not include.
            </Text>
            <View style={styles.exportActionStack}>
              <TouchableOpacity
                style={styles.affiliateButton}
                onPress={() => {
                  setShowPostDeckOffer(false);
                  onExportUpgrade?.();
                }}
                accessibilityRole="button"
              >
                <Ionicons name="cloud-upload-outline" size={20} style={styles.affiliateButtonIcon} />
                <Text style={styles.affiliateButtonText}>Upload an Export</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.offerSecondaryButton}
                onPress={() => {
                  setShowPostDeckOffer(false);
                  onExportTutorial?.();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.offerSecondaryButtonText}>See how to request it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportDismissButton}
                onPress={() => {
                  setShowPostDeckOffer(false);
                  onDismissExportUpsell?.();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.offerDismissText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
