/**
 * Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { parseApiError, ApiError } from './errorUtils';
import { logger } from './logger';
import { ApiClientError } from '@services/api/apiError';

/**
 * Handle API errors with standardized logging and error transformation
 */
export const handleApiError = (error: unknown, context?: string): ApiError => {
  const parsed = parseApiError(error);
  
  // Log error with context if provided
  if (context) {
    logger.error(`[${context}]`, parsed.message);
  } else {
    logger.error(parsed.message);
  }
  
  return parsed;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  return parseApiError(error).type === 'network';
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
  const parsed = parseApiError(error);
  return parsed.isRetryable;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  return parseApiError(error).message;
};

/**
 * Handle session expiration errors
 */
export const isSessionExpired = (error: unknown): boolean => {
  const parsed = parseApiError(error);
  return parsed.code === 'SESSION_EXPIRED' || parsed.statusCode === 401;
};

/**
 * Create a standardized error object
 */
export const createError = (
  message: string,
  type: 'network' | 'validation' | 'server' | 'unknown' = 'unknown',
  statusCode?: number
): Error => new ApiClientError({
  code: 'LOCAL_ERROR',
  message,
  kind: type,
  retryable: type === 'network' || type === 'server',
  statusCode,
});
