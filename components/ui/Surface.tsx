import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@contexts/AppearanceContext';
export function Surface({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const theme = useAppTheme();
  return <View style={[styles.base, theme.shadows.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }, style]} {...props}>{children}</View>;
}
const styles = StyleSheet.create({ base: { padding: 16, borderRadius: 24, borderWidth: 1 } });
