/**
 * Analytics API Deduplication Integration Tests
 * Tests for request deduplication in analyticsApi
 */

import { analyticsApi } from '../../services/analyticsApi';
import api from '../../services/api';
import { clearPendingRequests } from '../../utils/requestDeduplication';

// Mock the API client
jest.mock('../../services/api');

// Mock security validation to bypass ownership checks in tests
jest.mock('../../utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn((userId: string) => Promise.resolve(userId)),
}));

// Mock console.log to avoid noise in test output
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

beforeAll(() => {
  (global as any).__DEV__ = true;
  console.log = mockConsoleLog;
});

afterAll(() => {
  console.log = originalConsoleLog;
  delete (global as any).__DEV__;
});

describe('Analytics API Deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPendingRequests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockUserSummary = {
    user: { id: '123e4567-e89b-12d3-a456-426614174000' },
    statistics: {
      totalSpent: 1000,
      totalReceipts: 10,
      averageSpent: 100,
      topRestaurants: [
        { name: 'Restaurant 1', count: 5, total: 500 },
      ],
      monthlyBreakdown: {
        '2025-01': { total: 500, count: 5 },
      },
    },
    validation: {
      refundedReceipts: 0,
      issues: [],
    },
  };

  describe('getUserSummary', () => {
    it('should deduplicate identical concurrent requests', async () => {
      const mockResponse = {
        data: mockUserSummary,
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const promise1 = analyticsApi.getUserSummary(userId, false);
      const promise2 = analyticsApi.getUserSummary(userId, false);
      const promise3 = analyticsApi.getUserSummary(userId, false);

      // All promises should resolve to the same data
      const results = await Promise.all([promise1, promise2, promise3]);

      // API should only be called once
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary`);

      // All results should be the same
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0].userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(results[0].totalSpent).toBe(1000);
    });

    it('should create separate requests for different users', async () => {
      const userId1 = '123e4567-e89b-12d3-a456-426614174000';
      const userId2 = '223e4567-e89b-12d3-a456-426614174001';
      const mockResponse1 = {
        data: { ...mockUserSummary, user: { id: userId1 } },
      };
      const mockResponse2 = {
        data: { ...mockUserSummary, user: { id: userId2 } },
      };

      (api.get as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const promise1 = analyticsApi.getUserSummary(userId1, false);
      const promise2 = analyticsApi.getUserSummary(userId2, false);

      await Promise.all([promise1, promise2]);

      expect(api.get).toHaveBeenCalledTimes(2);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId1}/summary`);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId2}/summary`);
    });

    it('should create separate requests for includeWrapped parameter', async () => {
      const mockResponse1 = { data: mockUserSummary };
      const mockResponse2 = { 
        data: { 
          ...mockUserSummary, 
          wrappedAnalytics: { patterns: {} } 
        } 
      };

      (api.get as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const promise1 = analyticsApi.getUserSummary(userId, false);
      const promise2 = analyticsApi.getUserSummary(userId, true);

      await Promise.all([promise1, promise2]);

      // Should be two separate requests due to different params
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary`);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary?includeWrapped=true`);
    });

    it('should deduplicate requests with same includeWrapped value', async () => {
      const mockResponse = { data: mockUserSummary };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const promise1 = analyticsApi.getUserSummary(userId, true);
      const promise2 = analyticsApi.getUserSummary(userId, true);
      const promise3 = analyticsApi.getUserSummary(userId, true);

      await Promise.all([promise1, promise2, promise3]);

      // Should only be called once
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(`/users/${userId}/summary?includeWrapped=true`);
    });

    it('should handle errors and allow retry', async () => {
      const error = new Error('Network error');
      const mockResponse = { data: mockUserSummary };

      (api.get as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // First request fails
      await expect(analyticsApi.getUserSummary(userId, false)).rejects.toThrow('Network error');

      // Second request should succeed (not deduplicated from failed request)
      const result = await analyticsApi.getUserSummary(userId, false);

      expect(api.get).toHaveBeenCalledTimes(2);
      expect(result.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should handle rapid sequential requests', async () => {
      const mockResponse = { data: mockUserSummary };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Make 10 rapid requests
      const promises = Array.from({ length: 10 }, () => 
        analyticsApi.getUserSummary(userId, false)
      );

      await Promise.all(promises);

      // Should only be called once due to deduplication
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('should transform API response correctly after deduplication', async () => {
      const mockResponse = {
        data: {
          ...mockUserSummary,
          wrappedAnalytics: {
            patterns: {
              peakHungerHour: { hour: 12, hourDisplay: '12pm' },
            },
          },
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const promise1 = analyticsApi.getUserSummary(userId, true);
      const promise2 = analyticsApi.getUserSummary(userId, true);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should have the same transformed data
      expect(result1.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result1.totalSpent).toBe(1000);
      expect(result1.totalReceipts).toBe(10);
      expect(result1.wrappedAnalytics).toBeDefined();
      expect(result1).toEqual(result2);
    });
  });
});

