import { analyticsApi, normalizeUserSummary } from '../../services/analyticsApi';
import api from '../../services/api';
import { createAppQueryClient } from '../../lib/queryClient';
import { analyticsKeys } from '../../lib/queryKeys';

jest.mock('../../services/api');
jest.mock('../../utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn((userId: string) => Promise.resolve(userId)),
}));

const userId = '123e4567-e89b-12d3-a456-426614174000';
const response = {
  user: { id: userId },
  statistics: {
    totalSpent: 1000,
    totalReceipts: 10,
    averageSpent: 100,
    topRestaurants: [{ name: 'Restaurant 1', count: 5, total: 500 }],
    monthlyBreakdown: { '2025-01': { total: 500, count: 5 } },
  },
  validation: { refundedReceipts: 0, issues: [] },
};

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
});
