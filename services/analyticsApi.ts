import api from './api';
import { UserSummary } from '../types/api';
import { deduplicateRequest } from '../utils/requestDeduplication';
import { validateAndAuthorizeUserId } from '../utils/securityValidation';

export const analyticsApi = {
  /**
   * Get user summary with analytics data
   * @param userId - The user ID to get analytics for
   * @param includeWrapped - Whether to include wrapped analytics (Spotify Wrapped-style insights)
   * @returns Promise resolving to UserSummary with analytics data
   * @throws {Error} If API request fails
   */
  getUserSummary: async (userId: string, includeWrapped: boolean = false): Promise<UserSummary> => {
    return deduplicateRequest(
      'GET',
      `/users/${userId}/summary`,
      async () => {
    try {
      // Validate and authorize user ID
      const validatedUserId = await validateAndAuthorizeUserId(userId);

      const params = includeWrapped ? '?includeWrapped=true' : '';
      const response = await api.get(`/users/${validatedUserId}/summary${params}`);
      const data = response.data;
      
      // Transform the API response to match our UserSummary interface
      const userSummary: UserSummary = {
        userId: data.user.id,
        totalSpent: data.statistics.totalSpent,
        totalReceipts: data.statistics.totalReceipts,
        averageOrderValue: data.statistics.averageSpent,
        topRestaurants: data.statistics.topRestaurants.map((restaurant: any) => ({
          name: restaurant.name,
          count: restaurant.count,
          totalSpent: restaurant.total,
        })),
        monthlyBreakdown: Object.entries(data.statistics.monthlyBreakdown).map(([month, data]: [string, any]) => ({
          month,
          totalSpent: data.total,
          receiptCount: data.count,
        })),
        refundedReceipts: data.validation.refundedReceipts,
        dataQuality: {
          issues: data.validation.issues,
          recommendations: [
            'Consider uploading more recent data for better insights',
            'Review any refunded receipts for accuracy'
          ],
        },
      };
      
      // Include wrapped analytics if requested and available
      if (includeWrapped && data.wrappedAnalytics) {
        userSummary.wrappedAnalytics = data.wrappedAnalytics;
      }
      
      return userSummary;
    } catch (error) {
      throw error;
    }
      },
      { userId, includeWrapped } // params for key generation
    );
  },

  /**
   * Get database statistics (admin/debug endpoint)
   * @returns Promise resolving to database statistics object
   * @throws {Error} If API request fails
   */
  getDatabaseStats: async () => {
    try {
      const response = await api.get('/database/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all users (admin/debug endpoint)
   * @returns Promise resolving to array of user objects
   * @throws {Error} If API request fails
   */
  getUsers: async () => {
    try {
      const response = await api.get('/database/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get receipts with pagination
   * @param limit - Number of receipts per page (default: 20)
   * @param offset - Offset for pagination (default: 0)
   * @returns Promise resolving to paginated receipts data
   * @throws {Error} If API request fails
   */
  getReceipts: async (limit = 20, offset = 0) => {
    try {
      const response = await api.get(`/receipts?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default analyticsApi;
