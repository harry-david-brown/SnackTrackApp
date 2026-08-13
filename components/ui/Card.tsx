import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Colors, Radius, Shadows } from '../../constants/theme';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return <View style={[styles.card, style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    ...Shadows.card,
  },
});

