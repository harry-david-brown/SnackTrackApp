/**
 * User API endpoints
 */

import api from './client';
import { CreateUserRequest, CreateUserResponse } from '../../types/api';
import { validateAndAuthorizeUserId, isValidEmail, sanitizeInput } from '../../utils/securityValidation';

export const userApi = {
  /**
   * Create a new user account
   * @param data - User registration data (email)
   * @returns Promise resolving to CreateUserResponse with userId and message
   * @throws {Error} If registration fails (e.g., email already exists)
   */
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    // Validate email format
    if (!isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    const response = await api.post('/users/create', data);
    return response.data;
  },

  /**
   * Get user's total spending across all receipts
   * @param userId - The user ID to get spending for
   * @returns Promise resolving to total amount spent as a number
   * @throws {Error} If API request fails or user not found
   */
  getTotalSpent: async (userId: string): Promise<number> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    const response = await api.get(`/users/${validatedUserId}/totalSpent`);
    return response.data.totalSpent;
  },

  /**
   * Trigger email parsing for user to extract receipt data
   * @param userId - The user ID to process receipts for
   * @returns Promise that resolves when processing is triggered
   * @throws {Error} If API request fails
   */
  updateReceipts: async (userId: string): Promise<void> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    await api.post(`/users/${validatedUserId}/update-receipts`);
  },

  /**
   * Debug endpoint to inspect user's email data (development only)
   * @param userId - The user ID to debug
   * @returns Promise resolving to debug information about user's emails
   * @throws {Error} If API request fails
   */
  debugEmails: async (userId: string): Promise<any> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    const response = await api.get(`/users/${validatedUserId}/debug/emails`);
    return response.data;
  },
};

