import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';

export type ErrorType = 'network' | 'validation' | 'server' | 'unknown';

interface ErrorMessageProps {
  error: string;
  type?: ErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  showIcon?: boolean;
}

const getErrorIcon = (type: ErrorType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'network':
      return 'wifi-outline';
    case 'validation':
      return 'alert-circle-outline';
    case 'server':
      return 'server-outline';
    default:
      return 'warning-outline';
  }
};

const getErrorColor = (type: ErrorType, colors: ReturnType<typeof useAppTheme>['colors']): string => {
  switch (type) {
    case 'network':
      return colors.warning;
    case 'validation':
      return colors.errorBright;
    case 'server':
      return colors.error;
    default:
      return colors.errorBright;
  }
};

const getErrorTitle = (type: ErrorType): string => {
  switch (type) {
    case 'network':
      return 'Connection Problem';
    case 'validation':
      return 'Invalid Input';
    case 'server':
      return 'Server Error';
    default:
      return 'Something went wrong';
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  type = 'unknown',
  onRetry,
  onDismiss,
  showIcon = true,
}) => {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const iconName = getErrorIcon(type);
  const color = getErrorColor(type, theme.colors);
  const title = getErrorTitle(type);

  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={styles.content}>
        {showIcon && (
          <Ionicons name={iconName} size={24} color={color} style={styles.icon} />
        )}
        
        <View style={styles.textContainer}>
          <AppText variant="surfaceTitle" style={[styles.title, { color }]}>{title}</AppText>
          <AppText variant="surfaceBody" style={styles.message}>{error}</AppText>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {onRetry && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: color }]} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={theme.colors.white} />
          <AppText variant="button" style={styles.retryText}>Try again</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderLeftWidth: 4,
    marginVertical: 8,
    ...theme.shadows.card,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  message: {
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.white,
    marginLeft: 6,
  },
});

export default ErrorMessage;
