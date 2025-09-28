// Mock API service for testing without backend
// This simulates the API responses for development

import { 
  User, 
  AppUser, 
  CreateUserRequest, 
  CreateUserResponse, 
  CSVImportResponse, 
  UserSummary 
} from '../types/api';

const MOCK_DELAY = 1500; // Simulate network delay

// Mock delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user data storage
let mockUsers: AppUser[] = [];
let mockReceipts: any[] = [];

export const mockUserApi = {
  // Create a new user
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    await delay(MOCK_DELAY);
    
    const newUser: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      receiptCount: 0,
    };
    
    mockUsers.push(newUser);
    
    return {
      userId: newUser.id,
      message: 'User created successfully!',
    };
  },

  // Get user's total spending
  getTotalSpent: async (userId: string): Promise<number> => {
    await delay(500);
    
    const user = mockUsers.find(u => u.id === userId);
    return user?.totalSpent || 0;
  },

  // Update receipts (mock implementation)
  updateReceipts: async (userId: string): Promise<void> => {
    await delay(1000);
    console.log(`Mock: Updated receipts for user ${userId}`);
  },

  // Debug emails (mock implementation)
  debugEmails: async (userId: string): Promise<any> => {
    await delay(500);
    return {
      userId,
      emailCount: 0,
      message: 'Mock email debugging',
    };
  },
};

export const mockCsvApi = {
  // Import CSV file
  importCsv: async (userId: string, csvFile: File): Promise<CSVImportResponse> => {
    await delay(MOCK_DELAY);
    
    // Simulate processing the CSV
    const receiptsImported = Math.floor(Math.random() * 50) + 10; // 10-60 receipts
    const totalSpent = Math.floor(Math.random() * 2000) + 500; // $500-$2500
    
    // Update user data
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex].totalSpent += totalSpent;
      mockUsers[userIndex].receiptCount += receiptsImported;
    }
    
    // Add mock receipts
    for (let i = 0; i < receiptsImported; i++) {
      mockReceipts.push({
        id: `receipt_${Date.now()}_${i}`,
        userId,
        restaurantName: `Restaurant ${i + 1}`,
        amountSpent: Math.floor(Math.random() * 50) + 10,
        orderDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    
    return {
      success: true,
      receiptsImported,
      message: `Successfully imported ${receiptsImported} receipts!`,
    };
  },
};

export const mockValidationApi = {
  // Get user summary
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    await delay(500);
    
    const user = mockUsers.find(u => u.id === userId);
    const userReceipts = mockReceipts.filter(r => r.userId === userId);
    
    // Calculate top restaurants
    const restaurantCounts: { [key: string]: { count: number; totalSpent: number } } = {};
    userReceipts.forEach(receipt => {
      const name = receipt.restaurantName;
      if (!restaurantCounts[name]) {
        restaurantCounts[name] = { count: 0, totalSpent: 0 };
      }
      restaurantCounts[name].count++;
      restaurantCounts[name].totalSpent += receipt.amountSpent;
    });
    
    const topRestaurants = Object.entries(restaurantCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
    
    return {
      userId,
      totalSpent: user?.totalSpent || 0,
      totalReceipts: user?.receiptCount || 0,
      averageOrderValue: user?.receiptCount ? (user.totalSpent / user.receiptCount) : 0,
      topRestaurants,
      monthlyBreakdown: [
        { month: '2024-01', totalSpent: 150, receiptCount: 5 },
        { month: '2024-02', totalSpent: 200, receiptCount: 7 },
        { month: '2024-03', totalSpent: 180, receiptCount: 6 },
      ],
      refundedReceipts: 0,
      dataQuality: {
        issues: [],
        recommendations: ['Consider uploading more recent data for better insights'],
      },
    };
  },
};

// Helper function to reset mock data (for testing)
export const resetMockData = () => {
  mockUsers = [];
  mockReceipts = [];
};

// Helper function to get mock user by email
export const getMockUserByEmail = (email: string): AppUser | undefined => {
  return mockUsers.find(u => u.email === email);
};

export default {
  mockUserApi,
  mockCsvApi,
  mockValidationApi,
  resetMockData,
  getMockUserByEmail,
};
