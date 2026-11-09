import api from './api';
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
  MicrosoftLoginAttemptResponse,
  MicrosoftLoginResponse,
  MicrosoftVerificationCodeResponse,
} from '@/types/api';
import {
  clearAuthTokensIfRefreshTokenMatches,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  updateAccessTokenIfRefreshTokenMatches,
} from '@utils/tokenManager';
import { logger } from '@utils/logger';
import { JWT_CONFIG } from '@/constants';
import {
  normalizeAuthSession,
  normalizeAccountDeletion,
  normalizePasswordResetRequest,
  normalizePasswordResetVerification,
  normalizeRefresh,
  normalizeSuccessMessage,
  normalizeVerificationEmail,
  normalizeMicrosoftLoginAttempt,
  normalizeMicrosoftLogin,
  normalizeMicrosoftVerificationCode,
} from './normalizers/authNormalizers';
import { isTerminalSessionError } from '@features/auth/contracts';
import { toDomainError } from '@utils/domainError';
import { ApiClientError, sessionExpiredError } from '@services/api/apiError';
import { notifySessionExpired } from '@services/authSessionCoordinator';

let activeStoredRefresh: {
  readonly refreshToken: string;
  readonly promise: Promise<string>;
} | null = null;

let latestStoredRefresh: {
  readonly previousRefreshToken: string;
  readonly currentRefreshToken: string;
  readonly accessToken: string;
} | null = null;

const refreshSupersededError = (cause?: unknown): ApiClientError => new ApiClientError({
  code: 'SESSION_REFRESH_SUPERSEDED',
  message: 'A newer session replaced this refresh request.',
  kind: 'validation',
  retryable: false,
  cause,
});

/**
 * Authentication API service
 */
export const authApi = {
  /**
   * Register a new user with email and password
   * @param data - Registration data containing email and password
   * @returns Promise resolving to RegisterResponse with user data and tokens
   * @throws {Error} If registration fails (e.g., email already exists, invalid password)
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await api.post<unknown>('/auth/register', data);
      const result = normalizeAuthSession(response.data) as RegisterResponse;
      
      return result;
    } catch (error: unknown) {
      throw error;
    }
  },

  /**
   * Login existing user with email and password
   * @param data - Login credentials (email and password)
   * @returns Promise resolving to LoginResponse with user data and tokens
   * @throws {Error} If login fails (e.g., invalid credentials)
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await api.post<unknown>('/auth/login', data);
      const result = normalizeAuthSession(response.data) as LoginResponse;

      return result;
    } catch (error: unknown) {
      throw error;
    }
  },

  /**
   * Login with Google ID Token (OAuth)
   * @param idToken - Google OAuth ID token from Google Sign-In
   * @returns Promise resolving to LoginResponse with user data and tokens
   * @throws {Error} If Google login fails (e.g., invalid token)
   */
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    try {
      logger.debug('Sending Google Login request to API...');
      const response = await api.post<unknown>('/auth/google', { idToken });
      const result = normalizeAuthSession(response.data) as LoginResponse;
      logger.apiResponse(response.status, '/auth/google');
      
      return result;
    } catch (error: unknown) {
      throw error;
    }
  },

  microsoftLoginAttempt: async (): Promise<MicrosoftLoginAttemptResponse> => {
    const response = await api.post<unknown>('/auth/microsoft/attempt', {});
    return normalizeMicrosoftLoginAttempt(response.data);
  },

  microsoftLogin: async (
    identityToken: string,
    attemptToken: string,
  ): Promise<MicrosoftLoginResponse> => {
    const response = await api.post<unknown>('/auth/microsoft', { identityToken, attemptToken });
    return normalizeMicrosoftLogin(response.data, response.status);
  },

  sendMicrosoftVerificationEmail: async (
    attemptToken: string,
    email: string,
  ): Promise<MicrosoftVerificationCodeResponse> => {
    const response = await api.post<unknown>('/auth/microsoft/email/send', {
      attemptToken,
      email,
    });
    return normalizeMicrosoftVerificationCode(response.data);
  },

  confirmMicrosoftVerificationEmail: async (
    attemptToken: string,
    email: string,
    code: string,
  ): Promise<LoginResponse> => {
    const response = await api.post<unknown>('/auth/microsoft/email/confirm', {
      attemptToken,
      email,
      code,
    });
    return normalizeAuthSession(response.data);
  },

  /**
   * Login with Apple Identity Token (Sign in with Apple)
   * @param identityToken - Apple OAuth identity token from Apple Sign-In
   * @param user - Optional user data from Apple (email, name) - may be null on subsequent logins
   * @returns Promise resolving to LoginResponse with user data and tokens
   * @throws {Error} If Apple login fails (e.g., invalid token format)
   */
  appleLogin: async (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }): Promise<LoginResponse> => {
    try {
      // Validate identityToken exists and is a string
      if (!identityToken || typeof identityToken !== 'string') {
        throw new Error('Invalid identity token: token is missing or not a string');
      }

      // Validate token format (basic JWT structure: header.payload.signature)
      const tokenParts = identityToken.split('.');
      if (tokenParts.length !== JWT_CONFIG.REQUIRED_PARTS) {
        throw new Error('Invalid token format: token must be a valid JWT');
      }

      // Validate token is not empty
      if (tokenParts.some(part => !part || part.length === 0)) {
        throw new Error('Invalid token format: token parts cannot be empty');
      }

      // Log request details (without exposing full token)
      logger.debug('Sending Apple Login request to API...');
      logger.debug('Token length:', identityToken.length);
      logger.debug('Token: [REDACTED]');
      logger.debug('User data:', user ? { email: '[REDACTED]', hasName: !!user.name, hasFirstName: !!user.name?.firstName, hasLastName: !!user.name?.lastName } : 'none');

      const requestPayload = { identityToken, user };
      const response = await api.post<unknown>('/auth/apple', requestPayload);
      const result = normalizeAuthSession(response.data) as LoginResponse;
      
      logger.apiResponse(response.status, '/auth/apple');

      return result;
    } catch (error: unknown) {
      throw error;
    }
  },

  /**
   * Refresh the access token using refresh token
   * Automatically clears tokens if refresh fails
   * @returns Promise resolving to RefreshTokenResponse with new tokens
   * @throws {Error} If refresh fails (e.g., refresh token expired)
   */
  refresh: async (storedRefreshToken?: string): Promise<RefreshTokenResponse> => {
    const refreshToken = storedRefreshToken ?? await getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post<unknown>('/auth/refresh', {
        refreshToken,
      });
    return normalizeRefresh(response.data);
  },

  /**
   * Logout user and invalidate refresh token
   * Always succeeds locally even if server request fails
   * @returns Promise resolving to LogoutResponse indicating success
   */
  logout: async (storedRefreshToken?: string): Promise<LogoutResponse> => {
      const refreshToken = storedRefreshToken ?? await getRefreshToken();
      
      if (!refreshToken) {
        return { success: true, message: 'Logged out successfully' };
      }
      
      const response = await api.post<unknown>('/auth/logout', {
        refreshToken,
      });
      
      logger.debug('User logged out successfully');
      
      return normalizeSuccessMessage(response.data);
  },

  /**
   * Get a valid access token (refreshes if needed)
   * @returns Promise resolving to access token string or null if refresh fails
   */
  getValidToken: async (): Promise<string | null> => {
    try {
      // Check if token needs refresh
      const expired = await isTokenExpired();
      
      if (expired) {
        logger.debug('Token expired, refreshing...');
        await refreshStoredSession();
      }
      
      return await getAccessToken();
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      if (isTerminalSessionError(domainError.code)) return null;
      throw error;
    }
  },

  /**
   * Check if the current session is valid
   * @returns Promise resolving to true if session is valid, false otherwise
   */
  validateSession: async (): Promise<boolean> => {
    try {
      const token = await authApi.getValidToken();
      return !!token;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      if (isTerminalSessionError(domainError.code)) return false;
      throw error;
    }
  },

  /**
   * Request password reset code
   */
  requestPasswordReset: async (
    data: RequestPasswordResetRequest
  ): Promise<RequestPasswordResetResponse> => {
    const response = await api.post<unknown>('/auth/password/reset/request', data);
    return normalizePasswordResetRequest(response.data);
  },

  /**
   * Verify password reset code (OTP)
   */
  verifyPasswordResetCode: async (
    data: VerifyPasswordResetCodeRequest
  ): Promise<VerifyPasswordResetCodeResponse> => {
    const response = await api.post<unknown>('/auth/password/reset/verify', data);
    return normalizePasswordResetVerification(response.data);
  },

  /**
   * Complete password reset with new password
   */
  completePasswordReset: async (
    data: CompletePasswordResetRequest
  ): Promise<CompletePasswordResetResponse> => {
    const response = await api.post<unknown>('/auth/password/reset/complete', data);
    return normalizeSuccessMessage(response.data);
  },

  /**
   * Trigger verification email
   */
  sendVerificationEmail: async (
    data: SendVerificationEmailRequest
  ): Promise<SendVerificationEmailResponse> => {
    const response = await api.post<unknown>('/auth/email/verify/send', data);
    return normalizeVerificationEmail(response.data);
  },

  /**
   * Verify email with OTP
   */
  verifyEmailCode: async (
    data: VerifyEmailCodeRequest
  ): Promise<VerifyEmailCodeResponse> => {
    const response = await api.post<unknown>('/auth/email/verify/confirm', data);
    return normalizeSuccessMessage(response.data);
  },

  /**
   * Delete user account permanently
   * This will delete all user data including receipts, OAuth accounts, and user record
   */
  deleteAccount: async (refreshToken?: string): Promise<DeleteAccountResponse> => {
      const tokenToUse = refreshToken || await getRefreshToken();
      
      const response = await api.delete<unknown>('/auth/delete-account', {
        data: tokenToUse ? { refreshToken: tokenToUse } : {},
      });
      
      return normalizeAccountDeletion(response.data);
  },
};

/**
 * Coordinates every refresh of the locally stored SnackTrack session. Requests
 * sharing a refresh token reuse one rotation, and a late result cannot mutate a
 * newer provider/password login.
 */
export const refreshStoredSession = async (
  expectedRefreshToken?: string | null,
): Promise<string> => {
  const storedRefreshToken = await getRefreshToken();
  if (
    expectedRefreshToken !== undefined
    && storedRefreshToken !== expectedRefreshToken
  ) {
    if (
      expectedRefreshToken
      && latestStoredRefresh?.previousRefreshToken === expectedRefreshToken
      && latestStoredRefresh.currentRefreshToken === storedRefreshToken
    ) {
      return latestStoredRefresh.accessToken;
    }
    throw refreshSupersededError();
  }
  if (!storedRefreshToken) {
    const cleared = await clearAuthTokensIfRefreshTokenMatches(null);
    if (!cleared) throw refreshSupersededError();
    await notifySessionExpired();
    throw sessionExpiredError();
  }

  if (activeStoredRefresh?.refreshToken === storedRefreshToken) {
    return activeStoredRefresh.promise;
  }

  const promise = (async () => {
    try {
      const refreshed = await authApi.refresh(storedRefreshToken);
      const applied = await updateAccessTokenIfRefreshTokenMatches(
        storedRefreshToken,
        refreshed.accessToken,
        refreshed.refreshToken,
      );
      if (!applied) throw refreshSupersededError();
      latestStoredRefresh = {
        previousRefreshToken: storedRefreshToken,
        currentRefreshToken: refreshed.refreshToken,
        accessToken: refreshed.accessToken,
      };
      return refreshed.accessToken;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      if (!isTerminalSessionError(domainError.code)) throw error;

      const cleared = await clearAuthTokensIfRefreshTokenMatches(storedRefreshToken);
      if (!cleared) throw refreshSupersededError(error);
      await notifySessionExpired();
      throw sessionExpiredError(error);
    }
  })();

  activeStoredRefresh = { refreshToken: storedRefreshToken, promise };
  try {
    return await promise;
  } finally {
    if (activeStoredRefresh?.promise === promise) activeStoredRefresh = null;
  }
};

export default authApi;
