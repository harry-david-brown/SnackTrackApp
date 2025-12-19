import { AxiosError } from 'axios';
import { ErrorType } from '../components/ui/ErrorMessage';
import { logger } from './logger';

export interface ApiError {
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

export const parseApiError = (error: any): ApiError => {
  // Network error (no response)
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return {
      message: 'Unable to connect to the server. Please check your internet connection.',
      type: 'network',
      isRetryable: true,
    };
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      type: 'network',
      isRetryable: true,
    };
  }

  // Axios error with response
  if (error.response) {
    const statusCode = error.response.status;
    // Handle both object and string responses
    const responseData = typeof error.response.data === 'string' 
      ? (() => {
          try {
            return JSON.parse(error.response.data);
          } catch {
            return { message: error.response.data };
          }
        })()
      : error.response.data;

    switch (statusCode) {
      case 400:
        // Backend returns 'error' field, not 'message' for validation errors
        const errorText = responseData?.error || responseData?.message || '';
        const errorDetails = responseData?.details || [];
        const errorHint = responseData?.hint || '';
        
        // Sanitize the error message
        let userMessage = sanitizeErrorMessage(errorText, 'validation');
        
        // If hint is provided and the main message passed sanitization, append it
        if (errorHint && userMessage === errorText) {
          const sanitizedHint = sanitizeErrorMessage(errorHint, 'validation');
          if (sanitizedHint !== GENERIC_ERROR_MESSAGES.validation) {
            userMessage += ` ${sanitizedHint}`;
          }
        }
        
        return {
          message: userMessage,
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 401:
        const unauthorizedMessage = responseData?.error || responseData?.message || '';
        return {
          message: sanitizeErrorMessage(unauthorizedMessage, 'validation'),
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 403:
        const forbiddenMessage = responseData?.error || responseData?.message || 'You don\'t have permission to perform this action.';
        return {
          message: sanitizeErrorMessage(forbiddenMessage, 'validation'),
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 404:
        const notFoundMessage = responseData?.error || responseData?.message || 'The requested resource was not found.';
        return {
          message: sanitizeErrorMessage(notFoundMessage, 'validation'),
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 422:
        const unprocessableMessage = responseData?.error || responseData?.message || 'Invalid data provided.';
        return {
          message: sanitizeErrorMessage(unprocessableMessage, 'validation'),
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 429:
        return {
          message: 'Server is busy. Please wait a moment and try again.',
          type: 'server',
          statusCode,
          isRetryable: true,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: 'Service temporarily unavailable. Please try again in a few minutes.',
          type: 'server',
          statusCode,
          isRetryable: true,
        };
      
      default:
        const defaultMessage = responseData?.error || responseData?.message || 'An unexpected error occurred.';
        return {
          message: sanitizeErrorMessage(defaultMessage, 'server'),
          type: 'server',
          statusCode,
          isRetryable: statusCode >= 500,
        };
    }
  }

  // Generic error - sanitize error message
  const genericMessage = error.message || 'An unexpected error occurred.';
  return {
    message: sanitizeErrorMessage(genericMessage, 'unknown'),
    type: 'unknown',
    isRetryable: false,
  };
};

export const isNetworkError = (error: any): boolean => {
  return error.code === 'NETWORK_ERROR' || 
         error.message === 'Network Error' || 
         error.code === 'ECONNABORTED';
};

export const isRetryableError = (error: any): boolean => {
  const parsedError = parseApiError(error);
  return parsedError.isRetryable;
};

export const getErrorMessage = (error: any): string => {
  return parseApiError(error).message;
};

export const getErrorType = (error: any): ErrorType => {
  return parseApiError(error).type;
};
