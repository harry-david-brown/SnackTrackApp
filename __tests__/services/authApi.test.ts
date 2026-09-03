/**
 * Authentication API Unit Tests
 * Tests for the auth API service
 */

import { authApi } from '@services/authApi';
import api from '@services/api';
import * as tokenManager from '@utils/tokenManager';
import { authSessionFixture } from '@/__tests__/fixtures/contracts';

// Mock the API client
jest.mock('@services/api');

// Mock token manager
jest.mock('@utils/tokenManager');

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
    it('normalizes registration without mutating session storage', async () => {
      const mockResponse = { data: authSessionFixture };

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
      expect(tokenManager.storeAuthTokens).not.toHaveBeenCalled();
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
    it('normalizes login without mutating session storage', async () => {
      const mockResponse = { data: authSessionFixture };

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
      expect(tokenManager.storeAuthTokens).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if login fails', async () => {
      const error = new Error('Invalid credentials');
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        authApi.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects malformed sessions before storing credentials', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          userId: 'test-user-id',
          email: 'test@example.com',
          user: { id: 'test-user-id', email: 'test@example.com', createdAt: '2025-01-01' },
        },
      });

      await expect(authApi.login({ email: 'test@example.com', password: 'Password123' }))
        .rejects.toThrow('Invalid authentication response: session.accessToken');
      expect(tokenManager.storeAuthTokens).not.toHaveBeenCalled();
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
      expect(tokenManager.updateAccessToken).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if no refresh token available', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);

      await expect(authApi.refresh()).rejects.toThrow('No refresh token available');
    });

    it('does not clear tokens when refresh transport fails', async () => {
      const error = new Error('Refresh failed');
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('old-refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(error);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(authApi.refresh()).rejects.toThrow('Refresh failed');
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('Microsoft login', () => {
    it('keeps the attempt token separate from the OpenID nonce', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { attemptToken: 'private-attempt', nonce: 'openid-nonce', expiresIn: 600 },
      });
      await expect(authApi.microsoftLoginAttempt()).resolves.toEqual({
        attemptToken: 'private-attempt',
        nonce: 'openid-nonce',
        expiresIn: 600,
      });
      expect(api.post).toHaveBeenCalledWith('/auth/microsoft/attempt', {});
    });

    it('returns the email challenge without writing a SnackTrack session', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        status: 202,
        data: {
          status: 'email_verification_required',
          attemptToken: 'private-attempt',
          suggestedEmail: 'person@example.com',
        },
      });
      await expect(
        authApi.microsoftLogin('signed-id-token', 'private-attempt'),
      ).resolves.toMatchObject({ status: 'email_verification_required' });
      expect(tokenManager.storeAuthTokens).not.toHaveBeenCalled();
    });

    it('confirms email ownership through the scoped attempt endpoint', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: authSessionFixture });
      await expect(
        authApi.confirmMicrosoftVerificationEmail(
          'private-attempt',
          'person@example.com',
          '123456',
        ),
      ).resolves.toEqual(authSessionFixture);
      expect(api.post).toHaveBeenCalledWith('/auth/microsoft/email/confirm', {
        attemptToken: 'private-attempt',
        email: 'person@example.com',
        code: '123456',
      });
    });
  });

  describe('logout', () => {
    it('requests server logout without mutating local credentials', async () => {
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
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('reports logout transport failure to the session owner', async () => {
      const error = new Error('Logout failed');
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(error);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(authApi.logout()).rejects.toThrow('Logout failed');
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
    });

    it('should handle logout when no refresh token exists', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await authApi.logout();

      expect(api.post).not.toHaveBeenCalled();
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
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

    it('retains credentials and surfaces retryable refresh failures', async () => {
      (tokenManager.isTokenExpired as jest.Mock).mockResolvedValueOnce(true);
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));
      (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(authApi.getValidToken()).rejects.toThrow('Refresh failed');
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
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

    it('surfaces temporary validation failures instead of signing out', async () => {
      // Force getValidToken to throw an error
      (tokenManager.isTokenExpired as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Token check failed');
      });

      await expect(authApi.validateSession()).rejects.toThrow('Token check failed');
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

  describe('account deletion', () => {
    it('does not clear credentials before the authoritative server result', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValueOnce('refresh-token');
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error('deletion failed'));

      await expect(authApi.deleteAccount()).rejects.toThrow('deletion failed');
      expect(api.delete).toHaveBeenCalledWith('/auth/delete-account', {
        data: { refreshToken: 'refresh-token' },
      });
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
    });

    it('normalizes confirmed deletion without owning local session cleanup', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Account deleted successfully' },
      });
      expect(await authApi.deleteAccount('refresh-token')).toEqual({
        success: true,
        message: 'Account deleted successfully',
      });
      expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
    });
  });
});
