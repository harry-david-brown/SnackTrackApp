/**
 * Security validation utilities
 * Provides input validation and authorization checks to prevent security vulnerabilities
 */

import { UUID_REGEX } from '../constants';
import { getUserId } from './tokenManager';
import { logger } from './logger';

/**
 * Validates that a string is a valid UUID format
 * @param uuid - The UUID string to validate
 * @returns true if valid UUID, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid);
};

/**
 * Validates that a user ID belongs to the currently authenticated user
 * Prevents IDOR (Insecure Direct Object Reference) attacks
 * @param userId - The user ID to validate
 * @throws {Error} If user ID is invalid or doesn't match authenticated user
 */
export const validateUserIdOwnership = async (userId: string): Promise<void> => {
  // Validate UUID format
  if (!isValidUUID(userId)) {
    logger.warn('Invalid user ID format attempted:', userId.substring(0, 8) + '...');
    throw new Error('Invalid user ID format');
  }

  // Get authenticated user's ID from token storage
  const authenticatedUserId = await getUserId();

  if (!authenticatedUserId) {
    logger.error('No authenticated user found when validating ownership');
    throw new Error('Authentication required');
  }

  // Verify the requested user ID matches the authenticated user
  if (userId !== authenticatedUserId) {
    logger.warn('IDOR attempt detected: User tried to access different user data', {
      requestedId: userId.substring(0, 8) + '...',
      authenticatedId: authenticatedUserId.substring(0, 8) + '...',
    });
    throw new Error('Unauthorized: Cannot access other user data');
  }
};

/**
 * Sanitizes a user ID for safe use in API requests
 * Validates format and removes any potentially dangerous characters
 * @param userId - The user ID to sanitize
 * @returns Sanitized user ID
 * @throws {Error} If user ID is invalid
 */
export const sanitizeUserId = (userId: string): string => {
  if (!isValidUUID(userId)) {
    throw new Error('Invalid user ID format');
  }

  // UUIDs only contain [0-9a-f] and hyphens, so this is already safe
  // But we'll normalize to lowercase for consistency
  return userId.toLowerCase().trim();
};

/**
 * Validates and authorizes a user ID for API operations
 * Combines format validation, sanitization, and ownership check
 * @param userId - The user ID to validate and authorize
 * @returns Sanitized and validated user ID
 * @throws {Error} If validation or authorization fails
 */
export const validateAndAuthorizeUserId = async (userId: string): Promise<string> => {
  // Sanitize first
  const sanitizedId = sanitizeUserId(userId);

  // Check ownership
  await validateUserIdOwnership(sanitizedId);

  return sanitizedId;
};

/**
 * Validates array of user IDs
 * @param userIds - Array of user IDs to validate
 * @returns Array of valid UUIDs
 * @throws {Error} If any ID is invalid
 */
export const validateUserIds = (userIds: string[]): string[] => {
  if (!Array.isArray(userIds)) {
    throw new Error('User IDs must be an array');
  }

  return userIds.map((id) => {
    if (!isValidUUID(id)) {
      throw new Error(`Invalid user ID format: ${id}`);
    }
    return id.toLowerCase().trim();
  });
};

/**
 * Sanitizes input to prevent injection attacks
 * Removes potentially dangerous characters and limits length
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);

  // Remove null bytes (can cause issues in some contexts)
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
};

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates URL format and ensures it's safe
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: ['http', 'https'])
 * @returns true if valid and safe URL
 */
export const isValidUrl = (url: string, allowedProtocols: string[] = ['http', 'https']): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return allowedProtocols.includes(parsedUrl.protocol.replace(':', ''));
  } catch {
    return false;
  }
};

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns true if password meets requirements
 */
export const isStrongPassword = (password: string): boolean => {
  // Import dynamically to avoid circular dependencies
  const { validatePassword } = require('./passwordValidator');
  return validatePassword(password).isValid;
};

