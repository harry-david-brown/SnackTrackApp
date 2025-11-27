// API Types - matches the backend API exactly

export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerified?: boolean;
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
    emailVerified?: boolean;
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
    emailVerified?: boolean;
  };
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  expiresIn: number;
  attemptLimit?: number;
}

export interface VerifyPasswordResetCodeRequest {
  email: string;
  code: string;
}

export interface VerifyPasswordResetCodeResponse {
  success: boolean;
  message: string;
  expiresIn: number;
}

export interface CompletePasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface CompletePasswordResetResponse {
  success: boolean;
  message: string;
}

export interface SendVerificationEmailRequest {
  email: string;
}

export interface SendVerificationEmailResponse {
  success: boolean;
  expiresIn: number;
  message?: string;
}

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface VerifyEmailCodeResponse {
  success: boolean;
  message: string;
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

// Wrapped Analytics Types (Spotify Wrapped-style)
export interface WrappedAnalytics {
  shame: {
    lateNightOrders?: {
      count: number;
      totalSpent: number;
      latestOrder: string;
      worstOffender: {
        restaurant: string;
        time: string;
        amount: number;
        items: string[];
      };
    };
    laziestDay?: {
      date: string;
      dayOfWeek: string;
      orderCount: number;
      totalSpent: number;
      restaurants: string[];
      message: string;
    };
    longestStreak?: {
      days: number;
      startDate: string;
      endDate: string;
      totalSpent: number;
      message: string;
    };
    singleItemOrders?: {
      count: number;
      totalSpent: number;
      averageAmount: number;
      message: string;
      mostCommon: string;
    };
    chainDependency?: {
      worstOffender: string;
      orderCount: number;
      totalSpent: number;
      percentage: number;
      message: string;
      allChains: {
        name: string;
        count: number;
        percentage: number;
      }[];
    };
  };
  flex: {
    mostExpensiveOrder?: {
      amount: number;
      restaurant: string;
      date: string;
      items: string[];
      message: string;
    };
    coffeeAddiction?: {
      orderCount: number;
      totalSpent: number;
      averagePrice: number;
      mostOrdered: string;
      message: string;
    };
    nightOwl?: {
      percentage: number;
      count: number;
      totalSpent: number;
      latestOrder: string;
      message: string;
    };
  };
  comparative: {
    spentThisYear?: {
      totalSpent: number;
      year: number;
      orderCount: number;
      averagePerOrder: number;
      message: string;
    };
    couldHaveBought?: {
      totalSpent: number;
      comparisons: {
        item: string;
        quantity: number;
        message: string;
      }[];
    };
    missedInvestment?: {
      amountSpent: number;
      firstOrderDate: string;
      daysElapsed: number;
      sp500Return: number;
      wouldBeWorth: number;
      missedGains: number;
      message: string;
    };
    costPerMeal?: {
      deliveryAverage: number;
      groceryEstimate: number;
      difference: number;
      annualWaste: number;
      message: string;
    };
  };
  patterns: {
    peakHungerHour?: {
      hour: number;
      hourDisplay: string;
      orderCount: number;
      percentageOfTotal: number;
      message: string;
    };
    weekendWarrior?: {
      weekendOrders: number;
      weekdayOrders: number;
      weekendSpending: number;
      weekdaySpending: number;
      ratio: number;
      message: string;
    };
  };
}

export interface UserSummary {
  userId: string;
  totalSpent: number;
  totalReceipts: number;
  averageOrderValue: number;
  topRestaurants: {
    name: string;
    count: number;
    totalSpent: number;
  }[];
  monthlyBreakdown: {
    month: string;
    totalSpent: number;
    receiptCount: number;
  }[];
  refundedReceipts: number;
  dataQuality: {
    issues: string[];
    recommendations: string[];
  };
  wrappedAnalytics?: WrappedAnalytics; // Optional: only included when includeWrapped=true
}

export interface DatabaseStats {
  database: {
    totalUsers: number;
    totalReceipts: number;
    totalSpent: number;
    averageOrderValue: number;
  };
  tableSizes: {
    table: string;
    size: string;
  }[];
  recentActivity: {
    table: string;
    recentCount: number;
  }[];
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
