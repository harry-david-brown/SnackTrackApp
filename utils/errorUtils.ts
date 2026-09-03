import { ErrorType } from '@components/ui/ErrorMessage';
import { logger } from './logger';
import { toApiClientError } from '@services/api/apiError';

export interface ApiError {
  code?: string;
  message: string;
  type: ErrorType;
  statusCode?: number;
  isRetryable: boolean;
}

/**
 * Whitelist of safe error messages that can be shown to users
 * These messages do not leak sensitive information
 */
const SAFE_ERROR_PATTERNS = [
  // Authentication errors
  /invalid email or password/i,
  /email already exists/i,
  /account with this email already exists/i,
  /password must be at least/i,
  /authentication required/i,
  /session expired/i,
  /already verified/i,
  /invalid code/i,
  /code.*expired/i,
  
  // Validation errors
  /invalid email format/i,
  /invalid request/i,
  /invalid data provided/i,
  /missing required/i,
  /invalid csv format/i,
  /unknown csv format/i,
  /wrong file/i,
  /invalid file/i,
  /no valid orders found/i,
  
  // Authorization errors
  /you don't have permission/i,
  /unauthorized/i,
  /access denied/i,
  
  // Resource errors
  /not found/i,
  /resource not found/i,
  
  // Network errors
  /network error/i,
  /unable to connect/i,
  /request timed out/i,
  /server is busy/i,
  /service temporarily unavailable/i,
];

/**
 * Generic error messages for different error types
 */
const GENERIC_ERROR_MESSAGES = {
  validation: 'Invalid request. Please check your input and try again.',
  network: 'Unable to connect to the server. Please check your internet connection.',
  server: 'Service temporarily unavailable. Please try again in a few minutes.',
  unknown: 'An unexpected error occurred. Please try again.',
  unauthorized: 'Authentication required. Please log in again.',
};

/**
 * Sanitizes error message by checking against whitelist
 * If message is not in whitelist, returns generic message
 * @param errorMessage - The error message to sanitize
 * @param errorType - The type of error (for generic message selection)
 * @returns Sanitized error message safe for display
 */
const sanitizeErrorMessage = (errorMessage: string, errorType: ErrorType = 'unknown'): string => {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return GENERIC_ERROR_MESSAGES[errorType];
  }

  // Check if error message matches any safe pattern
  const isSafeMessage = SAFE_ERROR_PATTERNS.some(pattern => pattern.test(errorMessage));

  if (isSafeMessage) {
    // Limit length to prevent excessive messages
    return errorMessage.substring(0, 200);
  }

  // Log the unsanitized error for debugging (server-side only in production)
  if (__DEV__) {
    logger.warn('Unsanitized error message blocked:', errorMessage);
  }

  // Return generic message for unknown error patterns
  return GENERIC_ERROR_MESSAGES[errorType];
};

export const parseApiError = (input: unknown): ApiError => {
  const error = toApiClientError(input);
  return {
    code: error.code,
    message: sanitizeErrorMessage(error.message, error.kind),
    type: error.kind,
    statusCode: error.statusCode,
    isRetryable: error.retryable,
  };
};

export const isNetworkError = (input: unknown): boolean => {
  return toApiClientError(input).kind === 'network';
};

export const isRetryableError = (error: unknown): boolean => {
  const parsedError = parseApiError(error);
  return parsedError.isRetryable;
};

export const getErrorMessage = (error: unknown): string => {
  return parseApiError(error).message;
};

export const getErrorType = (error: unknown): ErrorType => {
  return parseApiError(error).type;
};
