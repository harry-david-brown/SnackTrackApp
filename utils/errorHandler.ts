/**
 * Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { AxiosError } from 'axios';
import { parseApiError, ApiError } from './errorUtils';
import { logger } from './logger';
import { HTTP_STATUS } from '../constants';

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
  if (error instanceof AxiosError) {
    return !error.response || error.code === 'ECONNABORTED';
  }
  
  if (error instanceof Error) {
    return error.message === 'Network Error' || error.message.includes('network');
  }
  
  return false;
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
  if (error instanceof Error) {
    return error.message === 'SESSION_EXPIRED';
  }
  
  if (error instanceof AxiosError) {
    return error.response?.status === HTTP_STATUS.UNAUTHORIZED;
  }
  
  return false;
};

/**
 * Create a standardized error object
 */
export const createError = (
  message: string,
  type: 'network' | 'validation' | 'server' | 'unknown' = 'unknown',
  statusCode?: number
): Error => {
  const error = new Error(message);
  (error as any).type = type;
  (error as any).statusCode = statusCode;
  return error;
};

