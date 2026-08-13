import { Colors } from '@constants/theme';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const getErrorColor = (type: ErrorType): string => {
  switch (type) {
    case 'network':
      return Colors.warning;
    case 'validation':
      return Colors.errorBright;
    case 'server':
      return Colors.error;
    default:
      return Colors.errorBright;
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
  const iconName = getErrorIcon(type);
  const color = getErrorColor(type);
  const title = getErrorTitle(type);

  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={styles.content}>
        {showIcon && (
          <Ionicons name={iconName} size={24} color={color} style={styles.icon} />
        )}
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color }]}>{title}</Text>
          <Text style={styles.message}>{error}</Text>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {onRetry && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: color }]} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={Colors.white} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderLeftWidth: 4,
    marginVertical: 8,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ErrorMessage;
