import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MascotPlaceholder, MascotPose } from '../mascot/MascotPlaceholder';

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
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {mascotPose ? (
          <MascotPlaceholder pose={mascotPose} size={120} />
        ) : (
          <Ionicons name={icon} size={64} color="#1F4E3A" />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionText && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222222',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6F756E',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#1F4E3A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;
