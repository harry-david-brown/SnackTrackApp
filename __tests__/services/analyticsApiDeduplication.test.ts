import { analyticsApi, normalizeUserSummary } from '@services/analyticsApi';
import api from '@services/api';
import { createAppQueryClient } from '@lib/queryClient';
import { analyticsKeys } from '@lib/queryKeys';
import { contractIds, userSummaryFixture } from '@/__tests__/fixtures/contracts';

jest.mock('@services/api');
jest.mock('@utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn((userId: string) => Promise.resolve(userId)),
}));

const userId = contractIds.user;
const response = userSummaryFixture;

describe('analytics query ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: response });
  });

  it('deduplicates concurrent summary reads in the query cache', async () => {
    const queryClient = createAppQueryClient({ forTests: true });
    const options = {
      queryKey: analyticsKeys.summary(userId),
      queryFn: () => analyticsApi.getUserSummary(userId),
    };

    const results = await Promise.all([
      queryClient.fetchQuery(options),
      queryClient.fetchQuery(options),
      queryClient.fetchQuery(options),
    ]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.totalSpent === 1000)).toBe(true);
    queryClient.clear();
  });

  it('keeps ordinary and wrapped summaries in separate cache entries', async () => {
    const queryClient = createAppQueryClient({ forTests: true });
    await Promise.all([
      queryClient.fetchQuery({
        queryKey: analyticsKeys.summary(userId),
        queryFn: () => analyticsApi.getUserSummary(userId),
      }),
      queryClient.fetchQuery({
        queryKey: analyticsKeys.wrapped(userId),
        queryFn: () => analyticsApi.getUserSummary(userId, true),
      }),
    ]);

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary`);
    expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary?includeWrapped=true`);
    queryClient.clear();
  });

  it('rejects malformed core transport fields at the service boundary', () => {
    expect(() => normalizeUserSummary({
      ...response,
      statistics: { ...response.statistics, totalSpent: '1000' },
    })).toThrow('Invalid analytics response: statistics.totalSpent');
  });

  it('validates wrapped analytics recursively at the service boundary', () => {
    const normalized = normalizeUserSummary({
      ...response,
      wrappedAnalytics: {
        coverage: { orderCount: 10, earliestOrderDate: null, latestOrderDate: null, dataSources: ['email'], hasExportData: false },
        shame: {}, flex: {}, comparative: {}, patterns: {
          peakHungerHour: {
            hour: 18, hourDisplay: '6 PM', orderCount: 4,
            percentageOfTotal: 40, message: 'Dinner time.',
          },
        },
      },
    }, true);

    expect(normalized.wrappedAnalytics?.patterns.peakHungerHour?.hour).toBe(18);
    expect(() => normalizeUserSummary({
      ...response,
      wrappedAnalytics: {
        coverage: { orderCount: 10, earliestOrderDate: null, latestOrderDate: null, dataSources: ['email'], hasExportData: false },
        shame: {}, flex: {}, comparative: {}, patterns: {
          peakHungerHour: {
            hour: '18', hourDisplay: '6 PM', orderCount: 4,
            percentageOfTotal: 40, message: 'Dinner time.',
          },
        },
      },
    }, true)).toThrow('Invalid analytics response: wrappedAnalytics.patterns.peakHungerHour.hour');
  });
});
