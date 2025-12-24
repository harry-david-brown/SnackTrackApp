/**
 * API client setup and interceptors
 * Handles authentication, token refresh, and error handling
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getConfig } from '../../config/env';
import { API_CONFIG, PUBLIC_ENDPOINTS, HTTP_STATUS } from '../../constants';
import { logger } from '../../utils/logger';
import { checkRateLimit, RATE_LIMITS } from '../../utils/rateLimiter';

// Get validated API URL from environment configuration
const config = getConfig();
const API_BASE_URL = config.apiUrl;

// Log the API URL and environment in development for debugging
if (__DEV__) {
  logger.debug('API Base URL:', API_BASE_URL);
  logger.debug('App Environment:', config.appEnv);
}

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh mutex to prevent race conditions
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshSubscribers: ((token: string) => void)[] = [];
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN_MS = 1000; // 1 second cooldown between refresh attempts

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
  refreshAttempts = 0; // Reset attempts on success
};

const onRefreshFailed = () => {
  refreshSubscribers.forEach((callback) => callback(''));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Extract pathname from URL (removes query parameters and fragments)
 */
const getPathname = (urlStr: string): string => {
  const queryIndex = urlStr.indexOf('?');
  const fragmentIndex = urlStr.indexOf('#');
  let pathname = urlStr;
  
  if (queryIndex !== -1) {
    pathname = pathname.substring(0, queryIndex);
  }
  if (fragmentIndex !== -1 && (queryIndex === -1 || fragmentIndex < queryIndex)) {
    pathname = pathname.substring(0, fragmentIndex);
  }
  
  return pathname;
};

/**
 * Check if a URL path is a public endpoint (doesn't require authentication)
 */
const isPublicEndpoint = (url: string): boolean => {
  const pathname = getPathname(url || '');
  
  // Root path is public
  if (pathname === '/') return true;
  
  // Check if pathname matches any public endpoint
  return PUBLIC_ENDPOINTS.some(endpoint => {
    // Exact match
    if (pathname === endpoint) return true;
    // Starts with endpoint + '/' (prevents partial matches)
    if (pathname.startsWith(endpoint + '/')) return true;
    return false;
  });
};

/**
 * Sanitize error data before sending to Sentry
 */
const sanitizeErrorData = (data: any): any => {
  if (!data) return undefined;
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    // Remove potentially sensitive fields
    const sensitiveFields = ['accessToken', 'refreshToken', 'token', 'password', 'email'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    });
    
    if ('user' in sanitized && sanitized.user) {
      sanitized.user = {
        id: sanitized.user.id,
        email: '[REDACTED]',
      };
    }
    
    return sanitized;
  }
  
  return '[REDACTED]';
};

/**
 * Determine rate limit type based on endpoint
 */
const getRateLimitType = (url: string, method: string): keyof typeof RATE_LIMITS => {
  const upperMethod = method.toUpperCase();
  
  // Authentication endpoints
  if (url.includes('/auth/login')) return 'AUTH_LOGIN';
  if (url.includes('/auth/register')) return 'AUTH_REGISTER';
  if (url.includes('/auth/refresh')) return 'AUTH_REFRESH';
  
  // Data fetching endpoints
  if (url.includes('/summary') && upperMethod === 'GET') return 'GET_ANALYTICS';
  if (url.includes('/receipts') && upperMethod === 'GET') return 'GET_RECEIPTS';
  if (url.includes('/users/') && upperMethod === 'GET') return 'GET_USER_DATA';
  
  // Data mutation endpoints
  if (url.includes('/csv/import')) return 'UPLOAD_CSV';
  if (url.includes('/update-receipts')) return 'UPDATE_RECEIPTS';
  
  return 'DEFAULT';
};

// Request interceptor - adds Authorization header and rate limiting
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    
    logger.apiRequest(method, url);

    // Apply rate limiting
    const rateLimitType = getRateLimitType(url, method);
    const rateLimitKey = `${method}:${url}`;
    
    if (!checkRateLimit(rateLimitKey, rateLimitType)) {
      const error = new Error('Rate limit exceeded. Please wait before making more requests.');
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).rateLimitType = rateLimitType;
      logger.warn(`Rate limit exceeded for ${rateLimitKey}`);
      return Promise.reject(error);
    }


    // Skip auth for public endpoints
    if (!isPublicEndpoint(url)) {
      // Import token utilities directly (avoid circular dependency)
      const { getAccessToken } = await import('../../utils/tokenManager');
      const token = await getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles 401 errors and token refresh
api.interceptors.response.use(
  (response) => {
    logger.apiResponse(response.status, response.config.url || '');
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      // Check if this is a public endpoint - if so, don't try to refresh
      if (isPublicEndpoint(originalRequest.url || '')) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Unknown error';
        const sanitizedMessage = typeof errorMessage === 'string' ? errorMessage : '[REDACTED]';
        logger.apiError(HTTP_STATUS.UNAUTHORIZED, originalRequest.url || '', sanitizedMessage);
        return Promise.reject(error);
      }

      // Check if we've exceeded max refresh attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logger.error('Max token refresh attempts exceeded');
        const { clearAuthTokens } = await import('../../utils/tokenManager');
        await clearAuthTokens();
        refreshAttempts = 0;
        return Promise.reject(new Error('SESSION_EXPIRED'));
      }

      // If refresh is in progress, wait for it
      if (isRefreshing && refreshPromise) {
        try {
          const token = await refreshPromise;
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retry = true;
            return api(originalRequest);
          } else {
            return Promise.reject(new Error('SESSION_EXPIRED'));
          }
        } catch (err) {
          return Promise.reject(new Error('SESSION_EXPIRED'));
        }
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Start refresh process with mutex
      isRefreshing = true;
      refreshAttempts++;

      refreshPromise = (async () => {
        try {
          // Add cooldown to prevent rapid refresh attempts
          if (refreshAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, REFRESH_COOLDOWN_MS));
          }

          // Dynamically import to avoid circular dependency
          const { authApi } = await import('../authApi');
          const response = await authApi.refresh();

          logger.debug('Token refresh successful');
          isRefreshing = false;
          refreshPromise = null;
          onRefreshed(response.accessToken);

          return response.accessToken;
        } catch (refreshError) {
          logger.error('Token refresh failed:', refreshError);
          isRefreshing = false;
          refreshPromise = null;
          onRefreshFailed();

          // Refresh failed - clear tokens
          const { clearAuthTokens } = await import('../../utils/tokenManager');
          await clearAuthTokens();

          throw new Error('SESSION_EXPIRED');
        }
      })();

      try {
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(new Error('SESSION_EXPIRED'));
      }
    }

    // Log errors in development (sanitized)
    if (error.response) {
      const status = error.response.status;
      const url = originalRequest?.url || 'unknown';
      const errorMessage = error.response.data?.message || error.response.data?.error || 'Unknown error';
      const sanitizedMessage = typeof errorMessage === 'string' ? errorMessage : '[REDACTED]';
      logger.apiError(status, url, sanitizedMessage);
    }

    // Report server errors (5xx) to Sentry
    if (error.response && error.response.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      const { captureException } = await import('../../utils/sentry');
      const apiError = new Error(`API Server Error: ${error.response.status} ${originalRequest?.url || 'unknown'}`);
      
      captureException(apiError, {
        statusCode: error.response.status,
        url: originalRequest?.url,
        method: originalRequest?.method,
        responseData: sanitizeErrorData(error.response.data),
      });
    }

    // Handle other errors - just pass them through
    return Promise.reject(error);
  }
);

export default api;

