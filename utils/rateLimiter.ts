/**
 * Client-side rate limiting utility
 * Prevents excessive API requests and protects against accidental DoS
 */

import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Rate limiter class for managing request throttling
 */
class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    // Use unref() to prevent the interval from keeping the process alive
    // This is important for tests and allows the process to exit naturally
    if (this.cleanupInterval && typeof (this.cleanupInterval as any).unref === 'function') {
      (this.cleanupInterval as any).unref();
    }
  }

  /**
   * Check if a request should be allowed
   * @param key - Unique identifier for the request (e.g., 'GET:/users/{id}/summary')
   * @param config - Rate limit configuration
   * @returns true if request is allowed, false if rate limited
   */
  public checkLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    // No record exists - create one and allow
    if (!record) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return true;
    }

    // Window has expired - reset counter
    if (now >= record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return true;
    }

    // Increment counter
    record.count++;

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
      if (!record.blocked) {
        // First time blocking - log it
        record.blocked = true;
        logger.warn(`Rate limit exceeded for ${key}`, {
          count: record.count,
          limit: config.maxRequests,
          resetIn: Math.ceil((record.resetTime - now) / 1000) + 's',
        });
      }
      return false;
    }

    return true;
  }

  /**
   * Get remaining requests for a key
   * @param key - Unique identifier for the request
   * @param maxRequests - Maximum requests allowed
   * @returns number of remaining requests, or maxRequests if no record exists
   */
  public getRemaining(key: string, maxRequests: number): number {
    const record = this.requests.get(key);
    if (!record) return maxRequests;

    const now = Date.now();
    if (now >= record.resetTime) return maxRequests;

    return Math.max(0, maxRequests - record.count);
  }

  /**
   * Get time until reset for a key
   * @param key - Unique identifier for the request
   * @returns milliseconds until reset, or 0 if no record exists or expired
   */
  public getResetTime(key: string): number {
    const record = this.requests.get(key);
    if (!record) return 0;

    const now = Date.now();
    if (now >= record.resetTime) return 0;

    return record.resetTime - now;
  }

  /**
   * Manually reset limit for a key
   * @param key - Unique identifier for the request
   */
  public reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limit records
   */
  public clearAll(): void {
    this.requests.clear();
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.requests.forEach((record, key) => {
      if (now >= record.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.requests.delete(key));

    if (keysToDelete.length > 0 && __DEV__) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit records`);
    }
  }

  /**
   * Destroy the rate limiter and cleanup
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH_LOGIN: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  AUTH_REGISTER: { maxRequests: 3, windowMs: 60000 }, // 3 per minute
  AUTH_REFRESH: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  
  // Data fetching endpoints
  GET_ANALYTICS: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  GET_RECEIPTS: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  GET_USER_DATA: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  
  // Data mutation endpoints
  UPLOAD_CSV: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
  UPDATE_RECEIPTS: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  
  // Default for unspecified endpoints
  DEFAULT: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
} as const;

/**
 * Check if a request should be allowed based on rate limiting
 * @param endpoint - The endpoint being accessed (e.g., 'GET:/users/{id}/summary')
 * @param limitType - The type of rate limit to apply (optional, defaults to DEFAULT)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  endpoint: string,
  limitType: keyof typeof RATE_LIMITS = 'DEFAULT'
): boolean {
  const config = RATE_LIMITS[limitType];
  return rateLimiter.checkLimit(endpoint, config);
}

/**
 * Get rate limit information for an endpoint
 * @param endpoint - The endpoint being accessed
 * @param limitType - The type of rate limit to apply
 * @returns Object with remaining requests and reset time
 */
export function getRateLimitInfo(
  endpoint: string,
  limitType: keyof typeof RATE_LIMITS = 'DEFAULT'
) {
  const config = RATE_LIMITS[limitType];
  return {
    remaining: rateLimiter.getRemaining(endpoint, config.maxRequests),
    resetIn: rateLimiter.getResetTime(endpoint),
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific endpoint
 * @param endpoint - The endpoint to reset
 */
export function resetRateLimit(endpoint: string): void {
  rateLimiter.reset(endpoint);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimiter.clearAll();
}

/**
 * Destroy the rate limiter instance (useful for testing cleanup)
 */
export function destroyRateLimiter(): void {
  rateLimiter.destroy();
}

/**
 * Throttle function - ensures function is not called more than once per delay
 * @param func - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      // Schedule for later if not called yet
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * Debounce function - delays execution until after delay has elapsed since last call
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

export default rateLimiter;

