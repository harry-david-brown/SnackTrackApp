import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

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
 * Platform-aware alert that works on both web and mobile
 * On web: Uses native browser confirm/alert
 * On mobile: Uses React Native Alert
 */
export const showAlert = (
  title: string,
  message?: unknown,
  buttons?: AlertButton[]
) => {
  const normalizedMessage = normalizeAlertMessage(message);

  if (Platform.OS === 'web') {
    // Web implementation using native browser dialogs
    if (!buttons || buttons.length === 0) {
      // Simple alert
      window.alert(`${title}${normalizedMessage ? '\n\n' + normalizedMessage : ''}`);
      return;
    }

    if (buttons.length === 1) {
      // Single button alert
      window.alert(`${title}${normalizedMessage ? '\n\n' + normalizedMessage : ''}`);
      buttons[0].onPress?.();
      return;
    }

    // Multiple buttons - use confirm dialog
    const confirmMessage = `${title}${normalizedMessage ? '\n\n' + normalizedMessage : ''}\n\n${buttons
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
    Alert.alert(title, normalizedMessage, buttons);
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
