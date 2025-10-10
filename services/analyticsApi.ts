import axios from 'axios';
import Constants from 'expo-constants';
import { UserSummary } from '../types/api';

// Get API URL from environment with proper fallbacks
const getApiUrl = () => {
  // 1. Check explicit environment variable (highest priority)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. Check app.config.js extra config
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  
  // 3. Development fallback - this should only be used in dev
  if (__DEV__) {
    return 'http://localhost:3000';
  }
  
  // 4. Production - this should never happen if properly configured
  throw new Error('API_URL not configured! Set EXPO_PUBLIC_API_URL environment variable.');
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      console.error('Error fetching user summary:', error);
      throw error;
    }
  },

  // Get database statistics
  getDatabaseStats: async () => {
    try {
      const response = await api.get('/database/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw error;
    }
  },

  // Get all users
  getUsers: async () => {
    try {
      const response = await api.get('/database/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get receipts with pagination
  getReceipts: async (limit = 20, offset = 0) => {
    try {
      const response = await api.get(`/receipts?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  },
};

export default analyticsApi;
