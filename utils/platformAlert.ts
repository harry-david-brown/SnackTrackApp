import { AppAlertButton, presentAppAlert } from './appAlert';

export type AlertButton = AppAlertButton;

/**
 * Present the app's standard branded modal on every platform.
 */
export const showAlert = (
  title: string,
  message?: unknown,
  buttons?: AlertButton[]
) => presentAppAlert(title, message, buttons);

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
