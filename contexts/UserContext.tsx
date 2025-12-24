import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../services/api';
import { mockUserApi } from '../services/mockApi';
import { authApi } from '../services/authApi';
import { analyticsApi } from '../services/analyticsApi';
import { AppUser, UserSummary, RegisterResponse, LoginResponse } from '../types/api';
import { 
  getUserData, 
  getUserId, 
  isAuthenticated as checkIsAuthenticated,
  clearAuthTokens,
  AUTH_STORAGE_KEYS 
} from '../utils/tokenManager';
import { cacheAnalytics, getCachedAnalytics, clearAnalyticsCache } from '../utils/offlineCache';
import { setSentryUser, clearSentryUser } from '../utils/sentry';
import { loadUserAnalytics } from '../utils/userAnalytics';
import { logger } from '../utils/logger';
import { UUID_REGEX, DEFAULT_USER_VALUES, STORAGE_KEYS } from '../constants';
import { UserState, UserAction, UserContextType, initialState } from './userTypes';
import { userReducer } from './userReducer';

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Legacy storage keys (for backward compatibility during migration)
const LEGACY_STORAGE_KEYS = {
  USER_DATA: STORAGE_KEYS.LEGACY_USER_DATA,
  USER_ID: STORAGE_KEYS.LEGACY_USER_ID,
};

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

  // Ref to prevent duplicate analytics loads
  const loadingAnalyticsRef = useRef<Promise<UserSummary | null> | null>(null);

  // Load user data from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Clear storage if user ID is not a valid UUID
  useEffect(() => {
    if (state.user && !isValidUUID(state.user.id)) {
      logger.warn('Invalid UUID detected, clearing storage...');
      clearUserStorage();
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [state.user]);

  const loadUserFromStorage = async () => {
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
          const isValid = await authApi.validateSession();
          
          if (isValid) {
            // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
            // the full summary which includes totalSpent. This avoids a redundant API call.
            const userWithSpending: AppUser = {
              ...userData,
              emailVerified: userData.emailVerified ?? false,
              totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT, // Will be updated when analytics loads
              receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
            };
            
            dispatch({ type: 'SET_USER', payload: userWithSpending });
            
            // Load analytics using extracted utility function
            loadUserAnalytics({
              userId,
              user: userWithSpending,
              dispatch,
              loadingRef: loadingAnalyticsRef,
              preloadWrapped: true,
            }).catch(() => {
              // Silently fail - analytics loading is non-critical for app start
            });
          } else {
            // Session invalid, clear and force re-login
            await clearAuthTokens();
            dispatch({ type: 'SET_USER', payload: null });
          }
        } else {
          dispatch({ type: 'SET_USER', payload: null });
        }
      } else {
        // Check for legacy user data (old system without passwords)
        const [legacyUserData, legacyUserId] = await Promise.all([
          AsyncStorage.getItem(LEGACY_STORAGE_KEYS.USER_DATA),
          AsyncStorage.getItem(LEGACY_STORAGE_KEYS.USER_ID),
        ]);

        if (legacyUserData && legacyUserId) {
          // Legacy user exists - they need to re-register with a password
          await clearUserStorage();
          dispatch({ type: 'SET_USER', payload: null });
          dispatch({ type: 'SET_ERROR', payload: 'Please create a new account with a password' });
        } else {
          dispatch({ type: 'SET_USER', payload: null });
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
    }
  };

  const clearUserStorage = async () => {
    try {
      // Clear both new auth tokens and legacy storage
      await Promise.all([
        clearAuthTokens(),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEYS.USER_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.ANALYTICS_CACHE),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC),
      ]);
    } catch (error) {
      // Silently fail - we tried our best to clear storage
    }
  };

  const register = async (email: string, password: string): Promise<RegisterResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Register with the new auth API
      const response = await authApi.register({ email, password });

      // Debug: Log response structure in development
      logger.debug('Registration response:', JSON.stringify(response, null, 2));

      // Validate response structure
      if (!response.user) {
        logger.error('Registration response missing user object:', response);
        throw new Error('Invalid registration response from server');
      }
      
      // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
      // the full summary which includes totalSpent. This avoids a redundant API call.
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt || new Date().toISOString(),
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT, // Will be updated when dashboard loads
        receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
      };

      dispatch({ type: 'SET_USER', payload: user });

      logger.debug('[UserContext] User registered and set:', {
        userId: user.id,
        email: user.email,
        isAuthenticated: true, // Will be set by reducer
      });
      
      // Set Sentry user context for error tracking
      setSentryUser(response.userId, response.email);
      
      logger.info('User registered successfully:', email);
      return response;
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      if (error.response?.data) {
        // The error might be in different formats
        const errorData = error.response.data.error || error.response.data.message || error.response.data;
        const apiError = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        
        if (apiError.toLowerCase().includes('already exists') || apiError.toLowerCase().includes('duplicate')) {
          errorMessage = 'An account with this email already exists. Please login instead.';
        } else if (apiError.toLowerCase().includes('password')) {
          errorMessage = 'Password must be at least 8 characters with 1 uppercase letter and 1 number.';
        } else {
          errorMessage = apiError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Login with the new auth API
      const response = await authApi.login({ email, password });

      // Debug: Log response structure in development
      logger.debug('Login response:', JSON.stringify(response, null, 2));

      // Validate response structure
      if (!response.user) {
        logger.error('Login response missing user object:', response);
        throw new Error('Invalid login response from server');
      }
      
      // Immediately load analytics to avoid showing $0 total spent
      // This ensures the dashboard has data as soon as it renders
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt || new Date().toISOString(),
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT, // Will be updated when dashboard loads
        receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      // Set Sentry user context for error tracking
      setSentryUser(response.userId, response.email);
      
      // Start loading analytics immediately (non-blocking) so dashboard has data ready
      // This prevents "Total Spent" from popping in after dashboard renders
      // Use response.userId directly since state.user might not be updated yet
      loadUserAnalytics({
        userId: response.userId,
        user,
        dispatch,
        loadingRef: loadingAnalyticsRef,
        preloadWrapped: true,
      }).catch(() => {
        // Don't fail login if analytics fails - user can still use the app
      });
      
      logger.info('User logged in successfully:', email);
      
      return response;
    } catch (error: any) {
      let errorMessage = 'Failed to login';
      
      if (error.response?.data) {
        // The error might be in different formats
        const errorData = error.response.data.error || error.response.data.message || error.response.data;
        const apiError = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        
        if (apiError.toLowerCase().includes('invalid') || apiError.toLowerCase().includes('credentials') || apiError.toLowerCase().includes('password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else {
          errorMessage = apiError;
        }
      } else if (error.message === 'SESSION_EXPIRED') {
        errorMessage = 'Your session has expired. Please login again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };



  const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await authApi.googleLogin(idToken);

      logger.debug('Google Login response:', JSON.stringify(response, null, 2));

      if (!response.user) {
        throw new Error('Invalid login response from server');
      }

      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt || new Date().toISOString(),
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT,
        receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
      };

      dispatch({ type: 'SET_USER', payload: user });
      setSentryUser(response.userId, response.email);

      // Load analytics using extracted utility function
      loadUserAnalytics({
        userId: response.userId,
        user,
        dispatch,
        loadingRef: loadingAnalyticsRef,
        preloadWrapped: true,
      }).catch(() => {
        // Don't fail login if analytics fails - user can still use the app
      });

      return response;
    } catch (error: any) {
      logger.error('Google Login Error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to login with Google';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const loginWithApple = async (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }): Promise<LoginResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Validate inputs before making API call
      if (!identityToken || typeof identityToken !== 'string') {
        throw new Error('Invalid identity token provided');
      }

      const response = await authApi.appleLogin(identityToken, user);

      logger.debug('Apple Login response:', JSON.stringify(response, null, 2));

      // Validate response structure
      if (!response) {
        throw new Error('No response received from server');
      }

      if (!response.user) {
        throw new Error('Invalid login response from server: missing user data');
      }

      if (!response.userId) {
        throw new Error('Invalid login response from server: missing user ID');
      }

      if (!response.accessToken || !response.refreshToken) {
        throw new Error('Invalid login response from server: missing authentication tokens');
      }

      // Construct user object with defensive defaults
      const appUser: AppUser = {
        id: response.userId,
        email: response.email || user?.email || '', // Fallback to provided email if response doesn't have it
        createdAt: response.user.createdAt || new Date().toISOString(),
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: DEFAULT_USER_VALUES.TOTAL_SPENT,
        receiptCount: DEFAULT_USER_VALUES.RECEIPT_COUNT,
      };

      // Warn if email is missing (shouldn't happen but handle gracefully)
      if (!appUser.email) {
        logger.warn('Apple login succeeded but no email in response or user data');
      }

      dispatch({ type: 'SET_USER', payload: appUser });
      setSentryUser(response.userId, response.email);

      // Load analytics using extracted utility function
      loadUserAnalytics({
        userId: response.userId,
        user: appUser,
        dispatch,
        loadingRef: loadingAnalyticsRef,
        preloadWrapped: true,
      }).catch(() => {
        // Don't fail login if analytics fails - user can still use the app
      });

      return response;
    } catch (error: any) {
      logger.error('Apple Login Error:', error);
      
      let errorMessage = 'Failed to login with Apple';
      
      // Handle network errors
      if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error.response?.data) {
        // The error might be in different formats
        const errorData = error.response.data.error || error.response.data;
        const apiError = typeof errorData === 'string' 
          ? errorData 
          : (errorData.message || JSON.stringify(errorData));
        errorMessage = apiError;
      } else if (error.message === 'SESSION_EXPIRED') {
        errorMessage = 'Your session has expired. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Don't set error state for user cancellation
      if (error.code !== 'ERR_REQUEST_CANCELED' && error.code !== 'ERR_CANCELED') {
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
      
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to invalidate refresh token
      await authApi.logout();
      
      // Clear local storage
      await clearUserStorage();
      
      // Clear Sentry user context
      clearSentryUser();
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      // Still dispatch logout even if API call fails
      await clearUserStorage();
      
      // Clear Sentry user context
      clearSentryUser();
      
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshUserData = async () => {
    if (!state.user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Fetch updated spending data
      const totalSpent = await userApi.getTotalSpent(state.user.id);
      
      // Update user state
      dispatch({ type: 'UPDATE_USER_DATA', payload: { totalSpent } });
      
    } catch (error: any) {
      // Handle session expired
      if (error.message === 'SESSION_EXPIRED') {
        await clearUserStorage();
        dispatch({ type: 'LOGOUT' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh user data' });
      }
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const clearAnalytics = () => {
    dispatch({ type: 'SET_ANALYTICS', payload: null });
    clearAnalyticsCache(); // Also clear from AsyncStorage
  };

  const markEmailVerified = () => {
    if (!state.user) return;
    dispatch({
      type: 'UPDATE_USER_DATA',
      payload: { emailVerified: true },
    });
  };

  const setAnalytics = (analytics: UserSummary) => {
    dispatch({ type: 'SET_ANALYTICS', payload: analytics });
    // Update user data from analytics
    if (state.user && (analytics.totalSpent !== state.user.totalSpent || analytics.totalReceipts !== state.user.receiptCount)) {
      dispatch({
        type: 'UPDATE_USER_DATA', payload: {
        totalSpent: analytics.totalSpent,
        receiptCount: analytics.totalReceipts 
        }
      });
    }
    // Cache it
    if (state.user) {
      cacheAnalytics(state.user.id, analytics);
    }
  };

  const loadAnalytics = async (includeWrapped: boolean = false): Promise<UserSummary | null> => {
    if (!state.user) return null;

    // Prevent duplicate loads
    if (loadingAnalyticsRef.current) {
      return loadingAnalyticsRef.current;
    }

    // Capture user ID and user object to avoid null checks in callbacks
    const userId = state.user.id;
    const currentUser = state.user;

    try {
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
      
      // The deduplication in analyticsApi will handle concurrent calls
      const summaryPromise = analyticsApi.getUserSummary(userId, includeWrapped)
        .then((summary) => {
      dispatch({ type: 'SET_ANALYTICS', payload: summary });
      
      // Cache for offline use
          cacheAnalytics(userId, summary).catch(() => {
            // Silently fail caching - not critical
          });
      
      // Update user's totalSpent in context from the summary data
          if (summary.totalSpent !== currentUser.totalSpent) {
            dispatch({
              type: 'UPDATE_USER_DATA', payload: {
          totalSpent: summary.totalSpent,
          receiptCount: summary.totalReceipts 
              }
            });
      }
      
      // If we loaded without wrapped data and user has data, preload wrapped data in background
      // This ensures Wrapped Journey tab loads instantly when clicked
          if (!includeWrapped && summary.totalReceipts > 0) {
        // Preload wrapped analytics in background (don't await - let it run async)
        analyticsApi.getUserSummary(userId, true)
          .then((wrappedSummary) => {
            // Always update analytics with the wrapped summary (it has all the data)
            dispatch({ type: 'SET_ANALYTICS', payload: wrappedSummary });
            dispatch({
              type: 'UPDATE_USER_DATA',
              payload: {
                totalSpent: wrappedSummary.totalSpent,
                receiptCount: wrappedSummary.totalReceipts,
              },
            });
            cacheAnalytics(userId, wrappedSummary).catch(() => {
              // Silently fail caching - not critical
            });
          })
          .catch(() => {
            // Silently fail wrapped preload - not critical
          });
      }
      
      return summary;
        })
        .catch(async (error: any) => {
          // Try to use cached data on error
          const cached = await getCachedAnalytics(userId);
          if (cached) {
            dispatch({ type: 'SET_ANALYTICS', payload: cached });
            return cached;
          }
          // Don't set error here - let screens handle it individually
          return null;
        })
        .finally(() => {
          loadingAnalyticsRef.current = null;
          dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
        });

      // Store the promise in the ref so concurrent calls can reuse it
      loadingAnalyticsRef.current = summaryPromise;

      return summaryPromise;
    } catch (error: any) {
      loadingAnalyticsRef.current = null;
      // Try to use cached data on error
      const cached = await getCachedAnalytics(userId);
      if (cached) {
        dispatch({ type: 'SET_ANALYTICS', payload: cached });
        return cached;
      }
      // Don't set error here - let screens handle it individually
      return null;
    }
  };

  const value: UserContextType = {
    state,
    register,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    refreshUserData,
    loadAnalytics,
    setAnalytics,
    clearAnalytics,
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
