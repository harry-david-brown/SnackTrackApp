import type { HistoricalInvestmentResult } from './historicalInvestment';
// API Types - matches the backend API exactly

export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  customizations?: string[];
  configuredLineTotal?: number;
  recordedPrice?: number;
  inferred?: boolean;
}

export enum DataSource {
  CSV = 'csv',
  EMAIL = 'email',
  API = 'api',
}

export enum ReceiptType {
  UBER_EATS = 'uber_eats',
  DOORDASH = 'doordash',
  GRUBHUB = 'grubhub',
  POSTMATES = 'postmates',
  CAVIAR = 'caviar',
  UNKNOWN = 'unknown',
}

export interface Receipt {
  orderDay?: string | null;
  orderOutcome?: import('./receiptOutcome').ReceiptOrderOutcome;
  reconciliation?: { status: 'merged' | 'standalone' | 'unresolved'; method: string; reason?: string };
  sources?: DataSource[];
  itemSubtotal?: number;
  checkoutDifference?: {
    status: 'available' | 'unavailable';
    amount: number | null;
    emailTotal: number;
    exportSubtotal: number | null;
    receiptSubtotal?: number;
    subtotalDiscrepancy?: number;
    currencyCode: string;
    subtotalBasis: 'export_item_subtotal' | 'reconstructed' | 'receipt_reconciled' | 'unavailable';
    emailSourceMessageId?: string;
    emailRevisionAt?: string;
    reason?: 'missing_export_subtotal' | 'unknown_currency' | 'currency_conflict';
  };
  currencyCode?: string;
  amountBasis?: string;
  evidenceSummary?: string;
  resolutionVersion?: number;
  id: string;
  userId: string;
  restaurantName: string | null;
  orderDate: string | null;
  amountSpent: number;
  items: ReceiptItem[];
  dataSource: DataSource;
  receiptType: ReceiptType;
}

// Authentication Types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthSessionResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
    emailVerified: boolean;
  };
}

export type RegisterResponse = AuthSessionResponse;

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = AuthSessionResponse;

export interface MicrosoftLoginAttemptResponse {
  attemptToken: string;
  nonce: string;
  expiresIn: number;
}

export type MicrosoftLoginResponse =
  | { status: 'authenticated'; session: AuthSessionResponse }
  | {
      status: 'email_verification_required';
      attemptToken: string;
      suggestedEmail?: string;
    };

export interface MicrosoftVerificationCodeResponse {
  success: true;
  expiresIn: number;
  resendAfter: number;
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

export interface DeleteAccountResponse {
  status: 'pending' | 'deleted';
  success: boolean;
  message: string;
}

export interface DeleteReceiptsResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
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

// Wrapped Analytics Types (Spotify Wrapped-style)
export interface PercentileStanding {
  /** The eligible account count for this metric; policy 3 compares separate groups. */
  sampleSize?: number;
  /** Share of ranked users strictly below this user, 0–100. */
  percentile: number;
  /** "Top X%" framing: 100 − percentile, clamped to [1, 100]. */
  topPercent: number;
}

export interface WrappedPercentiles {
  policyVersion?: 3;
  /** Largest returned comparison group; each standing has its own size in policy 3. */
  sampleSize: number;
  currencyCode?: string;
  methodology?: string;
  totalSpent?: PercentileStanding;
  orderCount?: PercentileStanding;
  nightOwl?: PercentileStanding;
}

export interface WrappedCoverage {
  orderCount: number;
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
  dataSources: string[];
  hasExportData: boolean;
}

export interface WrappedSpending {
  totalSpent: number | null;
  spending?: import('./orderMetrics').CurrencyOrderMetrics[];
}

export interface WrappedAnalytics {
  recap?: import('./recap').RecapStoryCollection;
  behaviorPolicyVersion?: 1;
  orderMetrics?: import('./orderMetrics').OrderMetrics;
  deliveryDayRanking?: import('./orderMetrics').DeliveryDayRanking;
  currencyCode?: string;
  totalsByCurrency?: Record<string, { total: number; count: number }>;
  /** Receipt coverage represented by this canonical analytics payload. */
  coverage: WrappedCoverage;
  /** Cross-user standings; omitted when the comparison pool is too small. */
  percentiles?: WrappedPercentiles;
  shame: {
    lateNightOrders?: WrappedSpending & {
      count: number;
      latestOrder: string;
      worstOffender?: {
        restaurant: string;
        time: string;
        amount: number;
        items: string[];
      };
    };
    laziestDay?: WrappedSpending & {
      date: string;
      dayOfWeek: string;
      orderCount: number;
      restaurants: string[];
      message: string;
    };
    longestStreak?: WrappedSpending & {
      days: number;
      startDate: string;
      endDate: string;
      message: string;
    };
    singleItemOrders?: WrappedSpending & {
      count: number;
      averageAmount: number;
      message: string;
      mostCommon: string;
    };
    chainDependency?: WrappedSpending & {
      worstOffender: string;
      orderCount: number;
      percentage: number;
      message: string;
      allChains: {
        name: string;
        count: number;
        spent: number | null;
        spending?: import('./orderMetrics').CurrencyOrderMetrics[];
      }[];
    };
  };
  flex: {
    mostExpensiveOrder?: {
      amount: number;
      currencyCode?: string;
      includesEstimates?: boolean;
      restaurant: string;
      date: string;
      items: {
        name: string;
        price: number;
      }[];
      message: string;
    };
    coffeeAddiction?: {
      orderCount: number;
      totalSpent: number | null;
      averagePrice: number | null;
      mostOrdered: string;
      message: string;
      disclaimer?: string;
    };
    nightOwl?: WrappedSpending & {
      percentage: number;
      count: number;
      latestOrder: string;
      message: string;
    };
  };
  comparative: {
    spentThisYear?: WrappedSpending & {
      year: number;
      orderCount: number;
      averagePerOrder: number | null;
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
    historicalInvestment?: HistoricalInvestmentResult;
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
      totalDeliveryFees: number;
      averageDeliveryFee: number;
      averageDeliveryFeePerMeal: number;
      totalOrders: number;
      message: string;
    };
    deliveryFeeTrend?: {
      basis?: 'unadjusted_deliveries';
      currency: string;
      coveredOrderCount: number;
      coverageStart: string;
      coverageEnd: string;
      earliestPeriod: { quarter: string; orderCount: number; averageDeliveryFee: number; averageServiceFee: number; averageCompanyFees: number };
      latestPeriod: { quarter: string; orderCount: number; averageDeliveryFee: number; averageServiceFee: number; averageCompanyFees: number };
      deliveryFeeChangePercent: number;
      companyFeeChangePercent: number;
      trend: 'increased' | 'decreased' | 'flat';
      series: { quarter: string; orderCount: number; averageDeliveryFee: number; averageServiceFee: number; averageCompanyFees: number }[];
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
      weekendSpending: number | null;
      weekdaySpending: number | null;
      weekendCosts?: import('./orderMetrics').CurrencyOrderMetrics[];
      weekdayCosts?: import('./orderMetrics').CurrencyOrderMetrics[];
      ratio: number | null;
      ratioBasis?: 'deliveries_per_day';
      message: string;
    };
    deliveryWaits?: {
      totalMinutes: number;
      averageMinutes: number;
      totalOrders: number;
      longestWait?: {
        minutes: number;
        restaurant: string;
        amount: number | null;
        currencyCode?: string;
        message: string;
      };
      fastestDelivery?: {
        minutes: number;
        restaurant: string;
      };
    };
  };
}

export interface UserSummary {
  normalizedSpend?: { amount: number | null; currencyCode: string; approximate: boolean };
  orderMetrics?: import('./orderMetrics').OrderMetrics;
  orderMetricPeriods?: import('./orderMetrics').OrderMetricPeriods;
  unresolvedReceiptCount?: number;
  currencyCode?: string;
  totalsByCurrency?: Record<string, { total: number; count: number }>;
  dailyBreakdown?: Record<string, { total: number; count: number }>;
  amountBasis?: string;
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
    pricedCount?: number;
    averageOrderValue?: number;
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

export type DashboardInsightCategory = 'favorites' | 'habits' | 'extremes' | 'progress';
export type DashboardInsightIcon = 'restaurant' | 'time' | 'calendar' | 'moon' | 'heart' | 'receipt' | 'meal' | 'delivery' | 'lock' | 'repeat' | 'trend' | 'trophy' | 'sparkles';
export type DashboardInsightValueFormat = 'currency' | 'number' | 'percent' | 'minutes' | 'hours' | 'days';
export type DashboardExportProvider = 'uber_eats' | 'doordash';

export interface DashboardInsightMethodology {
  estimated?: boolean;
  sampleSize?: number;
  assumption?: string;
  disclaimer?: string;
}

export interface DashboardInsightPeriod {
  startDate: string;
  endDate?: string;
}

interface DashboardInsightBase {
  historicalInvestment?: HistoricalInvestmentResult;
  currencyCode?: string;
  orderEvidence?: { count: number };
  id: string;
  category: DashboardInsightCategory;
  icon: DashboardInsightIcon;
  eyebrow: string;
  title: string;
  detail?: string;
  methodology?: DashboardInsightMethodology;
  period?: DashboardInsightPeriod;
}

export interface DashboardHeroInsight extends DashboardInsightBase {
  presentation: 'hero';
  value: number;
  valueFormat: DashboardInsightValueFormat;
  headline?: string;
  spendingConcentration?: { orderCount: number };
  busyDay?: {
    date: string;
    spending: { currencyCode: 'CAD' | 'USD' | 'EUR' | 'GBP'; amount: number }[];
  };
}

export interface DashboardComparisonInsight extends DashboardInsightBase {
  presentation: 'comparison';
  comparison: {
    variant?: 'investment';
    current: number;
    previous: number;
    delta: number;
    percentDelta: number | null;
    direction: 'up' | 'down' | 'flat';
    valueFormat: 'currency' | 'number';
    currentLabel: string;
    previousLabel: string;
    driver?: 'frequency' | 'basket' | 'outlier' | 'mixed';
    subject?: {
      kind: 'meal' | 'item';
      name: string;
      restaurant?: string;
      occurrences: number;
    };
  };
}

export interface DashboardRankingInsight extends DashboardInsightBase {
  presentation: 'ranking';
  rows: { label: string; count: number; amount?: number; context?: string }[];
}

export interface DashboardOrderInsight extends DashboardInsightBase {
  presentation: 'order';
  order: { restaurant: string; restaurants?: string[]; amount: number; orderedAt?: string; items: string[] };
}

export interface DashboardTimelineInsight extends DashboardInsightBase {
  presentation: 'timeline';
  events: { label: string; value: string | number; valueFormat?: DashboardInsightValueFormat; detail?: string }[];
}

export interface DashboardYearlyChampionsInsight extends DashboardInsightBase {
  presentation: 'yearly-champions';
  years: { year: number; winners: string[]; orderCount: number; currentYear: boolean }[];
}

export interface DashboardLockedInsight extends DashboardInsightBase {
  presentation: 'locked';
  action: 'open_export';
}

export type DashboardInsight = DashboardHeroInsight | DashboardComparisonInsight | DashboardRankingInsight | DashboardOrderInsight | DashboardTimelineInsight | DashboardYearlyChampionsInsight | DashboardLockedInsight;

export interface DashboardInsightEdition {
  localDate: string;
  timezone: string;
  generatedAt: string;
  nextRefreshAt: string;
  metricVersion: string;
  availableCandidateCount: number;
  partialExportProvider?: DashboardExportProvider;
  insights: DashboardInsight[];
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

export interface ReceiptPage {
  items: Receipt[];
  pageInfo: {
    page: number;
    total: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    nextPage: number | null;
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
