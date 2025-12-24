/**
 * Validation API endpoints
 */

import api from './client';
import { UserSummary } from '../../types/api';
import { validateAndAuthorizeUserId } from '../../utils/securityValidation';

export const validationApi = {
  /**
   * Get user summary with validation data
   * @param userId - The user ID to get summary for
   * @returns Promise resolving to UserSummary with validation information
   * @throws {Error} If API request fails
   */
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    const response = await api.get(`/users/${validatedUserId}/summary`);
    return response.data;
  },
};

