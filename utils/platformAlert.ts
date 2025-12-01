import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Platform-aware alert that works on both web and mobile
 * On web: Uses native browser confirm/alert
 * On mobile: Uses React Native Alert
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    // Web implementation using native browser dialogs
    if (!buttons || buttons.length === 0) {
      // Simple alert
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      return;
    }

    if (buttons.length === 1) {
      // Single button alert
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      buttons[0].onPress?.();
      return;
    }

    // Multiple buttons - use confirm dialog
    const confirmMessage = `${title}${message ? '\n\n' + message : ''}\n\n${buttons
      .filter(b => b.style !== 'cancel')
      .map(b => b.text)
      .join(' / ')}`;
    
    const result = window.confirm(confirmMessage);
    
    if (result) {
      // Find the first non-cancel button and call it
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      confirmButton?.onPress?.();
    } else {
      // Find cancel button and call it
      const cancelButton = buttons.find(b => b.style === 'cancel');
      cancelButton?.onPress?.();
    }
  } else {
    // Mobile implementation using React Native Alert
    Alert.alert(title, message, buttons);
  }
};

/**
 * Show a confirm dialog with Yes/No options
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel'
) => {
  showAlert(title, message, [
    {
      text: cancelText,
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: confirmText,
      onPress: onConfirm,
    },
  ]);
};

/**
 * Show a destructive confirm dialog (for delete/disconnect actions)
 */
export const showDestructiveConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel'
) => {
  showAlert(title, message, [
    {
      text: cancelText,
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: confirmText,
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

/**
 * Show a simple alert with OK button
 */
export const showSimpleAlert = (title: string, message?: string, onPress?: () => void) => {
  showAlert(title, message, [
    {
      text: 'OK',
      onPress,
    },
  ]);
};

