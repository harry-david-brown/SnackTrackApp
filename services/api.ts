import axios from 'axios';
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

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
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
