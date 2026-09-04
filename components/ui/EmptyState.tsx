import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mascot, MascotPose } from '@components/mascot/Mascot';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  /**
   * Mascot pose shown instead of the icon. Empty states are a designated
   * mascot "guide" surface; pass null to fall back to the plain icon.
   */
  mascotPose?: MascotPose | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionText,
  onAction,
  mascotPose = 'pointing',
}) => {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {mascotPose ? (
          <Mascot pose={mascotPose} size={120} />
        ) : (
          <Ionicons name={icon} size={64} color={theme.colors.primary} />
        )}
      </View>

      <AppText variant="pageTitle" style={styles.title}>{title}</AppText>
      <AppText variant="body" style={styles.message}>{message}</AppText>

      {actionText && onAction && (
        <AppButton label={actionText} onPress={onAction} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default EmptyState;
