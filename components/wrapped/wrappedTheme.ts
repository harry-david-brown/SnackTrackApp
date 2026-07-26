import { Colors } from '@/constants/theme';
/**
 * Shared layout constants, type scales, and story gradients for the
 * Wrapped share journey. Split out of WrappedShareJourney.tsx so slides,
 * styles, and effects can share them without circular imports.
 */
import { Dimensions } from 'react-native';

export const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive story safe zones
export const SAFE_TOP = Math.round(screenHeight * 0.09);   // keep clear of IG chrome
export const SAFE_BOTTOM = Math.round(screenHeight * 0.10);
export const SAFE_SIDE = Math.max(24, Math.round(screenWidth * 0.06));

// Responsive type scales (keeps big numbers "hero" without wrapping)
export const EMOJI_SIZE = Math.min(92, Math.max(72, Math.round(screenWidth * 0.22)));
export const BIG_STAT_SIZE = Math.min(84, Math.max(60, Math.round(screenWidth * 0.18)));
export const TITLE_SIZE = Math.min(46, Math.max(38, Math.round(screenWidth * 0.12)));
export const SUBTITLE_SIZE = Math.min(32, Math.max(26, Math.round(screenWidth * 0.085)));

// Story export size — shared images are always rendered at 9:16 and captured
// at these pixel dimensions, regardless of device screen size/aspect.
export const EXPORT_W = 1080;
export const EXPORT_H = 1920;

// Logical layout size for the off-screen share render: full screen width (so
// all the screenWidth-derived type scales stay correct) at a 9:16 aspect.
export const SHARE_FRAME_W = screenWidth;
export const SHARE_FRAME_H = Math.round(screenWidth * (16 / 9));


/**
 * Wrapped event palette — a SnackTrack "event skin" derived from the Green
 * Forest brand (docs/design-system.md), not a generic template rainbow.
 *
 * Rules:
 * - Every gradient is a deep jewel tone: white text passes contrast on all of
 *   them, everywhere, so slides never need per-gradient ink colors.
 * - `forest` is the lifetime brand anchor; gold enters for hall-of-fame and
 *   verdict beats while shared screenshots remain recognizably SnackTrack.
 * - Color carries the narrative: hot tones (ember/berry) for shame slides,
 *   cool tones (indigo/lagoon) for flex, warm amber for money/patterns.
 * - Each gradient has its own axis so the deck doesn't feel like one template.
 */
export const STORY_GRADIENTS = {
  // Brand anchor — lifetime intro and evidence-review transition.
  forest: {
    colors: [Colors.forest850, Colors.primary, Colors.secondary],
    locations: [0, 0.55, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Hot: the roast/shame slides.
  ember: {
    colors: [Colors.emberDeep, Colors.emberMid, Colors.emberBright],
    locations: [0, 0.5, 1],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  berry: {
    colors: [Colors.berryDeep, Colors.berryMid, Colors.berryBright],
    locations: [0, 0.5, 1],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Cool: the flex slides.
  indigo: {
    colors: [Colors.indigoDeep, Colors.indigoMid, Colors.indigoBright],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0.1 },
    end: { x: 1, y: 0.9 },
  },
  lagoon: {
    colors: [Colors.lagoonDeep, Colors.lagoonMid, Colors.lagoonBright],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 1 },
    end: { x: 1, y: 0 },
  },
  // Warm: money & patterns.
  amber: {
    colors: [Colors.amberDeep, Colors.amberMid, Colors.amberBright],
    locations: [0, 0.55, 1],
    start: { x: 0.2, y: 0 },
    end: { x: 0.8, y: 1 },
  },
  // Hall-of-fame: deep indigo with a restrained gold landing point.
  hallOfFame: {
    colors: [Colors.hallDeep, Colors.hallMid, Colors.hallGold],
    locations: [0, 0.68, 1],
    start: { x: 0.1, y: 0 },
    end: { x: 0.9, y: 1 },
  },
  // Verdict: nearly black ink with a single evidence-gold edge.
  verdict: {
    colors: [Colors.verdictDeep, Colors.verdictMid, Colors.verdictGold],
    locations: [0, 0.78, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

/** Confetti tuned to the brand — greens, gold, and mascot cream. */
export const CONFETTI_COLORS = [Colors.accent, Colors.success, Colors.confettiGold, Colors.mascotHighlight, Colors.white];

/** Display font families (Fredoka, loaded via expo-font in wrapped-journey). */
export const WRAPPED_FONTS = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  medium: 'Fredoka_500Medium',
} as const;

export const STORY_SLIDE_DURATION = 5800;
export const COUNT_UP_DURATION = 900;
