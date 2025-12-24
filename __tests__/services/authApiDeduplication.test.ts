/**
 * Auth API Deduplication Integration Tests
 * Tests for request deduplication in authApi.validateSession
 */

import { authApi } from '../../services/authApi';
import * as tokenManager from '../../utils/tokenManager';
import { clearPendingRequests } from '../../utils/requestDeduplication';

// Mock token manager
jest.mock('../../utils/tokenManager');

// Mock API client
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
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

describe('Auth API Deduplication - validateSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPendingRequests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateSession', () => {
    it('should deduplicate identical concurrent validateSession calls', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValue(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const promise1 = authApi.validateSession();
      const promise2 = authApi.validateSession();
      const promise3 = authApi.validateSession();

      const results = await Promise.all([promise1, promise2, promise3]);

      // getValidToken should only be called once (deduplicated)
      expect(tokenManager.getAccessToken).toHaveBeenCalledTimes(1);
      expect(tokenManager.isTokenExpired).toHaveBeenCalledTimes(1);

      // All results should be the same
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(true);
    });

    it('should handle errors and allow retry', async () => {
      // First call fails
      (tokenManager.isTokenExpired as jest.Mock).mockRejectedValueOnce(new Error('Token check failed'));
      
      // Second call succeeds
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValueOnce('valid-token');

      // First request should return false
      const result1 = await authApi.validateSession();
      expect(result1).toBe(false);

      // Second request should succeed (not deduplicated from failed request)
      const result2 = await authApi.validateSession();
      expect(result2).toBe(true);

      expect(tokenManager.getAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid sequential validateSession calls', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValue(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('valid-token');

      // Make 10 rapid requests
      const promises = Array.from({ length: 10 }, () => 
        authApi.validateSession()
      );

      const results = await Promise.all(promises);

      // Should only call getValidToken once due to deduplication
      expect(tokenManager.getAccessToken).toHaveBeenCalledTimes(1);
      expect(tokenManager.isTokenExpired).toHaveBeenCalledTimes(1);

      // All results should be true
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should return false when token is null', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValue(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue(null);

      const promise1 = authApi.validateSession();
      const promise2 = authApi.validateSession();

      const results = await Promise.all([promise1, promise2]);

      expect(tokenManager.getAccessToken).toHaveBeenCalledTimes(1);
      expect(results[0]).toBe(false);
      expect(results[1]).toBe(false);
    });

    it('should handle token refresh scenario', async () => {
      // Token is expired, needs refresh
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValue(true);
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue('refresh-token');
      
      // Mock the refresh API call
      const api = require('../../services/api').default;
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      (tokenManager.updateAccessToken as jest.Mock).mockResolvedValue(undefined);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('new-access-token');

      const promise1 = authApi.validateSession();
      const promise2 = authApi.validateSession();

      const results = await Promise.all([promise1, promise2]);

      // Should deduplicate the validateSession calls
      // getValidToken will handle the refresh internally
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
    });
  });
});

