/**
 * Password validation utility
 * Provides comprehensive password strength validation
 */

import { PASSWORD_RULES } from '../constants';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-4
}

/**
 * Validate password against security requirements
 * @param password - The password to validate
 * @returns Validation result with errors and strength score
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'weak',
      score: 0,
    };
  }

  // Check minimum length
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters long`);
  } else {
    score++;
  }

  // Check maximum length (prevent DoS)
  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_RULES.MAX_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (PASSWORD_RULES.REQUIRES_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (PASSWORD_RULES.REQUIRES_UPPERCASE) {
    score++;
  }

  // Check for lowercase letter
  if (PASSWORD_RULES.REQUIRES_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (PASSWORD_RULES.REQUIRES_LOWERCASE) {
    score++;
  }

  // Check for number
  if (PASSWORD_RULES.REQUIRES_NUMBER && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (PASSWORD_RULES.REQUIRES_NUMBER) {
    score++;
  }

  // Check for special character
  if (PASSWORD_RULES.REQUIRES_SPECIAL) {
    const specialCharsRegex = new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    } else {
      score++;
    }
  }

  // Additional strength checks (not required but improve score)
  // Check for variety of character types
  const hasMultipleUppercase = (password.match(/[A-Z]/g) || []).length >= 2;
  const hasMultipleLowercase = (password.match(/[a-z]/g) || []).length >= 2;
  const hasMultipleNumbers = (password.match(/\d/g) || []).length >= 2;
  const hasMultipleSpecial = (password.match(new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g')) || []).length >= 2;

  // Bonus points for variety
  if (hasMultipleUppercase && hasMultipleLowercase) score += 0.5;
  if (hasMultipleNumbers && hasMultipleSpecial) score += 0.5;

  // Bonus for longer passwords
  if (password.length >= 16) score += 0.5;
  if (password.length >= 20) score += 0.5;

  // Check for common weak patterns
  const weakPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /(.)\1{2,}/, // Repeated characters (e.g., "aaa", "111")
    /^[a-z]+$/i, // Only letters
    /^\d+$/, // Only numbers
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      score = Math.max(0, score - 1);
      break;
    }
  }

  // Determine strength based on score
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'good';
  } else if (score >= 2) {
    strength = 'fair';
  } else {
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(4, Math.max(0, score)),
  };
}

/**
 * Get password strength as a percentage (0-100)
 * @param password - The password to evaluate
 * @returns Percentage strength (0-100)
 */
export function getPasswordStrength(password: string): number {
  const result = validatePassword(password);
  return (result.score / 4) * 100;
}

/**
 * Get password requirements as human-readable strings
 * @returns Array of requirement strings
 */
export function getPasswordRequirements(): string[] {
  const requirements: string[] = [
    `At least ${PASSWORD_RULES.MIN_LENGTH} characters long`,
  ];

  if (PASSWORD_RULES.REQUIRES_UPPERCASE) {
    requirements.push('At least one uppercase letter (A-Z)');
  }

  if (PASSWORD_RULES.REQUIRES_LOWERCASE) {
    requirements.push('At least one lowercase letter (a-z)');
  }

  if (PASSWORD_RULES.REQUIRES_NUMBER) {
    requirements.push('At least one number (0-9)');
  }

  if (PASSWORD_RULES.REQUIRES_SPECIAL) {
    requirements.push('At least one special character (!@#$%^&*...)');
  }

  return requirements;
}

/**
 * Check if password meets minimum requirements (for quick validation)
 * @param password - The password to check
 * @returns true if password meets minimum requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * Get password strength color for UI display
 * @param strength - The strength level
 * @returns Color code for UI
 */
export function getStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  const colors = {
    weak: '#ff4444',
    fair: '#ffaa00',
    good: '#00aa00',
    strong: '#00cc00',
  };
  return colors[strength];
}

