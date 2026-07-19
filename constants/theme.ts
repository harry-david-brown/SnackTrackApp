/**
 * SnackTrack Design System — Green Forest Theme (v1.0)
 *
 * Single source of truth for colors, radii, and shadows.
 * The mascot is the centerpiece of the brand; the UI supports it.
 * See docs/design-system.md for full usage rules.
 */

export const Colors = {
  // Brand greens
  primary: '#1F4E3A', // navigation, headers, active icons, primary buttons, logo
  primaryHover: '#285B46',
  primaryPressed: '#163C2D',
  secondary: '#2E7D4F', // icons, progress bars, secondary actions
  accent: '#73B84A', // CTAs, highlights, budget remaining — use sparingly
  success: '#58C26D', // success states ONLY

  // Mascot palette (artwork only — never for UI chrome)
  mascotHighlight: '#FFE8C6',
  mascotShadow: '#F6D9A8',
  mascotOutline: '#333333',

  // Neutrals
  background: '#FAF8F4',
  surface: '#FFFFFF',
  divider: '#EAE8E2',
  textPrimary: '#222222',
  textSecondary: '#6F756E',

  // Buttons
  buttonPrimaryText: '#FFFFFF',
  buttonSecondaryBorder: '#2E7D4F',
  buttonSecondaryText: '#1F4E3A',

  // Chips
  chipActiveBg: '#E9F5E2',
  chipActiveText: '#1F4E3A',
  chipInactiveBg: '#F3F3F3',
  chipInactiveText: '#666666',

  // Progress
  progressFill: '#2E7D4F',
  progressTrack: '#E5E5E5',

  // Inputs
  toggleOn: '#58C26D',
  toggleOff: '#D5D5D5',
  checkboxChecked: '#2E7D4F',

  // Alerts
  successBg: '#F1FAEF',
  successBorder: '#58C26D',
  infoBg: '#F7FAF7',
  infoBorder: '#2E7D4F',

  // Semantic (not in the green ramp — errors/warnings stay legible)
  error: '#D14343',
  warning: '#FF9500',
} as const;

/** Ordered chart palette: highest value → neutral (unused portions). */
export const ChartPalette = {
  highest: '#1F4E3A',
  high: '#2E7D4F',
  medium: '#5EA15D',
  accent: '#88C34A',
  neutral: '#D8E2D7',
} as const;

export const ChartSeries: string[] = [
  ChartPalette.highest,
  ChartPalette.high,
  ChartPalette.medium,
  ChartPalette.accent,
  ChartPalette.neutral,
];

export const Radius = {
  card: 24,
  button: 16,
  input: 14,
  chart: 24,
  fab: 999,
} as const;

/** RN shadow presets mirroring the design-system CSS shadows. */
export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  button: {
    shadowColor: '#1F4E3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  fab: {
    shadowColor: '#1F4E3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/** Deep-green gradient stops for hero/full-bleed surfaces (onboarding, loaders). */
export const Gradients = {
  hero: ['#0E2A1F', '#1F4E3A', '#2E7D4F'] as const,
  celebration: ['#1F4E3A', '#2E7D4F', '#73B84A'] as const,
};
