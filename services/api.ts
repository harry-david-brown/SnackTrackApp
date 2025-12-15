import axios from 'axios';
import { getConfig } from '../config/env';
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

// Get validated API URL from environment configuration
// This will throw an error if EXPO_PUBLIC_API_URL is not set
const config = getConfig();
const API_BASE_URL = config.apiUrl;

// Log the API URL and environment in development for debugging
if (__DEV__) {
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('🔧 App Environment:', config.appEnv);
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
    const publicEndpoints = ['/auth/register', '/auth/login', '/auth/google', '/auth/apple', '/auth/refresh', '/health'];
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
      const publicEndpoints = ['/auth/register', '/auth/login', '/auth/google', '/auth/apple', '/auth/refresh', '/health'];
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

    // Report server errors (5xx) to Sentry - these indicate backend issues
    if (error.response && error.response.status >= 500) {
      const { captureException } = await import('../utils/sentry');
      const apiError = new Error(`API Server Error: ${error.response.status} ${originalRequest?.url || 'unknown'}`);
      captureException(apiError, {
        statusCode: error.response.status,
        url: originalRequest?.url,
        method: originalRequest?.method,
        responseData: error.response.data,
      });
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

// Note: Named "csvApi" for historical reasons, but handles both ZIP and CSV files
// Backend endpoint /csv/import accepts both file types
export const csvApi = {
  // Import ZIP or CSV file (backend auto-detects and processes accordingly)
  importCsv: async (userId: string, csvFile: File): Promise<CSVImportResponse> => {
    const formData = new FormData();
    formData.append('csvFile', csvFile); // Field name stays 'csvFile' for backend compatibility
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
  // Note: Backend uses page-based pagination (1-indexed), not offset
  getReceipts: async (userId: string, limit = 20, offset = 0): Promise<PaginationResponse<Receipt>> => {
    const page = Math.floor(offset / limit) + 1; // Convert offset to page number (1-based)
    const response = await api.get(`/receipts?userId=${userId}&limit=${limit}&page=${page}`);
    
    // Parse items if they come as JSON strings
    const data = response.data;
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((receipt: any, idx: number) => {
        if (__DEV__ && idx === 0) {
          console.log('🔍 Raw receipt items type:', typeof receipt.items);
          console.log('🔍 Raw receipt items:', receipt.items);
        }
        
        // Parse items if it's a string
        if (receipt.items && typeof receipt.items === 'string') {
          try {
            receipt.items = JSON.parse(receipt.items);
            if (__DEV__ && idx === 0) {
              console.log('✅ Parsed items:', receipt.items);
            }
          } catch (error) {
            console.error('❌ Error parsing receipt items:', error);
            receipt.items = [];
          }
        }
        
        // Ensure items is an array
        if (!Array.isArray(receipt.items)) {
          if (__DEV__) {
            console.warn('⚠️ Items is not an array, converting:', receipt.items);
          }
          receipt.items = [];
        }
        
        // Ensure each item has the correct structure
        if (Array.isArray(receipt.items)) {
          receipt.items = receipt.items.map((item: any) => {
            // If item is a string, try to parse it
            if (typeof item === 'string') {
              try {
                return JSON.parse(item);
              } catch {
                return { name: item, quantity: 1, price: 0 };
              }
            }
            // If item is already an object, ensure it has required properties
            return {
              name: item?.name || 'Unknown item',
              quantity: typeof item?.quantity === 'number' ? item.quantity : 1,
              price: typeof item?.price === 'number' ? item.price : 0
            };
          });
        }
        
        // Ensure id field is preserved (backend may return it as 'id' or it might be missing)
        // Map snake_case fields to camelCase if needed
        const receiptId = receipt.id || receipt._id;
        
        const mappedReceipt: any = {
          ...receipt,
          id: receiptId || `receipt-${idx}`, // Ensure id exists (fallback for debugging)
          userId: receipt.userId || receipt.user_id,
          restaurantName: receipt.restaurantName || receipt.restaurant_name,
          orderDate: receipt.orderDate || receipt.order_date,
          amountSpent: receipt.amountSpent || receipt.amount_spent,
          dataSource: receipt.dataSource || receipt.data_source,
          receiptType: receipt.receiptType || receipt.receipt_type,
          createdAt: receipt.createdAt || receipt.created_at || new Date().toISOString(),
        };
        
        // Only warn if ID is truly missing (not just using fallback)
        if (!receiptId && __DEV__ && idx === 0) {
          console.warn('⚠️ Some receipts may be missing IDs from backend');
        }
        
        return mappedReceipt;
      });
    }
    
    return data;
  },
};

export const validationApi = {
  // Get user summary
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    const response = await api.get(`/users/${userId}/summary`);
    return response.data;
  },
};

export default api;
