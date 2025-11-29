import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert utility
 * Uses native Alert.alert() on mobile and window.alert() on web
 */
export const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    // On web, use browser's native alert
    // Note: buttons are not supported in web alerts
    alert(message ? `${title}: ${message}` : title);
  } else {
    // On native platforms, use React Native's Alert
    Alert.alert(title, message, buttons);
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

