import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useAppTheme } from '@contexts/AppearanceContext';

interface AppScreenProps extends PropsWithChildren { scroll?: boolean; edges?: Edge[]; contentStyle?: ViewStyle; footer?: ReactNode; scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'> }
export function AppScreen({ children, scroll = true, edges = ['top'], contentStyle, footer, scrollProps }: AppScreenProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const horizontal = width <= 360 ? theme.metrics.narrowPagePadding : theme.metrics.pagePadding;
  const content = [styles.content, { paddingHorizontal: horizontal }, contentStyle];
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={edges}>
    {scroll ? <ScrollView {...scrollProps} style={styles.flex} contentContainerStyle={content}>{children}</ScrollView> : <View style={content}>{children}</View>}
    {footer ? <View style={[styles.footer, { paddingHorizontal: horizontal, backgroundColor: theme.colors.background }]}>{footer}</View> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, paddingTop: 14, paddingBottom: 24 }, footer: { paddingTop: 8, paddingBottom: 12 } });
export const JourneyScreen = AppScreen;
