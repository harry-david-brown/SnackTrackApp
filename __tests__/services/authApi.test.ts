/**
 * Authentication API Unit Tests
 * Tests for the auth API service
 */

import { authApi } from '../../services/authApi';
import api from '../../services/api';
import * as tokenManager from '../../utils/tokenManager';

// Mock the API client
jest.mock('../services/api');

// Mock token manager
jest.mock('../utils/tokenManager');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('should register a new user and store tokens', async () => {
      const mockResponse = {
        data: {
          userId: 'test-user-id',
          email: 'test@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            createdAt: '2025-01-01',
          },
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (tokenManager.storeAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.register({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(tokenManager.storeAuthTokens).toHaveBeenCalledWith(
        'access-token',
        'refresh-token',
        'test-user-id',
        mockResponse.data.user
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if registration fails', async () => {
      const error = new Error('Registration failed');
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        authApi.register({ email: 'test@example.com', password: 'Password123' })
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should login user and store tokens', async () => {
      const mockResponse = {
        data: {
          userId: 'test-user-id',
          email: 'test@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            createdAt: '2025-01-01',
          },
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (tokenManager.storeAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(tokenManager.storeAuthTokens).toHaveBeenCalledWith(
        'access-token',
        'refresh-token',
        'test-user-id',
        mockResponse.data.user
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if login fails', async () => {
      const error = new Error('Invalid credentials');
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        authApi.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('old-refresh-token');
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (tokenManager.updateAccessToken as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.refresh();

      expect(tokenManager.getRefreshToken).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(tokenManager.updateAccessToken).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if no refresh token available', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);

      await expect(authApi.refresh()).rejects.toThrow('No refresh token available');
    });

    it('should clear tokens if refresh fails', async () => {
      const error = new Error('Refresh failed');
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('old-refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(error);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(authApi.refresh()).rejects.toThrow('Refresh failed');
      expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear tokens', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Logged out',
        },
      };

      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'refresh-token',
      });
      expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should clear tokens even if API call fails', async () => {
      const error = new Error('Logout failed');
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(error);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.logout();

      expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Logged out locally',
      });
    });

    it('should handle logout when no refresh token exists', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.logout();

      expect(api.post).not.toHaveBeenCalled();
      expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('getValidToken', () => {
    it('should return token without refresh if not expired', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValueOnce('valid-token');

      const result = await authApi.getValidToken();

      expect(result).toBe('valid-token');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('should refresh token if expired', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(true);
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (tokenManager.updateAccessToken as jest.Mock).mockResolvedValueOnce(undefined);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValueOnce('new-access-token');

      const result = await authApi.getValidToken();

      expect(result).toBe('new-access-token');
      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token',
      });
    });

    it('should return null if refresh fails', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(true);
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.getValidToken();

      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should return true if valid token exists', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValueOnce('valid-token');

      const result = await authApi.validateSession();

      expect(result).toBe(true);
    });

    it('should return false if no valid token', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(false);
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValueOnce(null);

      const result = await authApi.validateSession();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      // Force getValidToken to throw an error
      (tokenManager.isTokenExpired as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Token check failed');
      });

      const result = await authApi.validateSession();

      expect(result).toBe(false);
    });
  });

  describe('password reset + email verification', () => {
    it('requests password reset code', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'sent', expiresIn: 60 },
      });

      const response = await authApi.requestPasswordReset({ email: 'test@example.com' });

      expect(api.post).toHaveBeenCalledWith('/auth/password/reset/request', {
        email: 'test@example.com',
      });
      expect(response).toEqual({ success: true, message: 'sent', expiresIn: 60 });
    });

    it('verifies password reset code', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'valid', expiresIn: 300 },
      });

      const response = await authApi.verifyPasswordResetCode({
        email: 'test@example.com',
        code: '123456',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/password/reset/verify', {
        email: 'test@example.com',
        code: '123456',
      });
      expect(response).toEqual({ success: true, message: 'valid', expiresIn: 300 });
    });

    it('completes password reset', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'updated' },
      });

      const response = await authApi.completePasswordReset({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'Password123',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/password/reset/complete', {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'Password123',
      });
      expect(response).toEqual({ success: true, message: 'updated' });
    });

    it('sends verification email', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, expiresIn: 60 },
      });

      const response = await authApi.sendVerificationEmail({ email: 'test@example.com' });

      expect(api.post).toHaveBeenCalledWith('/auth/email/verify/send', {
        email: 'test@example.com',
      });
      expect(response).toEqual({ success: true, expiresIn: 60 });
    });

    it('verifies email code', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'verified' },
      });

      const response = await authApi.verifyEmailCode({ email: 'test@example.com', code: '654321' });

      expect(api.post).toHaveBeenCalledWith('/auth/email/verify/confirm', {
        email: 'test@example.com',
        code: '654321',
      });
      expect(response).toEqual({ success: true, message: 'verified' });
    });
  });
});

