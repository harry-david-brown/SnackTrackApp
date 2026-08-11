export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

type AlertPresenter = (request: AppAlertRequest) => void;

let nextAlertId = 1;
let presenter: AlertPresenter | null = null;
const pendingAlerts: AppAlertRequest[] = [];

export const normalizeAlertMessage = (message?: unknown): string | undefined => {
  if (message == null) return undefined;
  if (typeof message === 'string') return message;
  if (message instanceof Error) {
    return message.message || 'An unexpected error occurred.';
  }
  if (typeof message === 'object') {
    const candidateMessage =
      'message' in message && typeof (message as { message?: unknown }).message === 'string'
        ? (message as { message: string }).message
        : undefined;
    if (candidateMessage) return candidateMessage;
    try {
      return JSON.stringify(message);
    } catch {
      return 'An unexpected error occurred.';
    }
  }
  return String(message);
};

export const presentAppAlert = (
  title: string,
  message?: unknown,
  buttons?: AppAlertButton[]
) => {
  const request: AppAlertRequest = {
    id: nextAlertId++,
    title,
    message: normalizeAlertMessage(message),
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
  };

  if (presenter) {
    presenter(request);
  } else {
    pendingAlerts.push(request);
  }
};

export const setAppAlertPresenter = (nextPresenter: AlertPresenter) => {
  presenter = nextPresenter;
  pendingAlerts.splice(0).forEach(nextPresenter);

  return () => {
    if (presenter === nextPresenter) presenter = null;
  };
};
