import api from './api';
import { DashboardInsight, UserSummary, WrappedAnalytics } from '../types/api';
import { validateAndAuthorizeUserId } from '../utils/securityValidation';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value as UnknownRecord;
};

const asNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value;
};

const asString = (value: unknown, field: string) => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const normalizeUserSummary = (value: unknown, includeWrapped = false): UserSummary => {
  const root = asRecord(value, 'root');
  const user = asRecord(root.user, 'user');
  const statistics = asRecord(root.statistics, 'statistics');
  const validation = asRecord(root.validation, 'validation');
  const restaurants = Array.isArray(statistics.topRestaurants) ? statistics.topRestaurants : [];
  const months = asRecord(statistics.monthlyBreakdown ?? {}, 'statistics.monthlyBreakdown');

  const summary: UserSummary = {
    userId: asString(user.id, 'user.id'),
    totalSpent: asNumber(statistics.totalSpent, 'statistics.totalSpent'),
    totalReceipts: asNumber(statistics.totalReceipts, 'statistics.totalReceipts'),
    averageOrderValue: asNumber(statistics.averageSpent, 'statistics.averageSpent'),
    topRestaurants: restaurants.map((item, index) => {
      const restaurant = asRecord(item, `statistics.topRestaurants.${index}`);
      return {
        name: asString(restaurant.name, `statistics.topRestaurants.${index}.name`),
        count: asNumber(restaurant.count, `statistics.topRestaurants.${index}.count`),
        totalSpent: asNumber(restaurant.total, `statistics.topRestaurants.${index}.total`),
      };
    }),
    monthlyBreakdown: Object.entries(months)
      .map(([month, item]) => {
        const monthly = asRecord(item, `statistics.monthlyBreakdown.${month}`);
        return {
          month,
          totalSpent: asNumber(monthly.total, `statistics.monthlyBreakdown.${month}.total`),
          receiptCount: asNumber(monthly.count, `statistics.monthlyBreakdown.${month}.count`),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month)),
    refundedReceipts: asNumber(validation.refundedReceipts, 'validation.refundedReceipts'),
    dataQuality: {
      issues: asStringArray(validation.issues),
      recommendations: [
        'Consider uploading more recent data for better insights',
        'Review any refunded receipts for accuracy',
      ],
    },
    dashboardInsights: Array.isArray(root.dashboardInsights)
      ? root.dashboardInsights.filter((item): item is DashboardInsight => Boolean(item && typeof item === 'object'))
      : [],
  };

  if (includeWrapped && root.wrappedAnalytics) {
    asRecord(root.wrappedAnalytics, 'wrappedAnalytics');
    summary.wrappedAnalytics = root.wrappedAnalytics as WrappedAnalytics;
  }
  return summary;
};

export const analyticsApi = {
  /**
   * Get user summary with analytics data
   * @param userId - The user ID to get analytics for
   * @param includeWrapped - Whether to include wrapped analytics (Spotify Wrapped-style insights)
   * @returns Promise resolving to UserSummary with analytics data
   * @throws {Error} If API request fails
   */
  getUserSummary: async (userId: string, includeWrapped: boolean = false): Promise<UserSummary> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    const params = includeWrapped ? '?includeWrapped=true' : '';
    const response = await api.get(`/users/${validatedUserId}/summary${params}`);
    return normalizeUserSummary(response.data, includeWrapped);
  },

};

export default analyticsApi;
