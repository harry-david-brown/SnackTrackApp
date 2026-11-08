import { Easing } from 'react-native';

/** Shared rhythm for controls, content changes, and navigation. */
export const Motion = {
  press: 110,
  selection: 260,
  content: 240,
  page: 300,
  distance: 12,
  pressedScale: 0.98,
  easing: Easing.bezier(0.22, 0.7, 0.2, 1),
} as const;
