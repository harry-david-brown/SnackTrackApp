import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { androidTextSize, useSystemFontScale } from '@hooks/useSystemFontScale';
import { useAppTheme } from '@contexts/AppearanceContext';

export type AppTextVariant = 'eyebrow' | 'pageTitle' | 'body' | 'surfaceTitle' | 'surfaceBody' | 'rowTitle' | 'metadata' | 'sectionLabel' | 'heroValue' | 'button' | 'display';
interface AppTextProps extends TextProps { variant?: AppTextVariant; tone?: 'primary' | 'muted' | 'brand' | 'inverse' | 'gold' | 'danger' }

// Fabric 0.81 can reuse paragraph measurements after a live Android font change.
// Resolve sp through Android so measurement and drawing receive the same dp size.
const resolvedSizes = new Map<number, number>();
let cachedFontScale = 0;
function resolveTextSize(size: number | undefined, fontScale: number, maximum?: number | null) {
  if (size === undefined || !androidTextSize) return size;
  if (cachedFontScale !== fontScale) {
    resolvedSizes.clear();
    cachedFontScale = fontScale;
  }
  let dp = resolvedSizes.get(size);
  if (dp === undefined) {
    dp = androidTextSize.toDp(size);
    resolvedSizes.set(size, dp);
  }
  return maximum && maximum >= 1 ? Math.min(dp, size * maximum) : dp;
}

export function AppText({ children, variant = 'body', tone = 'primary', style, ...props }: PropsWithChildren<AppTextProps>) {
  const theme = useAppTheme();
  const fontScale = useSystemFontScale();
  const variants: Record<AppTextVariant, TextStyle> = {
    eyebrow: { fontFamily: theme.typography.medium, fontSize: 12, lineHeight: 15, letterSpacing: 1.08, textTransform: 'uppercase' },
    pageTitle: { fontFamily: theme.typography.medium, fontSize: 28, lineHeight: 31, letterSpacing: -0.7 },
    body: { fontFamily: theme.typography.regular, fontSize: 15, lineHeight: 22 },
    surfaceTitle: { fontFamily: theme.typography.medium, fontSize: 16, lineHeight: 20 },
    surfaceBody: { fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 18 },
    rowTitle: { fontFamily: theme.typography.medium, fontSize: 14, lineHeight: 18 },
    metadata: { fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 16 },
    sectionLabel: { fontFamily: theme.typography.medium, fontSize: 12, lineHeight: 15, letterSpacing: 0.72, textTransform: 'uppercase' },
    heroValue: { fontFamily: theme.typography.medium, fontSize: 31, lineHeight: 34, letterSpacing: -0.93 },
    button: { fontFamily: theme.typography.medium, fontSize: 14, lineHeight: 18 },
    display: { fontFamily: theme.typography.display, fontSize: 34, lineHeight: 36 },
  };
  const tones = { primary: theme.colors.textPrimary, muted: theme.colors.textSecondary, brand: theme.colors.primary, inverse: theme.colors.white, gold: theme.colors.evidenceGold, danger: theme.colors.error } as const;
  const textStyle = [variants[variant], { color: tones[tone] }, style];
  if (androidTextSize && props.allowFontScaling !== false) {
    const { fontSize, lineHeight } = StyleSheet.flatten(textStyle);
    return <Text {...props} allowFontScaling={false} style={[textStyle, {
      fontSize: resolveTextSize(fontSize, fontScale, props.maxFontSizeMultiplier),
      lineHeight: resolveTextSize(lineHeight, fontScale, props.maxFontSizeMultiplier),
    }]}>{children}</Text>;
  }
  return <Text {...props} style={textStyle}>{children}</Text>;
}
