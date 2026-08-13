/**
 * User API endpoints
 */

import api from './client';
import { validateAndAuthorizeUserId } from '../../utils/securityValidation';

export interface ResetOnboardingResponse {
  success: boolean;
  deletedReceipts: number;
  message: string;
}

export const userApi = {
  resetOnboarding: async (userId: string): Promise<ResetOnboardingResponse> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    const response = await api.post<unknown>(
      `/users/${validatedUserId}/reset-onboarding`,
      {},
      { timeout: 360000 }
    );
    const data = typeof response.data === 'object' && response.data !== null
      ? response.data as Record<string, unknown>
      : {};
    if (typeof data.success !== 'boolean' || typeof data.deletedReceipts !== 'number' || typeof data.message !== 'string') {
      throw new Error('Invalid onboarding reset response');
    }
    return { success: data.success, deletedReceipts: data.deletedReceipts, message: data.message };
  },
};
