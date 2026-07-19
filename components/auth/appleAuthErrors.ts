/**
 * Apple Sign-In helpers: identity-token claim decoding (debug/validation)
 * and the error → user-facing message mapping. Extracted from LoginScreen
 * so the screen only orchestrates the flow.
 */

export interface AppleTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/** Best-effort decode of the JWT payload; returns null if it can't be parsed. */
export const decodeAppleTokenClaims = (identityToken: string | null): AppleTokenClaims | null => {
  if (!identityToken) {
    return null;
  }

  try {
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    // Use global atob or Buffer for base64 decoding
    const decodedPayload = typeof atob !== 'undefined'
      ? atob(paddedPayload)
      : Buffer.from(paddedPayload, 'base64').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (e) {
    // Ignore decode errors - token might be in different format
    if (__DEV__) {
      console.warn('Could not decode Apple identity token:', e);
    }
    return null;
  }
};

export type AppleSignInErrorOutcome =
  | { kind: 'silent' } // user cancelled — show nothing
  | { kind: 'alert'; title: string; message: string; clearContextError: boolean };

/**
 * Map an Apple Sign-In failure to what the user should see.
 * `contextError` is the current auth error from UserContext, used as a
 * last-resort message for otherwise-uncategorized failures.
 */
export const describeAppleSignInError = (error: any, contextError?: string | null): AppleSignInErrorOutcome => {
  // Handle user cancellation - don't show error
  if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
    if (__DEV__) {
      console.log('ℹ️ User cancelled Apple Sign-In');
    }
    return { kind: 'silent' };
  }

  // Handle Apple Sign-In not available (shouldn't happen if button is shown)
  if (error.code === 'ERR_NOT_AVAILABLE' || error.message?.includes('not available')) {
    return {
      kind: 'alert',
      title: 'Apple Sign-In Unavailable',
      message: 'Apple Sign-In is not available on this device. Please use email/password or Google Sign-In.',
      clearContextError: false,
    };
  }

  // Handle network errors
  if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))) {
    return {
      kind: 'alert',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      clearContextError: false,
    };
  }

  // Extract user-friendly error message
  let errorMessage = 'Failed to sign in with Apple. Please try again.';

  if (error.response?.data) {
    const errorData = error.response.data.error || error.response.data;

    if (errorData.message) {
      const msg = errorData.message.toLowerCase();

      // Backend configuration errors
      if (msg.includes('audience invalid') || msg.includes('jwt audience invalid')) {
        errorMessage = 'Apple Sign-In configuration issue. This is a development/testing issue. Please contact support or try a development build.';
        if (__DEV__) {
          console.error('🔧 Backend needs to accept both "com.snacktrack.mobile" and "host.exp.Exponent" audiences. See docs/APPLE_SIGNIN_BACKEND_FIX.md');
        }
      } else if (msg.includes('not configured') || msg.includes('apple sign in not configured')) {
        errorMessage = 'Apple Sign In is not configured on the server. Please contact support.';
      }
      // Token validation errors
      else if (msg.includes('invalid') && (msg.includes('token') || msg.includes('signature'))) {
        errorMessage = 'Authentication failed. The token could not be verified. Please try signing in again.';
      } else if (msg.includes('expired') || msg.includes('exp')) {
        errorMessage = 'Your sign-in session expired. Please try again.';
      }
      // User data errors
      else if (msg.includes('email not provided') || msg.includes('email required')) {
        errorMessage = 'Unable to get your email from Apple. Please try again or use a different sign-in method.';
      }
      // Generic authentication failures
      else if (msg.includes('authentication failed') || msg.includes('verification failed')) {
        errorMessage = 'Unable to verify your Apple ID. Please try again.';
      }
      // Server errors
      else if (error.response.status >= 500) {
        errorMessage = 'Server error occurred. Please try again in a moment.';
      }
      // Use the backend message if it's user-friendly
      else {
        errorMessage = errorData.message || errorMessage;
      }
    } else if (error.response.status === 401) {
      errorMessage = 'Authentication failed. Please try signing in again.';
    } else if (error.response.status === 403) {
      errorMessage = 'Access denied. Please contact support.';
    } else if (error.response.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }
  } else if (error.message) {
    // Handle frontend errors
    if (error.message.includes('No identity token')) {
      errorMessage = 'Unable to get authentication token from Apple. Please try again.';
    } else if (error.message.includes('Invalid token format')) {
      errorMessage = 'Invalid authentication token received. Please try again.';
    } else if (error.message === 'SESSION_EXPIRED') {
      errorMessage = 'Your session has expired. Please try again.';
    } else {
      errorMessage = error.message;
    }
  } else if (contextError) {
    // Use error from UserContext if available
    errorMessage = contextError;
  }

  return { kind: 'alert', title: 'Sign In Failed', message: errorMessage, clearContextError: true };
};
