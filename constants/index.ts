/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 10000,
  DEFAULT_PAGINATION_LIMIT: 20,
  DEFAULT_PAGINATION_OFFSET: 0,
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh if expiring within 5 minutes
} as const;

// Request Deduplication
export const REQUEST_DEDUP = {
  WINDOW_MS: 2000, // 2 seconds
} as const;

// Offline Sync Configuration
export const OFFLINE_SYNC = {
  MAX_RETRIES: 3,
} as const;

// JWT Token Validation
export const JWT_CONFIG = {
  REQUIRED_PARTS: 3, // header.payload.signature
} as const;

// Password Validation (Strengthened for security)
export const PASSWORD_RULES = {
  MIN_LENGTH: 12,
  REQUIRES_UPPERCASE: true,
  REQUIRES_LOWERCASE: true,
  REQUIRES_NUMBER: true,
  REQUIRES_SPECIAL: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  MAX_LENGTH: 128, // Prevent DoS from extremely long passwords
} as const;

// UUID Validation
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Default User Values
export const DEFAULT_USER_VALUES = {
  TOTAL_SPENT: 0,
  RECEIPT_COUNT: 0,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Public API Endpoints (don't require authentication)
export const PUBLIC_ENDPOINTS = [
  '/auth/register',
  '/auth/login',
  '/auth/google',
  '/auth/apple',
  '/auth/refresh',
  '/health',
] as const;

// Storage Keys
export const STORAGE_KEYS = {
  ANALYTICS_CACHE: '@snacktrack_analytics_cache',
  LAST_SYNC: '@snacktrack_last_sync',
  LEGACY_USER_DATA: '@snacktrack_user_data',
  LEGACY_USER_ID: '@snacktrack_user_id',
} as const;

