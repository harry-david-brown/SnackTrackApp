import React, { createContext, useCallback, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@services/authApi';
import {
  AppUser,
  AuthSessionResponse,
  RegisterResponse,
  LoginResponse,
  MicrosoftLoginResponse,
} from '@/types/api';
import { 
  getUserData, 
  getUserId, 
  isAuthenticated as checkIsAuthenticated,
  clearAuthTokens,
  getAuthTokenSnapshot,
  storeAuthTokens,
  getRefreshToken,
  updateStoredUserData,
} from '@utils/tokenManager';
import { setSentryUser, clearSentryUser } from '@utils/sentry';
import { logger } from '@utils/logger';
import { UUID_REGEX, DEFAULT_USER_VALUES } from '@/constants';
import { UserContextType, initialState } from './userTypes';
import { userReducer } from './userReducer';
import { toDomainError } from '@utils/domainError';
import { registerSessionExpiredHandler } from '@services/authSessionCoordinator';
import { authFailureMessage } from '@features/auth/contracts';
import { clearUserBoundDeviceState } from '@utils/userBoundLocalState';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId } from '@utils/notificationInstallation';

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// UUID validation function
const isValidUUID = (uuid: string): boolean => {
  return UUID_REGEX.test(uuid);
};

// User provider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const queryClient = useQueryClient();
  const interactiveAuthVersion = useRef(0);

  const clearUserStorage = useCallback(async () => {
    try {
      await clearAuthTokens();
    } catch {
      // Local cleanup remains best-effort; auth state is still cleared below.
    }
  }, []);

  const appUserFromSession = useCallback((response: AuthSessionResponse): AppUser => ({
    id: response.user.id,
    email: response.user.email,
    createdAt: response.user.createdAt,
    emailVerified: response.user.emailVerified,
    totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT,
    receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
  }), []);

  const establishSession = useCallback(async (response: AuthSessionResponse): Promise<void> => {
    await storeAuthTokens(
      response.accessToken,
      response.refreshToken,
      response.userId,
      response.user,
    );
    dispatch({ type: 'SET_USER', payload: appUserFromSession(response) });
    setSentryUser(response.userId, response.email);
  }, [appUserFromSession]);

  // Load user data from storage on app start
  useEffect(() => {
    void loadUserFromStorage(interactiveAuthVersion.current);
  }, []);

  useEffect(() => registerSessionExpiredHandler(async () => {
    const currentSession = await getAuthTokenSnapshot();
    if (currentSession.refreshToken) return;
    clearSentryUser();
    queryClient.clear();
    dispatch({ type: 'LOGOUT' });
  }), [queryClient]);

  // Clear storage if user ID is not a valid UUID
  useEffect(() => {
    if (state.user && !isValidUUID(state.user.id)) {
      logger.warn('Invalid UUID detected, clearing storage...');
      clearUserStorage();
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [clearUserStorage, state.user]);

  const loadUserFromStorage = async (restoreVersion: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Check if user has JWT tokens (new auth system)
      const isAuth = await checkIsAuthenticated();
      
      if (isAuth) {
        // Load user from new auth system
        const [userData, userId] = await Promise.all([
          getUserData(),
          getUserId(),
        ]);

        if (userData && userId) {
          // Validate session
          try {
            const isValid = await authApi.validateSession();
            if (interactiveAuthVersion.current !== restoreVersion) return;
            if (!isValid) {
              await clearAuthTokens();
              if (interactiveAuthVersion.current !== restoreVersion) return;
              dispatch({ type: 'SET_USER', payload: null });
              return;
            }
            // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
            // the full summary which includes totalSpent. This avoids a redundant API call.
            const userWithSpending: AppUser = {
              ...userData,
              emailVerified: userData.emailVerified,
              totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT, // Will be updated when analytics loads
              receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
            };
            
            dispatch({ type: 'SET_USER', payload: userWithSpending });
          } catch (error: unknown) {
            if (interactiveAuthVersion.current !== restoreVersion) return;
            // A temporary network/provider outage must not destroy a locally valid session.
            const userWithSpending: AppUser = {
              ...userData,
              emailVerified: userData.emailVerified,
              totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT,
              receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
            };
            dispatch({ type: 'SET_USER', payload: userWithSpending });
            dispatch({ type: 'SET_ERROR', payload: toDomainError(error).message });
          }
        } else {
          if (interactiveAuthVersion.current !== restoreVersion) return;
          dispatch({ type: 'SET_USER', payload: null });
        }
      } else {
        if (interactiveAuthVersion.current !== restoreVersion) return;
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch {
      if (interactiveAuthVersion.current !== restoreVersion) return;
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
    }
  };

  const register = async (email: string, password: string): Promise<RegisterResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Register with the new auth API
      const response = await authApi.register({ email, password });

      await establishSession(response);

      logger.debug('[UserContext] User registered and set:', {
        userId: response.userId,
        isAuthenticated: true, // Will be set by reducer
      });
      
      logger.info('User registered successfully', { userId: response.userId });
      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      const errorMessage = authFailureMessage(domainError, 'register');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Login with the new auth API
      const response = await authApi.login({ email, password });

      await establishSession(response);
      
      logger.info('User logged in successfully', { userId: response.userId });
      
      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      const errorMessage = authFailureMessage(domainError, 'login');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };



  const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await authApi.googleLogin(idToken);

      await establishSession(response);

      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      dispatch({ type: 'SET_ERROR', payload: authFailureMessage(domainError, 'provider') });
      throw error;
    }
  };

  const loginWithApple = async (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }): Promise<LoginResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Validate inputs before making API call
      if (!identityToken || typeof identityToken !== 'string') {
        throw new Error('Invalid identity token provided');
      }

      const response = await authApi.appleLogin(identityToken, user);

      await establishSession(response);

      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      const errorMessage = authFailureMessage(domainError, 'provider');
      // Don't set error state for user cancellation
      if (domainError.code !== 'ERR_REQUEST_CANCELED' && domainError.code !== 'ERR_CANCELED') {
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
      
      throw error;
    }
  };

  const loginWithMicrosoft = async (
    identityToken: string,
    attemptToken: string,
  ): Promise<MicrosoftLoginResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      const response = await authApi.microsoftLogin(identityToken, attemptToken);
      if (response.status === 'authenticated') {
        await establishSession(response.session);
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      dispatch({ type: 'SET_ERROR', payload: authFailureMessage(domainError, 'provider') });
      throw error;
    }
  };

  const confirmMicrosoftLoginEmail = async (
    attemptToken: string,
    email: string,
    code: string,
  ): Promise<LoginResponse> => {
    interactiveAuthVersion.current += 1;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      const response = await authApi.confirmMicrosoftVerificationEmail(
        attemptToken,
        email,
        code,
      );
      await establishSession(response);
      return response;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      dispatch({ type: 'SET_ERROR', payload: authFailureMessage(domainError, 'provider') });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await notificationDeviceApi.unregister(await getNotificationInstallationId()).catch(() => undefined);
      // Call backend logout endpoint to invalidate refresh token
      await authApi.logout();
      
      // Clear local storage
      await clearUserStorage();
      
      // Clear Sentry user context
      clearSentryUser();
      queryClient.clear();
      
      dispatch({ type: 'LOGOUT' });
    } catch {
      // Still dispatch logout even if API call fails
      await clearUserStorage();
      
      // Clear Sentry user context
      clearSentryUser();
      queryClient.clear();
      
      dispatch({ type: 'LOGOUT' });
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!state.user) throw new Error('No authenticated account to delete');
    const userId = state.user.id;
    const refreshToken = await getRefreshToken();
    // No local mutation occurs before this authoritative server operation succeeds.
    await authApi.deleteAccount(refreshToken ?? undefined);
    await Promise.all([clearUserBoundDeviceState(userId), clearUserStorage()]);
    clearSentryUser();
    queryClient.clear();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const markEmailVerified = async (): Promise<void> => {
    if (!state.user) return;
    const verifiedUser = { ...state.user, emailVerified: true };
    dispatch({
      type: 'UPDATE_USER_DATA',
      payload: { emailVerified: true },
    });
    try {
      await updateStoredUserData(verifiedUser);
    } catch (error) {
      logger.warn('Email verification succeeded but the local user snapshot was not updated', {
        error: toDomainError(error).message,
      });
    }
  };

  const value: UserContextType = {
    state,
    register,
    login,
    loginWithGoogle,
    loginWithApple,
    loginWithMicrosoft,
    confirmMicrosoftLoginEmail,
    logout,
    deleteAccount,
    clearError,
    markEmailVerified,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
