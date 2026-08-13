import { toDomainError } from '../../utils/domainError';

export type AppleSignInErrorOutcome =
  | { kind: 'silent' } // user cancelled — show nothing
  | { kind: 'alert'; title: string; message: string; clearContextError: boolean };

/**
 * Map an Apple Sign-In failure to what the user should see.
 * `contextError` is the current auth error from UserContext, used as a
 * last-resort message for otherwise-uncategorized failures.
 */
export const describeAppleSignInError = (error: unknown, contextError?: string | null): AppleSignInErrorOutcome => {
  const domainError = toDomainError(error);
  const message = domainError.message;
  const lowerMessage = message.toLowerCase();

  // Handle user cancellation - don't show error
  if (domainError.code === 'ERR_REQUEST_CANCELED' || domainError.code === 'ERR_CANCELED') {
    return { kind: 'silent' };
  }

  // Handle Apple Sign-In not available (shouldn't happen if button is shown)
  if (domainError.code === 'ERR_NOT_AVAILABLE' || lowerMessage.includes('not available')) {
    return {
      kind: 'alert',
      title: 'Apple Sign-In Unavailable',
      message: 'Apple Sign-In is not available on this device. Please use email/password or Google Sign-In.',
      clearContextError: false,
    };
  }

  // Handle network errors
  if (domainError.kind === 'network') {
    return {
      kind: 'alert',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      clearContextError: false,
    };
  }

  let errorMessage = 'Failed to sign in with Apple. Please try again.';
  if (lowerMessage.includes('no identity token')) {
    errorMessage = 'Unable to get authentication token from Apple. Please try again.';
  } else if (lowerMessage.includes('invalid token')) {
    errorMessage = 'Invalid authentication token received. Please try again.';
  } else if (domainError.code === 'SESSION_EXPIRED') {
    errorMessage = 'Your session has expired. Please try again.';
  } else if (domainError.kind !== 'unknown' || message !== 'An unexpected error occurred. Please try again.') {
    errorMessage = message;
  } else if (contextError) {
    errorMessage = contextError;
  }

  return { kind: 'alert', title: 'Sign In Failed', message: errorMessage, clearContextError: true };
};
