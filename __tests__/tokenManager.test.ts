/**
 * Token Manager Unit Tests
 * Tests for token storage and management utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storeAuthTokens,
  getAccessToken,
  getRefreshToken,
  getUserId,
  getUserData,
  isTokenExpired,
  updateAccessToken,
  clearAuthTokens,
  isAuthenticated,
  AUTH_STORAGE_KEYS,
  TOKEN_EXPIRY,
} from '../utils/tokenManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

describe('Token Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('storeAuthTokens', () => {
    it('should store all auth tokens and user data', async () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';
      const userId = 'test-user-id';
      const userData = { id: userId, email: 'test@example.com', createdAt: '2025-01-01' };

      await storeAuthTokens(accessToken, refreshToken, userId, userData);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(5);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
        accessToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.REFRESH_TOKEN,
        refreshToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.USER_ID,
        userId
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT,
        expect.any(String)
      );
    });

    it('should throw error if storage fails', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(
        storeAuthTokens('token', 'refresh', 'id', {})
      ).rejects.toThrow('Failed to store authentication tokens');
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve access token from storage', async () => {
      const token = 'test-access-token';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      const result = await getAccessToken();

      expect(result).toBe(token);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    });

    it('should return null if no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getAccessToken();

      expect(result).toBeNull();
    });

    it('should return null and log error if storage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getAccessToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting access token:', expect.any(Error));
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve refresh token from storage', async () => {
      const token = 'test-refresh-token';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      const result = await getRefreshToken();

      expect(result).toBe(token);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('should return null and log error if storage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getRefreshToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting refresh token:', expect.any(Error));
    });
  });

  describe('getUserId', () => {
    it('should retrieve user ID from storage', async () => {
      const userId = 'test-user-id';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(userId);

      const result = await getUserId();

      expect(result).toBe(userId);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER_ID);
    });

    it('should return null and log error if storage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getUserId();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting user ID:', expect.any(Error));
    });
  });

  describe('getUserData', () => {
    it('should retrieve and parse user data from storage', async () => {
      const userData = { id: '123', email: 'test@example.com' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(userData));

      const result = await getUserData();

      expect(result).toEqual(userData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER_DATA);
    });

    it('should return null if no user data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getUserData();

      expect(result).toBeNull();
    });

    it('should return null and log error if storage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getUserData();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting user data:', expect.any(Error));
    });
  });

  describe('isTokenExpired', () => {
    it('should return false if token is not expired', async () => {
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(futureTime.toString());

      const result = await isTokenExpired();

      expect(result).toBe(false);
    });

    it('should return true if token expires within threshold', async () => {
      const soonTime = Date.now() + 2 * 60 * 1000; // 2 minutes from now
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(soonTime.toString());

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true if token is already expired', async () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(pastTime.toString());

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true if no expiry time exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });
  });

  describe('updateAccessToken', () => {
    it('should update access token and expiry', async () => {
      const newToken = 'new-access-token';

      await updateAccessToken(newToken);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
        newToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT,
        expect.any(String)
      );
    });

    it('should also update refresh token if provided', async () => {
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      await updateAccessToken(newAccessToken, newRefreshToken);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.REFRESH_TOKEN,
        newRefreshToken
      );
    });
  });

  describe('clearAuthTokens', () => {
    it('should remove all auth-related data from storage', async () => {
      await clearAuthTokens();

      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(5);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER_ID);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER_DATA);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT);
    });

    it('should not throw error if clearing fails', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Remove error'));

      await expect(clearAuthTokens()).resolves.not.toThrow();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if both tokens exist', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false if access token is missing', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('refresh-token');

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false if refresh token is missing', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce(null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false if both tokens are missing', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false and log error if checking fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await isAuthenticated();

      expect(result).toBe(false);
      // The error is actually logged by getAccessToken, not isAuthenticated
      expect(console.error).toHaveBeenCalledWith('Error getting access token:', expect.any(Error));
    });
  });

  describe('Constants', () => {
    it('should export correct storage keys', () => {
      expect(AUTH_STORAGE_KEYS.ACCESS_TOKEN).toBe('@snacktrack_auth_token');
      expect(AUTH_STORAGE_KEYS.REFRESH_TOKEN).toBe('@snacktrack_refresh_token');
      expect(AUTH_STORAGE_KEYS.USER_DATA).toBe('@snacktrack_user_data');
      expect(AUTH_STORAGE_KEYS.USER_ID).toBe('@snacktrack_user_id');
      expect(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT).toBe('@snacktrack_token_expires');
    });

    it('should export correct token expiry times', () => {
      expect(TOKEN_EXPIRY.ACCESS_TOKEN).toBe(15 * 60 * 1000); // 15 minutes
      expect(TOKEN_EXPIRY.REFRESH_TOKEN).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(TOKEN_EXPIRY.REFRESH_THRESHOLD).toBe(5 * 60 * 1000); // 5 minutes
    });
  });
});

