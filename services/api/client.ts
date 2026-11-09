/**
 * API client setup and interceptors
 * Handles authentication, token refresh, and error handling
 */

import { create, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getConfig } from '@config/env';
import { API_CONFIG, PUBLIC_ENDPOINTS, HTTP_STATUS } from '@/constants';
import { logger } from '@utils/logger';
import { checkRateLimit, RATE_LIMITS } from '@utils/rateLimiter';
import { toApiClientError } from './apiError';
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
export const api: AxiosInstance = create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface SessionAwareRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionRefreshToken?: string | null;
}

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
      const { getAuthTokenSnapshot } = await import('@utils/tokenManager');
      const { accessToken, refreshToken } = await getAuthTokenSnapshot();

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      (config as SessionAwareRequestConfig)._sessionRefreshToken = refreshToken;
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
    const originalRequest = error.config as SessionAwareRequestConfig | undefined;

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && originalRequest && !originalRequest._retry) {
      // Check if this is a public endpoint - if so, don't try to refresh
      if (isPublicEndpoint(originalRequest.url || '')) {
        const clientError = toApiClientError(error);
        logger.apiError(HTTP_STATUS.UNAUTHORIZED, originalRequest.url || '', clientError.code);
        return Promise.reject(clientError);
      }

      const rejection = toApiClientError(error);
      if (rejection.code === 'ACCOUNT_DELETION_PENDING') {
        const { clearAuthTokensIfRefreshTokenMatches } = await import('@utils/tokenManager');
        const cleared = await clearAuthTokensIfRefreshTokenMatches(originalRequest._sessionRefreshToken ?? null);
        if (cleared) {
          const { notifySessionExpired } = await import('@services/authSessionCoordinator');
          await notifySessionExpired();
        }
        return Promise.reject(rejection);
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      try {
        const { refreshStoredSession } = await import('@services/authApi');
        const newToken = await refreshStoredSession(originalRequest._sessionRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        logger.debug('Token refresh successful');
        return api(originalRequest);
      } catch (refreshError) {
        const clientError = toApiClientError(refreshError);
        if (clientError.code === 'SESSION_REFRESH_SUPERSEDED') {
          logger.debug('Discarded a refresh result from an older session');
        } else if (isTerminalSessionError(clientError.code)) {
          logger.warn('Session refresh rejected', { code: clientError.code });
        } else {
          logger.error('Token refresh failed:', clientError);
        }
        return Promise.reject(clientError);
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
