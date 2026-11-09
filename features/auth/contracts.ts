import type { DomainError } from '@utils/domainError';

export const TERMINAL_SESSION_ERROR_CODES = [
  'AUTHENTICATION_REQUIRED',
  'ACCESS_TOKEN_INVALID',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_REVOKED',
  'SESSION_EXPIRED',
  'ACCOUNT_DELETION_PENDING',
] as const;

export type VerificationCodeFailure = 'invalid' | 'expired' | 'retryable';

export const isTerminalSessionError = (code: string | null): boolean =>
  code !== null && (TERMINAL_SESSION_ERROR_CODES as readonly string[]).includes(code);

export const authFailureMessage = (
  error: DomainError,
  operation: 'register' | 'login' | 'provider',
): string => {
  if (error.code === 'ACCOUNT_DELETION_PENDING') return 'Your account is being deleted. You can close the app; deletion will finish automatically.';
  if (operation === 'register' && error.code === 'ACCOUNT_ALREADY_EXISTS') {
    return 'An account with this email already exists. Please login instead.';
  }
  if (operation === 'register' && error.code === 'VALIDATION_ERROR') {
    return 'Password must be at least 8 characters with 1 uppercase letter and 1 number.';
  }
  if (operation === 'login' && error.code === 'INVALID_CREDENTIALS') {
    return 'Invalid email or password. Please try again.';
  }
  if (isTerminalSessionError(error.code)) return 'Your session has expired. Please login again.';
  if (operation === 'provider' && error.code === 'PROVIDER_AUTH_FAILED') {
    return 'Sign-in could not be completed. Please try again.';
  }
  return error.message;
};

export const verificationCodeFailure = (error: DomainError): VerificationCodeFailure => {
  if (error.code === 'VERIFICATION_CODE_INVALID') return 'invalid';
  if (error.code === 'VERIFICATION_CODE_NOT_PENDING') return 'expired';
  return 'retryable';
};

export const verificationCodeMessage = (
  failure: VerificationCodeFailure,
  subject: 'reset' | 'email',
): string => {
  if (failure === 'invalid') return 'That code is incorrect. Check the code and try again.';
  if (failure === 'expired') {
    return subject === 'reset'
      ? 'That reset code has expired. Request a new code to continue.'
      : 'That verification code has expired. Send a new code to continue.';
  }
  return 'We could not verify the code. Please try again.';
};
