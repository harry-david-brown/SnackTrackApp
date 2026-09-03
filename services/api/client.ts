/**
 * API client setup and interceptors
 * Handles authentication, token refresh, and error handling
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getConfig } from '@config/env';
import { API_CONFIG, PUBLIC_ENDPOINTS, HTTP_STATUS } from '@/constants';
import { logger } from '@utils/logger';
import { checkRateLimit, RATE_LIMITS } from '@utils/rateLimiter';
import { notifySessionExpired } from '@services/authSessionCoordinator';
import { sessionExpiredError, toApiClientError } from './apiError';
import { isTerminalSessionError } from '@features/auth/contracts';

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
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN_MS = 1000; // 1 second cooldown between refresh attempts

const onRefreshed = (token: string) => {
  void token;
  refreshAttempts = 0; // Reset attempts on success
};

const onRefreshFailed = () => undefined;

const expireLocalSession = async () => {
  try {
    const { clearAuthTokens } = await import('@utils/tokenManager');
    await clearAuthTokens();
  } catch (error) {
    logger.error('Failed to clear expired authentication tokens:', error);
  }
  await notifySessionExpired();
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
const sanitizeErrorData = (data: unknown): unknown => {
  if (!data) return undefined;
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    // Remove potentially sensitive fields
    const sensitiveFields = ['accessToken', 'refreshToken', 'token', 'password', 'email'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    });
    
    if ('user' in sanitized && sanitized.user && typeof sanitized.user === 'object') {
      const user = sanitized.user as Record<string, unknown>;
      sanitized.user = {
        id: user.id,
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
  if ((url.includes('/summary') || url.includes('/dashboard-insights')) && upperMethod === 'GET') return 'GET_ANALYTICS';
  if (url.includes('/receipts') && upperMethod === 'GET') return 'GET_RECEIPTS';
  if (url.includes('/users/') && upperMethod === 'GET') return 'GET_USER_DATA';
  
  // Data mutation endpoints
  if (url.includes('/imports/export') || (url.includes('/imports/') && url.includes('/submit'))) return 'UPLOAD_CSV';
  
  return 'DEFAULT';
};

// Request interceptor - adds Authorization header and rate limiting
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    
    logger.apiRequest(method, url);

    // Analytics are calculated in the user's IANA timezone. Supplying the
    // current device zone lets the API repair fallback zones on older accounts.
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone) {
      config.headers['X-Timezone'] = deviceTimezone;
    }

    // Apply rate limiting
    const rateLimitType = getRateLimitType(url, method);
    const rateLimitKey = `${method}:${url}`;
    
    if (!checkRateLimit(rateLimitKey, rateLimitType)) {
      const error = Object.assign(
        new Error('Rate limit exceeded. Please wait before making more requests.'),
        { code: 'RATE_LIMIT_EXCEEDED', rateLimitType }
      );
      logger.warn(`Rate limit exceeded for ${rateLimitKey}`);
      return Promise.reject(error);
    }


    // Skip auth for public endpoints
    if (!isPublicEndpoint(url)) {
      // Import token utilities directly (avoid circular dependency)
      const { getAccessToken } = await import('@utils/tokenManager');
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
        const clientError = toApiClientError(error);
        logger.apiError(HTTP_STATUS.UNAUTHORIZED, originalRequest.url || '', clientError.code);
        return Promise.reject(clientError);
      }

      // Check if we've exceeded max refresh attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logger.error('Max token refresh attempts exceeded');
        await expireLocalSession();
        refreshAttempts = 0;
        return Promise.reject(sessionExpiredError(error));
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
            return Promise.reject(sessionExpiredError(error));
          }
        } catch (err) {
          const clientError = toApiClientError(err);
          return Promise.reject(isTerminalSessionError(clientError.code) ? sessionExpiredError(err) : clientError);
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
          const { authApi } = await import('@services/authApi');
          const { getRefreshToken, updateAccessToken } = await import('@utils/tokenManager');
          const storedRefreshToken = await getRefreshToken();
          if (!storedRefreshToken) throw sessionExpiredError();
          const response = await authApi.refresh(storedRefreshToken);
          await updateAccessToken(response.accessToken, response.refreshToken);

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

          const clientError = toApiClientError(refreshError);
          if (isTerminalSessionError(clientError.code)) {
            await expireLocalSession();
            throw sessionExpiredError(refreshError);
          }
          refreshAttempts = 0;
          throw clientError;
        }
      })();

      try {
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        const clientError = toApiClientError(refreshError);
        return Promise.reject(
          isTerminalSessionError(clientError.code) ? sessionExpiredError(refreshError) : clientError,
        );
      }
    }

    // Log errors in development (sanitized)
    if (error.response) {
      const status = error.response.status;
      const url = originalRequest?.url || 'unknown';
      logger.apiError(status, url, toApiClientError(error).code);
    }

    // Report server errors (5xx) to Sentry
    if (error.response && error.response.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      const { captureException } = await import('@utils/sentry');
      const apiError = new Error(`API Server Error: ${error.response.status} ${originalRequest?.url || 'unknown'}`);
      
      captureException(apiError, {
        statusCode: error.response.status,
        url: originalRequest?.url,
        method: originalRequest?.method,
        responseData: sanitizeErrorData(error.response.data),
      });
    }

    // Handle other errors - just pass them through
    return Promise.reject(toApiClientError(error));
  }
);

export default api;
