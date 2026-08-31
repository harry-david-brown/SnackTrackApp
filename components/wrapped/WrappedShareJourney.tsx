import { Colors } from '@constants/theme';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { UserSummary } from '@/types/api';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import { useCurrency } from '@contexts/CurrencyContext';
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
import {
  resolveInitialPostDeckStep,
  resolveTrackingPropositionCopy,
  type PostWrappedExperience,
} from './postWrappedState';
import type {
  OngoingTrackingEffectiveState,
  ProviderExportLifecycleStatus,
} from '@services/gmailApi';
import { useWrappedSharing } from './useWrappedSharing';
import type { TrackingEligibility } from '@features/import-flow/trackingEligibility';

// Re-exported for existing consumers (archetype gradients reference these keys).
export { STORY_GRADIENTS } from './wrappedTheme';

// Keep a held tap active while the finger drifts anywhere on the screen. The
// default Pressable retention area is small, so ordinary finger movement can
// otherwise emit onPressOut before the touch is actually released.
const HOLD_PRESS_RETENTION_OFFSET = {
  top: screenHeight,
  right: screenWidth,
  bottom: screenHeight,
  left: screenWidth,
};

interface WrappedShareJourneyProps {
  analytics: UserSummary;
  onClose: () => void;
  /** First name for personalized cards; omitted until the API exposes one. */
  userName?: string;
  postWrappedExperience: PostWrappedExperience;
  trackingState: OngoingTrackingEffectiveState;
  trackingEligibility: TrackingEligibility;
  exportStatus: ProviderExportLifecycleStatus;
  exportProviderName?: string | null;
  areImportPreferencesUpdating?: boolean;
  onTrackingDecision?: (decision: 'granted' | 'declined') => Promise<void>;
  onManageGmail?: () => void;
  onExportUpsellSeen?: () => void;
  onExportUpgrade?: () => void;
  onExportTutorial?: () => void;
  onFinishPostWrapped?: () => void;
}

export default function WrappedShareJourney({
  analytics,
  onClose,
  userName,
  postWrappedExperience,
  trackingState,
  trackingEligibility,
  exportStatus,
  exportProviderName,
  areImportPreferencesUpdating = false,
  onTrackingDecision,
  onManageGmail,
  onExportUpsellSeen,
  onExportUpgrade,
  onExportTutorial,
  onFinishPostWrapped,
}: WrappedShareJourneyProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const reduceMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPressPaused, setIsPressPaused] = useState(false);
  const isPaused = isPressPaused;
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [showPostDeckOffer, setShowPostDeckOffer] = useState(false);
  const [postDeckStep, setPostDeckStep] = useState<'tracking' | 'export'>('tracking');
  const { isMuted, toggleMuted } = useWrappedAudio(isFocused && !showPostDeckOffer);

  // Animation state lives in Reanimated shared values, so entrances and the
  // progress bar run entirely on the UI thread.
  const progress = useSharedValue(0);
  const slideOpacity = useSharedValue(0);
  const slideTranslateX = useSharedValue(0);
  const slideTranslateY = useSharedValue(28);
  const slideScale = useSharedValue(0.97);
  const slideRotate = useSharedValue(0);

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
  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyFromContext(amount);
  }, [formatCurrencyFromContext]);

  const formatDate = useCallback((dateString: string) => {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(dateString);
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
  const {
    captureRef: hiddenShareShotRef,
    share: handleShare,
    saveToPhotos: handleSaveToPhotos,
  } = useWrappedSharing(shareTargetIndex, slides);
  const shouldAutoAdvance = currentSlide < slides.length - 1;

  React.useEffect(() => {
    if (currentSlide > slides.length - 1) {
      navGenRef.current += 1;
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [currentSlide, slides.length]);

  React.useEffect(() => {
    if (showPostDeckOffer && postDeckStep === 'export') {
      onExportUpsellSeen?.();
    }
  }, [postDeckStep, showPostDeckOffer, onExportUpsellSeen]);

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

  const handleSlidePressIn = useCallback(() => {
    holdConsumedRef.current = false;
    setIsPressPaused(true);
  }, []);
  const handleSlideLongPress = useCallback(() => {
    holdConsumedRef.current = true;
  }, []);
  const handleSlidePressOut = useCallback(() => {
    setIsPressPaused(false);
  }, []);

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

  const finishPostWrapped = () => {
    setShowPostDeckOffer(false);
    onFinishPostWrapped?.();
  };

  const continueFromTracking = () => {
    if (postWrappedExperience.exportEligibility === 'show') {
      setPostDeckStep('export');
      return;
    }

    if (postWrappedExperience.exportEligibility === 'hide') {
      finishPostWrapped();
    }
  };

  const handleTrackingDecision = async (decision: 'granted' | 'declined') => {
    try {
      await onTrackingDecision?.(decision);
      continueFromTracking();
    } catch {
      // The screen displays the error. Keep this step open so the user can retry.
    }
  };

  const exportOrderCount =
    analytics.wrappedAnalytics?.coverage?.orderCount ?? analytics.totalReceipts;
  const hasRequestedExport = exportStatus === 'requested';
  const providerName = exportProviderName ?? 'delivery provider';
  const trackingPropositionCopy = resolveTrackingPropositionCopy({
    trackingState,
  });

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

      {/* Slide layer — taps left/right to navigate; dragging has no action. */}
        <Reanimated.View style={styles.dragLayer}>
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
            pressRetentionOffset={HOLD_PRESS_RETENTION_OFFSET}
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
            pressRetentionOffset={HOLD_PRESS_RETENTION_OFFSET}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          />
        </Reanimated.View>

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
            onPress={() => {
              setPostDeckStep(resolveInitialPostDeckStep(postWrappedExperience.exportEligibility));
              setShowPostDeckOffer(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Continue after Wrapped"
          >
            <Text style={styles.doneCtaText}>Continue</Text>
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
            {postDeckStep === 'tracking' ? (
              <>
                <View style={styles.offerIcon}>
                  <Ionicons
                    name={trackingState === 'active' ? 'checkmark-circle-outline' : 'stats-chart-outline'}
                    size={26}
                    color={Colors.textPrimary}
                  />
                </View>
                <Text style={styles.offerEyebrow}>{trackingPropositionCopy.eyebrow}</Text>
                <Text style={styles.offerTitle}>{trackingPropositionCopy.title}</Text>
                <Text style={styles.offerBody}>{trackingPropositionCopy.body}</Text>
                {trackingState !== 'active'
                  && trackingState !== 'setting_up'
                  && trackingState !== 'reconnect_required'
                  && trackingState !== 'error' && (
                  <View style={styles.consentDetails}>
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="search-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>Only supported delivery receipt emails</Text>
                    </View>
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="shield-checkmark-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>We do not store your inbox</Text>
                    </View>
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="settings-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>Turn it off from Profile at any time</Text>
                    </View>
                  </View>
                )}
                <View style={styles.exportActionStack}>
                  {trackingState === 'active' || trackingState === 'setting_up' ? (
                    <TouchableOpacity
                      style={styles.affiliateButton}
                      onPress={continueFromTracking}
                      accessibilityRole="button"
                      accessibilityLabel={postWrappedExperience.exportEligibility === 'show'
                        ? 'Continue to optional export history'
                        : 'Finish and return to the dashboard'}
                    >
                      <Text style={styles.affiliateButtonText}>
                        {postWrappedExperience.exportEligibility === 'show' ? 'Continue' : 'Finish'}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} style={styles.affiliateButtonIcon} />
                    </TouchableOpacity>
                  ) : trackingState === 'reconnect_required' || trackingState === 'error' || !trackingEligibility.eligible ? (
                    <>
                      <TouchableOpacity
                        style={styles.affiliateButton}
                        onPress={() => {
                          setShowPostDeckOffer(false);
                          onManageGmail?.();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={trackingEligibility.reason === 'historical_baseline_required'
                          ? 'Check email from the import screen'
                          : trackingEligibility.reason === 'gmail_temporarily_unavailable'
                            ? 'Gmail is temporarily unavailable'
                            : 'Reconnect Gmail from the import screen'}
                      >
                        <Ionicons name="mail-outline" size={20} style={styles.affiliateButtonIcon} />
                        <Text style={styles.affiliateButtonText}>
                          {trackingEligibility.reason === 'historical_baseline_required'
                            ? 'Add Import History First'
                            : trackingEligibility.reason === 'gmail_temporarily_unavailable'
                              ? 'Try Again Later'
                              : 'Reconnect Gmail'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.offerSecondaryButton}
                        onPress={continueFromTracking}
                        accessibilityRole="button"
                      >
                        <Text style={styles.offerSecondaryButtonText}>Continue for now</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.affiliateButton,
                          areImportPreferencesUpdating && styles.offerButtonDisabled,
                        ]}
                        onPress={() => void handleTrackingDecision('granted')}
                        disabled={areImportPreferencesUpdating}
                        accessibilityRole="button"
                        accessibilityLabel="Enable ongoing receipt tracking"
                      >
                        {areImportPreferencesUpdating ? (
                          <ActivityIndicator size="small" color={Colors.textPrimary} />
                        ) : (
                          <Ionicons name="mail-open-outline" size={20} style={styles.affiliateButtonIcon} />
                        )}
                        <Text style={styles.affiliateButtonText}>Enable Ongoing Tracking</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.offerSecondaryButton}
                        onPress={() => void handleTrackingDecision('declined')}
                        disabled={areImportPreferencesUpdating}
                        accessibilityRole="button"
                        accessibilityLabel="Do not enable ongoing tracking"
                      >
                        <Text style={styles.offerSecondaryButtonText}>Not now</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {postWrappedExperience.exportEligibility === 'loading' && (
                    <View style={styles.offerLoadingRow}>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={styles.offerLoadingText}>Checking your import history...</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.offerIcon}>
                  <Ionicons
                    name={hasRequestedExport ? 'time-outline' : 'archive-outline'}
                    size={26}
                    color={Colors.textPrimary}
                  />
                </View>
                <Text style={styles.offerEyebrow}>
                  {hasRequestedExport ? `${providerName.toUpperCase()} REQUESTED` : 'COMPLETE THE PICTURE'}
                </Text>
                <Text style={styles.offerTitle}>
                  {hasRequestedExport
                    ? `Your ${providerName} export request is saved`
                    : exportStatus === 'file_ready'
                      ? `Your ${providerName} export is ready to finish`
                    : exportStatus === 'import_processing'
                      ? `We're processing your ${providerName} export`
                      : exportStatus === 'failed'
                        ? `Your ${providerName} import needs another try`
                        : postWrappedExperience.coverageAssessment === 'sparse'
                          ? 'Your inbox may be missing history'
                          : 'Make your history more complete'}
                </Text>
                <Text style={styles.offerBody}>
                  {hasRequestedExport
                    ? `When ${providerName} emails that the archive is ready, return to Import to download and upload it. Uber-ready email checks can be enabled separately.`
                    : exportStatus === 'file_ready'
                      ? 'SnackTrack found the matching export delivery. Open Import to finish adding the file to your history.'
                    : exportStatus === 'import_processing'
                      ? 'Your file is being processed. Your history will update when the import finishes.'
                      : exportStatus === 'failed'
                        ? `The last ${providerName} file did not finish importing. Try again with a fresh export.`
                        : postWrappedExperience.coverageAssessment === 'sparse'
                          ? `We only found ${exportOrderCount} delivery ${exportOrderCount === 1 ? 'receipt' : 'receipts'}. An Uber Eats or DoorDash export can recover older history.`
                          : `We built this from ${exportOrderCount} imported ${exportOrderCount === 1 ? 'order' : 'orders'}. Add another delivery export to uncover older orders and fill in gaps.`}
                </Text>
                {!hasRequestedExport && exportStatus === 'not_started' ? (
                  <View style={styles.consentDetails} accessibilityLabel="Examples of insights unlocked by a delivery data export">
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="repeat-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>Your exact repeat order and menu soulmate</Text>
                    </View>
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="fast-food-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>Item obsessions, quantities, and favorite sauces</Text>
                    </View>
                    <View style={styles.consentDetailRow}>
                      <Ionicons name="time-outline" size={17} color={Colors.mascotHighlight} />
                      <Text style={styles.consentDetailText}>Your fastest and longest delivery records</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.exportActionStack}>
                  {exportStatus !== 'import_processing' && (
                    <>
                      {exportStatus === 'not_started' && (
                        <TouchableOpacity
                          style={styles.affiliateButton}
                          onPress={() => {
                            setShowPostDeckOffer(false);
                            onExportTutorial?.();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Choose a provider and see how to request delivery data"
                        >
                          <Ionicons name="download-outline" size={20} style={styles.affiliateButtonIcon} />
                          <Text style={styles.affiliateButtonText}>
                            {postWrappedExperience.coverageAssessment === 'sparse'
                              ? `Get More ${providerName} History`
                              : `Request ${providerName} Data`}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={exportStatus === 'not_started'
                          ? styles.exportSecondaryButton
                          : styles.affiliateButton}
                        onPress={() => {
                          setShowPostDeckOffer(false);
                          onExportUpgrade?.();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Upload a ${providerName} export you already have`}
                      >
                        <Ionicons
                          name="cloud-upload-outline"
                          size={18}
                          color={exportStatus === 'not_started' ? Colors.white : Colors.textPrimary}
                        />
                        <Text
                          style={exportStatus === 'not_started'
                            ? styles.exportSecondaryButtonText
                            : styles.affiliateButtonText}
                        >
                          Upload an Existing Export
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.exportDismissButton}
                    onPress={finishPostWrapped}
                    accessibilityRole="button"
                    accessibilityLabel="Finish without importing an export"
                  >
                    <Text style={styles.offerDismissText}>Finish for now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
