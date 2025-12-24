/**
 * Error Utils Tests
 * Tests for API error parsing and classification
 */

import { parseApiError, isNetworkError, isRetryableError, getErrorMessage, getErrorType } from '../../utils/errorUtils';

describe('Error Utils', () => {
  describe('parseApiError', () => {
    it('should parse network errors', () => {
      const error = { code: 'NETWORK_ERROR', message: 'Network Error' };
      const result = parseApiError(error);

      expect(result.type).toBe('network');
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('internet connection');
    });

    it('should parse timeout errors', () => {
      const error = { code: 'ECONNABORTED', message: 'Request timeout' };
      const result = parseApiError(error);

      expect(result.type).toBe('network');
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('timed out');
    });

    it('should parse 400 file validation errors', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Invalid CSV format' },
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('validation');
      expect(result.statusCode).toBe(400);
      expect(result.isRetryable).toBe(false);
      // File-related errors pass through sanitization since they're in the whitelist
      expect(result.message).toBe('Invalid CSV format');
    });

    it('should parse 400 non-file validation errors', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Missing required field' },
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('validation');
      expect(result.statusCode).toBe(400);
      expect(result.isRetryable).toBe(false);
      // Non-file errors should show the actual error message
      expect(result.message).toBe('Missing required field');
    });

    it('should parse 401 authentication errors', () => {
      const error = {
        response: {
          status: 401,
          data: {},
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('validation');
      expect(result.statusCode).toBe(401);
      expect(result.isRetryable).toBe(false);
      // Empty error message gets sanitized to generic validation message
      expect(result.message).toBe('Invalid request. Please check your input and try again.');
    });

    it('should parse 429 rate limit errors', () => {
      const error = {
        response: {
          status: 429,
          data: {},
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(429);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('Server is busy');
    });

    it('should parse 500 server errors', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(500);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('temporarily unavailable');
    });

    it('should parse 503 service unavailable errors', () => {
      const error = {
        response: {
          status: 503,
          data: {},
        },
      };
      const result = parseApiError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(503);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('temporarily unavailable');
    });

    it('should parse generic errors', () => {
      const error = { message: 'Something went wrong' };
      const result = parseApiError(error);

      expect(result.type).toBe('unknown');
      expect(result.isRetryable).toBe(false);
      // Generic error messages not in whitelist get sanitized
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle errors without message', () => {
      const error = {};
      const result = parseApiError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('unexpected error');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError({ code: 'NETWORK_ERROR' })).toBe(true);
      expect(isNetworkError({ message: 'Network Error' })).toBe(true);
      expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError({ code: 'OTHER_ERROR' })).toBe(false);
      expect(isNetworkError({ response: { status: 500 } })).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError({ code: 'NETWORK_ERROR' })).toBe(true);
      expect(isRetryableError({ response: { status: 429 } })).toBe(true);
      expect(isRetryableError({ response: { status: 500 } })).toBe(true);
      expect(isRetryableError({ response: { status: 503 } })).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableError({ response: { status: 400 } })).toBe(false);
      expect(isRetryableError({ response: { status: 401 } })).toBe(false);
      expect(isRetryableError({ response: { status: 404 } })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract error message', () => {
      expect(getErrorMessage({ code: 'NETWORK_ERROR' })).toContain('internet connection');
      // Backend returns 'error' field, but also supports 'message' for backward compatibility
      // "Bad request" is not in the whitelist, so it gets sanitized
      expect(getErrorMessage({ response: { status: 400, data: { error: 'Bad request' } } })).toBe('Invalid request. Please check your input and try again.');
      expect(getErrorMessage({ response: { status: 400, data: { message: 'Bad request' } } })).toBe('Invalid request. Please check your input and try again.');
      // "Custom error" is not in the whitelist, so it gets sanitized
      expect(getErrorMessage({ message: 'Custom error' })).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('getErrorType', () => {
    it('should extract error type', () => {
      expect(getErrorType({ code: 'NETWORK_ERROR' })).toBe('network');
      expect(getErrorType({ response: { status: 400 } })).toBe('validation');
      expect(getErrorType({ response: { status: 500 } })).toBe('server');
      expect(getErrorType({ message: 'Unknown' })).toBe('unknown');
    });
  });
});

