import axios from 'axios';
import Constants from 'expo-constants';
import { 
  User, 
  Receipt, 
  CreateUserRequest, 
  CreateUserResponse, 
  CSVImportResponse, 
  UserSummary,
  DatabaseStats,
  PaginationResponse 
} from '../types/api';

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
    console.warn('⚠️ No API URL configured. Using localhost. For mobile testing, set EXPO_PUBLIC_API_URL in .env');
    return 'http://localhost:3000';
  }
  
  // 4. Production - this should never happen if properly configured
  throw new Error('API_URL not configured! Set EXPO_PUBLIC_API_URL environment variable.');
};

const API_BASE_URL = getApiUrl();

// Log the API URL in development for debugging
if (__DEV__) {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Request interceptor - adds Authorization header
api.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    // Skip auth for public endpoints
    const publicEndpoints = ['/auth/register', '/auth/login', '/auth/refresh', '/health'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint)) || config.url === '/';
    
    if (!isPublicEndpoint) {
      // Import token utilities directly (avoid circular dependency with authApi)
      const { getAccessToken } = await import('../utils/tokenManager');
      const token = await getAccessToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles 401 errors and token refresh
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired or invalid
    // But skip refresh logic for public endpoints (login/register failures should not trigger refresh)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a public endpoint - if so, don't try to refresh
      const publicEndpoints = ['/auth/register', '/auth/login', '/auth/refresh', '/health'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => originalRequest.url?.includes(endpoint)) || originalRequest.url === '/';
      
      if (isPublicEndpoint) {
        if (__DEV__) {
          const errorData = error.response?.data?.error || error.response?.data?.message || error.response?.data || 'Unknown error';
          const errorMsg = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData;
          console.log(`❌ Auth error on ${originalRequest.url}: ${errorMsg}`);
        }
        // For public endpoints, just reject the error (e.g., invalid credentials)
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Dynamically import to avoid circular dependency
        const { authApi } = await import('./authApi');
        const response = await authApi.refresh();
        
        isRefreshing = false;
        onRefreshed(response.accessToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        
        // Refresh failed - clear tokens and redirect to login
        const { clearAuthTokens } = await import('../utils/tokenManager');
        await clearAuthTokens();
        
        if (__DEV__) {
          console.log('❌ Token refresh failed, user needs to login again');
        }
        
        // This error will be caught by the UI and should trigger navigation to login
        return Promise.reject(new Error('SESSION_EXPIRED'));
      }
    }

    // Log errors in development
    if (__DEV__ && error.response) {
      const status = error.response.status;
      const url = originalRequest?.url || 'unknown';
      const errorData = error.response.data?.error || error.response.data?.message || error.response.data || 'Unknown error';
      const errorMsg = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData;
      console.log(`❌ API Error ${status} on ${url}: ${errorMsg}`);
    }

    // Handle other errors (400, 403, 409, 500, etc.) - just pass them through
    return Promise.reject(error);
  }
);

export const userApi = {
  // Create a new user
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await api.post('/users/create', data);
    return response.data;
  },

  // Get user's total spending
  getTotalSpent: async (userId: string): Promise<number> => {
    const response = await api.get(`/users/${userId}/totalSpent`);
    return response.data.totalSpent;
  },

  // Trigger email parsing for user
  updateReceipts: async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/update-receipts`);
  },

  // Debug user's emails
  debugEmails: async (userId: string): Promise<any> => {
    const response = await api.get(`/users/${userId}/debug/emails`);
    return response.data;
  },
};

export const csvApi = {
  // Import CSV file
  importCsv: async (userId: string, csvFile: File): Promise<CSVImportResponse> => {
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('userId', userId);

    const response = await api.post('/csv/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const databaseApi = {
  // Get all users
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/database/users');
    return response.data;
  },

  // Get database statistics
  getStats: async (): Promise<DatabaseStats> => {
    const response = await api.get('/database/stats');
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/database/users/${userId}`);
  },
};

export const receiptApi = {
  // Get receipts with pagination
  getReceipts: async (limit = 20, offset = 0): Promise<PaginationResponse<Receipt>> => {
    const response = await api.get(`/receipts?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

export const validationApi = {
  // Get user summary
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    const response = await api.get(`/validation/user/${userId}/summary`);
    return response.data;
  },
};

export default api;
