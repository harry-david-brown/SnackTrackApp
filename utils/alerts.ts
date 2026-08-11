import { AppAlertButton, presentAppAlert } from './appAlert';

/** Present the app's standard branded modal. */
export const showAlert = (
  title: string,
  message?: unknown,
  buttons?: AppAlertButton[]
) => presentAppAlert(title, message, buttons);

/** Resolve a standard two-button confirmation as a boolean. */
export const showConfirm = (title: string, message?: string): Promise<boolean> =>
  new Promise((resolve) => {
    presentAppAlert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'OK',
        onPress: () => resolve(true),
      },
    ]);
  });
