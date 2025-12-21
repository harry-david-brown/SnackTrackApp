import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  VerifyPasswordResetCodeRequest,
  VerifyPasswordResetCodeResponse,
  CompletePasswordResetRequest,
  CompletePasswordResetResponse,
  SendVerificationEmailRequest,
  SendVerificationEmailResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
  DeleteAccountResponse,
} from '../types/api';
import {
  storeAuthTokens,
  getRefreshToken,
  updateAccessToken,
  clearAuthTokens,
  isTokenExpired,
  getAccessToken,
} from '../utils/tokenManager';
import { deduplicateRequest } from '../utils/requestDeduplication';

/**
 * Authentication API service
 */
export const authApi = {
  /**
   * Register a new user with email and password
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', data);
      
      // Store tokens and user data
      await storeAuthTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.userId,
        response.data.user
      );
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Login existing user with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', data);

      // Store tokens and user data
      await storeAuthTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.userId,
        response.data.user
      );

      return response.data;
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Login with Google ID Token
   */
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    try {
      console.log('Sending Google Login request to API...');
      const response = await api.post<LoginResponse>('/auth/google', { idToken });
      console.log('API Response received:', response.status);
      
      // Store tokens and user data
      await storeAuthTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.userId,
        response.data.user
      );
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Login with Apple Identity Token
   */
  appleLogin: async (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }): Promise<LoginResponse> => {
    try {
      // Validate identityToken exists and is a string
      if (!identityToken || typeof identityToken !== 'string') {
        throw new Error('Invalid identity token: token is missing or not a string');
      }

      // Validate token format (basic JWT structure: header.payload.signature)
      const tokenParts = identityToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format: token must be a valid JWT');
      }

      // Validate token is not empty
      if (tokenParts.some(part => !part || part.length === 0)) {
        throw new Error('Invalid token format: token parts cannot be empty');
      }

      // Log request details (without exposing full token)
      if (__DEV__) {
        console.log('🍎 Sending Apple Login request to API...');
        console.log('📋 Token length:', identityToken.length);
        console.log('📋 Token preview:', identityToken.substring(0, 20) + '...');
        console.log('👤 User data:', user ? { email: user.email, hasName: !!user.name } : 'none');
      }

      const requestPayload = { identityToken, user };
      const response = await api.post<LoginResponse>('/auth/apple', requestPayload);
      
      if (__DEV__) {
        console.log('✅ API Response received:', response.status);
      }

      // Store tokens and user data
      await storeAuthTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.userId,
        response.data.user
      );

      return response.data;
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (__DEV__) {
        console.error('❌ Apple Login API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.message || error.message,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * Refresh the access token using refresh token
   */
  refresh: async (): Promise<RefreshTokenResponse> => {
    try {
      const refreshToken = await getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken,
      });
      
      // Update stored tokens
      await updateAccessToken(
        response.data.accessToken,
        response.data.refreshToken
      );
      
      if (__DEV__) {
        console.log('✅ Token refreshed successfully');
      }
      
      return response.data;
    } catch (error: any) {
      // If refresh fails, clear all tokens (user needs to login again)
      await clearAuthTokens();
      
      throw error;
    }
  },

  /**
   * Logout user and invalidate refresh token
   */
  logout: async (): Promise<LogoutResponse> => {
    try {
      const refreshToken = await getRefreshToken();
      
      if (!refreshToken) {
        // No token to logout, just clear local storage
        await clearAuthTokens();
        return { success: true, message: 'Logged out successfully' };
      }
      
      const response = await api.post<LogoutResponse>('/auth/logout', {
        refreshToken,
      });
      
      // Clear local tokens
      await clearAuthTokens();
      
      if (__DEV__) {
        console.log('✅ User logged out successfully');
      }
      
      return response.data;
    } catch (error: any) {
      // Even if logout fails on server, clear local tokens
      await clearAuthTokens();
      
      // Don't throw error, logout should always succeed locally
      return { success: true, message: 'Logged out locally' };
    }
  },

  /**
   * Get a valid access token (refreshes if needed)
   */
  getValidToken: async (): Promise<string | null> => {
    try {
      // Check if token needs refresh
      const expired = await isTokenExpired();
      
      if (expired) {
        if (__DEV__) {
          console.log('🔄 Token expired, refreshing...');
        }
        await authApi.refresh();
      }
      
      return await getAccessToken();
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if the current session is valid
   */
  validateSession: async (): Promise<boolean> => {
    return deduplicateRequest(
      'GET',
      '/auth/validate',
      async () => {
    try {
      const token = await authApi.getValidToken();
      return !!token;
    } catch (error) {
      return false;
    }
      }
    );
  },

  /**
   * Request password reset code
   */
  requestPasswordReset: async (
    data: RequestPasswordResetRequest
  ): Promise<RequestPasswordResetResponse> => {
    const response = await api.post<RequestPasswordResetResponse>('/auth/password/reset/request', data);
    return response.data;
  },

  /**
   * Verify password reset code (OTP)
   */
  verifyPasswordResetCode: async (
    data: VerifyPasswordResetCodeRequest
  ): Promise<VerifyPasswordResetCodeResponse> => {
    const response = await api.post<VerifyPasswordResetCodeResponse>('/auth/password/reset/verify', data);
    return response.data;
  },

  /**
   * Complete password reset with new password
   */
  completePasswordReset: async (
    data: CompletePasswordResetRequest
  ): Promise<CompletePasswordResetResponse> => {
    const response = await api.post<CompletePasswordResetResponse>('/auth/password/reset/complete', data);
    return response.data;
  },

  /**
   * Trigger verification email
   */
  sendVerificationEmail: async (
    data: SendVerificationEmailRequest
  ): Promise<SendVerificationEmailResponse> => {
    const response = await api.post<SendVerificationEmailResponse>('/auth/email/verify/send', data);
    return response.data;
  },

  /**
   * Verify email with OTP
   */
  verifyEmailCode: async (
    data: VerifyEmailCodeRequest
  ): Promise<VerifyEmailCodeResponse> => {
    const response = await api.post<VerifyEmailCodeResponse>('/auth/email/verify/confirm', data);
    return response.data;
  },

  /**
   * Delete user account permanently
   * This will delete all user data including receipts, OAuth accounts, and user record
   */
  deleteAccount: async (refreshToken?: string): Promise<DeleteAccountResponse> => {
    try {
      // If refreshToken is not provided, try to get it from storage
      const tokenToUse = refreshToken || await getRefreshToken();
      
      const response = await api.delete<DeleteAccountResponse>('/auth/delete-account', {
        data: tokenToUse ? { refreshToken: tokenToUse } : {},
      });
      
      // Clear local tokens after successful deletion
      await clearAuthTokens();
      
      if (__DEV__) {
        console.log('✅ Account deleted successfully');
      }
      
      return response.data;
    } catch (error: any) {
      // Even if deletion fails, clear local tokens for security
      await clearAuthTokens();
      throw error;
    }
  },
};

export default authApi;

