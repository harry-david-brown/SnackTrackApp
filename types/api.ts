// API Types - matches the backend API exactly

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export enum DataSource {
  CSV = 'csv',
  EMAIL = 'email'
}

export interface Receipt {
  id: string;
  userId: string;
  restaurantName: string;
  orderDate: string;
  amountSpent: number;
  items: ReceiptItem[];
  dataSource: DataSource;
  createdAt: string;
}

// Authentication Types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Legacy types (deprecated, use auth endpoints)
export interface CreateUserRequest {
  email: string;
}

export interface CreateUserResponse {
  userId: string;
  message: string;
}

export interface CSVImportRequest {
  csvFile: File;
  userId: string;
}

export interface CSVImportResponse {
  success?: boolean;
  importedCount: number;
  totalAmount?: number;
  fileType?: 'csv' | 'zip';
  message: string;
}

export interface UserSummary {
  userId: string;
  totalSpent: number;
  totalReceipts: number;
  averageOrderValue: number;
  topRestaurants: Array<{
    name: string;
    count: number;
    totalSpent: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    totalSpent: number;
    receiptCount: number;
  }>;
  refundedReceipts: number;
  dataQuality: {
    issues: string[];
    recommendations: string[];
  };
}

export interface DatabaseStats {
  database: {
    totalUsers: number;
    totalReceipts: number;
    totalSpent: number;
    averageOrderValue: number;
  };
  tableSizes: Array<{
    table: string;
    size: string;
  }>;
  recentActivity: Array<{
    table: string;
    recentCount: number;
  }>;
  health: {
    status: 'HEALTHY' | 'WARNING' | 'ERROR';
    timestamp: string;
  };
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// Frontend-specific types
export interface AppUser extends User {
  totalSpent: number;
  receiptCount: number;
}

export interface SpendingInsight {
  period: string;
  total: number;
  count: number;
  topRestaurant: string;
  trend: 'up' | 'down' | 'stable';
}
