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
        
        // Check if it's a file-related error (CSV/ZIP validation)
        const errorLower = errorText.toLowerCase();
        const isFileError = errorLower.includes('file') || 
                           errorLower.includes('format') ||
                           errorLower.includes('invalid csv') ||
                           errorLower.includes('no valid orders') ||
                           errorLower.includes('csv') ||
                           errorLower.includes('zip') ||
                           errorDetails.some((d: string) => 
                             d.toLowerCase().includes('header') || 
                             d.toLowerCase().includes('csv') ||
                             d.toLowerCase().includes('format')
                           );
        
        // Build user-friendly message
        let userMessage: string;
        if (isFileError) {
          userMessage = 'Wrong file! Please select your Uber user data.';
          // Include hint if available for better user guidance
          if (errorHint) {
            userMessage += ` ${errorHint}`;
          }
        } else if (errorText) {
          userMessage = errorText;
          // Include hint if available
          if (errorHint) {
            userMessage += ` ${errorHint}`;
          }
        } else {
          userMessage = 'Invalid request. Please check your input.';
        }
        
        return {
          message: userMessage,
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
          message: responseData?.error || responseData?.message || 'The requested resource was not found.',
          type: 'validation',
          statusCode,
          isRetryable: false,
        };
      
      case 422:
        return {
          message: responseData?.error || responseData?.message || 'Invalid data provided.',
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
        return {
          message: responseData?.error || responseData?.message || 'An unexpected error occurred.',
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
