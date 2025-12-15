import api from './api';
import { UserSummary } from '../types/api';
import { deduplicateRequest } from '../utils/requestDeduplication';

export const analyticsApi = {
  // Get user summary with analytics
  getUserSummary: async (userId: string, includeWrapped: boolean = false): Promise<UserSummary> => {
    return deduplicateRequest(
      'GET',
      `/users/${userId}/summary`,
      async () => {
    try {
      const params = includeWrapped ? '?includeWrapped=true' : '';
      const response = await api.get(`/users/${userId}/summary${params}`);
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

  // Get database statistics
  getDatabaseStats: async () => {
    try {
      const response = await api.get('/database/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all users
  getUsers: async () => {
    try {
      const response = await api.get('/database/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get receipts with pagination
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
