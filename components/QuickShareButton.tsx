import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface QuickShareButtonProps {
  onPress: () => void;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function QuickShareButton({ 
  onPress, 
  title = 'Share', 
  icon = 'share-outline',
  size = 'medium',
  variant = 'primary'
}: QuickShareButtonProps) {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 12,
          fontSize: 14,
          iconSize: 16,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 18,
          iconSize: 24,
        };
      default: // medium
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          colors: ['#34C759', '#30A46C'],
          textColor: 'white',
          iconColor: 'white',
        };
      case 'outline':
        return {
          colors: ['transparent', 'transparent'],
          textColor: '#007AFF',
          iconColor: '#007AFF',
          borderColor: '#007AFF',
        };
      default: // primary
        return {
          colors: ['#007AFF', '#5856D6'],
          textColor: 'white',
          iconColor: 'white',
        };
    }
  };

  const variantStyles = getVariantStyles();

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.outlineButton,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderColor: variantStyles.borderColor,
          }
        ]}
        onPress={onPress}
      >
        <Ionicons name={icon} size={sizeStyles.iconSize} color={variantStyles.iconColor} />
        {title && (
          <Text style={[styles.buttonText, { fontSize: sizeStyles.fontSize, color: variantStyles.textColor }]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
      <LinearGradient
        colors={variantStyles.colors}
        style={[
          styles.button,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          }
        ]}
      >
        <Ionicons name={icon} size={sizeStyles.iconSize} color={variantStyles.iconColor} />
        {title && (
          <Text style={[styles.buttonText, { fontSize: sizeStyles.fontSize, color: variantStyles.textColor }]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: '600',
  },
});
