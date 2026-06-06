import { Alert, Platform } from 'react-native';

const normalizeAlertMessage = (message?: unknown): string | undefined => {
  if (message == null) {
    return undefined;
  }

  if (typeof message === 'string') {
    return message;
  }

  if (message instanceof Error) {
    return message.message || 'An unexpected error occurred.';
  }

  if (typeof message === 'object') {
    const candidateMessage =
      'message' in message && typeof (message as { message?: unknown }).message === 'string'
        ? (message as { message: string }).message
        : undefined;

    if (candidateMessage) {
      return candidateMessage;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return 'An unexpected error occurred.';
    }
  }

  return String(message);
};

/**
 * Cross-platform alert utility
 * Uses native Alert.alert() on mobile and window.alert() on web
 */
export const showAlert = (title: string, message?: unknown, buttons?: any[]) => {
  const normalizedMessage = normalizeAlertMessage(message);

  if (Platform.OS === 'web') {
    // On web, use browser's native alert
    // Note: buttons are not supported in web alerts
    alert(normalizedMessage ? `${title}: ${normalizedMessage}` : title);
  } else {
    // On native platforms, use React Native's Alert
    // Only pass buttons if defined to avoid undefined being passed as third argument
    if (buttons !== undefined) {
      Alert.alert(title, normalizedMessage, buttons);
    } else {
      Alert.alert(title, normalizedMessage);
    }
  }
};

/**
 * Show a confirmation dialog with OK/Cancel buttons
 * Returns a promise that resolves to true if OK is pressed, false if Cancel
 */
export const showConfirm = (
  title: string,
  message?: string
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // On web, use browser's native confirm
      const result = confirm(message ? `${title}\n\n${message}` : title);
      resolve(result);
    } else {
      // On native platforms, use React Native's Alert with buttons
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'OK',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    }
  });
};
