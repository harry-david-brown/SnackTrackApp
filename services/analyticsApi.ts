import api from './api';
import { UserSummary } from '../types/api';

export const analyticsApi = {
  // Get user summary with analytics
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    try {
      const response = await api.get(`/validation/user/${userId}/summary`);
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
      
      return userSummary;
    } catch (error) {
      throw error;
    }
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
