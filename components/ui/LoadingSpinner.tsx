import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  overlay = false,
}) => {
  const theme = useAppTheme();
  const containerStyle = overlay ? [styles.overlayContainer, { backgroundColor: theme.colors.alpha(theme.colors.surface, 0.9) }] : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color ?? theme.colors.primary} />
      {text && <AppText variant="body" style={styles.text}>{text}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
