/**
 * SnackTrack Design System — Green Forest Theme
 *
 * This is the only place application color values should be declared. Screens
 * and components consume semantic values from `Colors`; feature-specific
 * palettes (Wrapped, providers, charts) also derive from this file.
 *
 * To test a new palette, change the values in `Palette` below. Keeping the
 * semantic aliases stable means the rest of the app does not need to change.
 */

export const Palette = {
  // Brand
  forest900: '#0B1F16',
  forest850: '#0E2A1F',
  forest800: '#16382A',
  forest750: '#2A5F41',
  forest700: '#173F30',
  forest600: '#356F4C',
  forest550: '#3E7954',
  forest500: '#438158',
  forest400: '#5EA15D',
  leaf500: '#58C26D',
  leaf450: '#73B84A',
  leaf400: '#88C34A',
  leaf300: '#C6EF9A',
  chartNeutral: '#D8E2D7',

  // Warm neutrals
  canvas: '#FAF8F4',
  surface: '#FFFFFF',
  ink: '#222222',
  inkStrong: '#1A1A1A',
  inkNearBlack: '#111111',
  inkSoft: '#333333',
  textMuted: '#6F756E',
  gray600: '#777777',
  gray500: '#999999',
  gray400: '#CCCCCC',
  gray350: '#D5D5D5',
  gray300: '#DDDDDD',
  gray250: '#E0E0E0',
  gray200: '#E5E5E5',
  divider: '#EAE8E2',
  gray100: '#F0F0F0',
  gray75: '#F3F3F3',
  gray50: '#F5F5F5',
  chipActiveSurface: '#E9F5E2',
  chipInactiveText: '#666666',
  infoTint: '#F7FAF7',
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',

  // Mascot
  mascotCream: '#FFE8C6',
  mascotShadow: '#F6D9A8',

  // Semantic status colors
  error: '#D14343',
  errorDark: '#B42318',
  errorBright: '#FF6B6B',
  errorLight: '#FF8E8E',
  errorSurface: '#FEF3F2',
  errorSurfaceSoft: '#FFF5F5',
  errorBorder: '#FECDCA',
  errorLegacySurface: '#FFEBEE',
  warning: '#FF9500',
  warningBright: '#FF9800',
  warningDeep: '#C2410C',
  warningDark: '#E65100',
  warningSurface: '#FFF3E0',
  warningLegacySurface: '#FFF3CD',
  warningLegacyText: '#856404',
  warningPale: '#FFEAA7',
  info: '#2196F3',
  infoDark: '#1976D2',
  infoStrong: '#1D4ED8',
  infoLink: '#2563EB',
  infoSurface: '#E3F2FD',
  infoBorder: '#BBDEFB',
  infoBorderStrong: '#BFDBFE',
  successDark: '#15803D',
  successDeeper: '#155724',
  successDeep: '#30A46C',
  successSurface: '#F1FAEF',
  successSurfaceCool: '#DCFCE7',
  successLegacySurface: '#D4EDDA',
  successLegacyBorder: '#C3E6CB',

  // Cool neutrals used by task/import UI
  slate500: '#94A3B8',
  slate200: '#D0D7DE',
  slate150: '#DEE2E6',
  slate100: '#E2E8F0',
  slate50: '#F1F5F9',
  slateInk: '#0F172A',
  slateFrost: '#F8FAFC',

  // Provider and external brand colors
  uber: '#06C167',
  uberDark: '#00A859',
  uberBright: '#00D96F',
  doorDash: '#FF3000',

  // Supporting data/story colors
  gold: '#FFD700',
  orange: '#FFA500',
  pink: '#E91E63',
  hotPink: '#FF2D92',
  purple: '#9C27B0',
  sharePink: '#F093FB',
  shareCoral: '#F5576C',
  shareSky: '#4FACFE',
  shareCyan: '#00F2FE',

  // Wrapped jewel gradients
  emberDeep: '#6E1B10',
  emberMid: '#A83220',
  emberBright: '#D14E2A',
  berryDeep: '#4E152E',
  berryMid: '#8C2450',
  berryBright: '#B93A66',
  indigoDeep: '#1F1B4E',
  indigoMid: '#3A3688',
  indigoBright: '#5551BC',
  lagoonDeep: '#0C333B',
  lagoonMid: '#146068',
  lagoonBright: '#1F8E8A',
  amberDeep: '#5C350C',
  amberMid: '#9A611A',
  amberBright: '#C68A26',
  hallDeep: '#100E2B',
  hallMid: '#28205C',
  hallGold: '#8A6420',
  verdictDeep: '#080A09',
  verdictMid: '#171C18',
  verdictGold: '#6F531D',
  evidenceGold: '#E6C26D',
  glowGold: '#E8B33C',
  confettiGold: '#F0C25C',
  roastInk: '#0C0805',
  darkOverlayInk: '#1E1E1E',

  // Legacy utility colors retained for unchanged specialty UI
  passwordWeak: '#FF4444',
  passwordFair: '#FFAA00',
  passwordGood: '#00AA00',
  passwordStrong: '#00CC00',
  purpleSurface: '#F3E5F5',
} as const;

/** Convert a central opaque color token to an rgba string. */
const alpha = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  if (hex.length !== 6) {
    throw new Error(`Colors.alpha expects a six-digit hex color, received "${color}"`);
  }
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

export const Colors = {
  ...Palette,
  alpha,

  // Semantic application colors
  primary: Palette.forest600,
  primaryHover: Palette.forest550,
  primaryPressed: Palette.forest750,
  secondary: Palette.forest500,
  accent: Palette.leaf450,
  success: Palette.leaf500,
  background: Palette.canvas,
  surface: Palette.surface,
  divider: Palette.divider,
  textPrimary: Palette.ink,
  textSecondary: Palette.textMuted,

  // Component roles
  buttonPrimaryText: Palette.white,
  buttonSecondaryBorder: Palette.forest500,
  buttonSecondaryText: Palette.forest600,
  chipActiveBg: Palette.chipActiveSurface,
  chipActiveText: Palette.forest600,
  chipInactiveBg: Palette.gray75,
  chipInactiveText: Palette.chipInactiveText,
  progressFill: Palette.forest500,
  progressTrack: Palette.gray200,
  toggleOn: Palette.leaf500,
  toggleOff: Palette.gray350,
  checkboxChecked: Palette.forest500,
  successBg: Palette.successSurface,
  successBorder: Palette.leaf500,
  infoBg: Palette.infoTint,
  infoBorder: Palette.forest500,
  mascotHighlight: Palette.mascotCream,
  mascotOutline: Palette.inkSoft,
} as const;

/** Ordered chart palette: highest value → neutral (unused portions). */
export const ChartPalette = {
  highest: Colors.primary,
  high: Colors.secondary,
  medium: Colors.forest400,
  accent: Colors.leaf400,
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
  md: 14,
  card: 24,
  button: 16,
  input: 14,
  chart: 24,
  fab: 999,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
} as const;

/** RN shadow presets mirroring the design-system CSS shadows. */
export const Shadows = {
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  button: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  fab: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/** Deep-green gradient stops for hero/full-bleed surfaces. */
export const Gradients = {
  hero: [Colors.forest850, Colors.primary, Colors.secondary] as const,
  celebration: [Colors.primary, Colors.secondary, Colors.accent] as const,
};
