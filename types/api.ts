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
  success: boolean;
  receiptsImported: number;
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
