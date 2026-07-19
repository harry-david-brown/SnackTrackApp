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

// Story export size (1080x1920) - reserved for future export functionality
// const EXPORT_W = 1080;
// const EXPORT_H = 1920;


// Curated gradients tuned for share compression
export const STORY_GRADIENTS = {
  amethyst: {
    colors: ['#6E61FF', '#B960FF', '#9E3EFF'],
    locations: [0, 0.52, 1],
  },
  flamingo: {
    colors: ['#FF6B6B', '#FF7FA0', '#EE5A6F'],
    locations: [0, 0.52, 1],
  },
  sunrise: {
    colors: ['#FA709A', '#FF9E6E', '#FEE140'],
    locations: [0, 0.52, 1],
  },
  tangerine: {
    colors: ['#FF9966', '#FF7F6A', '#FF5E62'],
    locations: [0, 0.52, 1],
  },
  lagoon: {
    colors: ['#4FACFE', '#29D1FE', '#00F2FE'],
    locations: [0, 0.52, 1],
  },
  orchid: {
    colors: ['#A18CD1', '#D6A6E3', '#FBC2EB'],
    locations: [0, 0.52, 1],
  },
  mango: {
    colors: ['#FFEAA7', '#FFD890', '#FDCB6E'],
    locations: [0, 0.52, 1],
  },
  ember: {
    colors: ['#FA8231', '#F99A4A', '#F9B15D'],
    locations: [0, 0.52, 1],
  },
  mint: {
    colors: ['#C1DFC4', '#D1E7CF', '#DEECDD'],
    locations: [0, 0.52, 1],
  },
  cotton: {
    colors: ['#A8EDEA', '#D7F1EF', '#FED6E3'],
    locations: [0, 0.52, 1],
  },
  hellofresh: {
    colors: ['#99CC33', '#85C442', '#6FB04F'],
    locations: [0, 0.52, 1],
  },
} as const;

export const STORY_SLIDE_DURATION = 6500;
export const COUNT_UP_DURATION = 1100;
