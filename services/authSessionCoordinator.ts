type SessionExpiredHandler = () => void | Promise<void>;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let activeNotification: Promise<void> | null = null;

/**
 * Bridges terminal transport-level authentication failures back to the
 * authentication owner without making the API client depend on React.
 */
export function registerSessionExpiredHandler(handler: SessionExpiredHandler) {
  sessionExpiredHandler = handler;

  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
}

/** Coalesces concurrent 401 failures into one local sign-out transition. */
export function notifySessionExpired(): Promise<void> {
  if (!sessionExpiredHandler) return Promise.resolve();
  if (activeNotification) return activeNotification;

  activeNotification = Promise.resolve(sessionExpiredHandler()).finally(() => {
    activeNotification = null;
  });
  return activeNotification;
}
