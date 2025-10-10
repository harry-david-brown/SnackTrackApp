import { AxiosError } from 'axios';
import { ErrorType } from '../components/ErrorMessage';

export interface ApiError {
  message: string;
  type: ErrorType;
  statusCode?: number;
  isRetryable: boolean;
}

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
    const responseData = error.response.data;

    switch (statusCode) {
      case 400:
        return {
          message: responseData?.message || 'Invalid request. Please check your input.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 401:
        return {
          message: 'Authentication required. Please log in again.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 403:
        return {
          message: 'You don\'t have permission to perform this action.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 404:
        return {
          message: responseData?.message || 'The requested resource was not found.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 422:
        return {
          message: responseData?.message || 'Invalid data provided.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          type: 'server',
          statusCode,
          isRetryable: true,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: 'Server error. Our team has been notified.',
          type: 'server',
          statusCode,
          isRetryable: true,
        };
      
      default:
        return {
          message: responseData?.message || 'An unexpected error occurred.',
          type: 'server',
          statusCode,
          isRetryable: statusCode >= 500,
        };
    }
  }

  // Generic error
  return {
    message: error.message || 'An unexpected error occurred.',
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
