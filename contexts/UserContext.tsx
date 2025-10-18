import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../services/api';
import { mockUserApi } from '../services/mockApi';
import { authApi } from '../services/authApi';
import { analyticsApi } from '../services/analyticsApi';
import { User, AppUser, UserSummary } from '../types/api';
import { 
  getUserData, 
  getUserId, 
  isAuthenticated as checkIsAuthenticated,
  clearAuthTokens,
  AUTH_STORAGE_KEYS 
} from '../utils/tokenManager';
import { cacheAnalytics, getCachedAnalytics, clearAnalyticsCache } from '../utils/offlineCache';

// User state interface
interface UserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  analytics: UserSummary | null;
  analyticsLoading: boolean;
}

// User actions
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<AppUser> }
  | { type: 'SET_ANALYTICS'; payload: UserSummary | null }
  | { type: 'SET_ANALYTICS_LOADING'; payload: boolean };

// User context interface
interface UserContextType {
  state: UserState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  loadAnalytics: (includeWrapped?: boolean) => Promise<void>;
  setAnalytics: (analytics: UserSummary) => void;
  clearAnalytics: () => void;
  clearError: () => void;
}

// Initial state
const initialState: UserState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  analytics: null,
  analyticsLoading: false,
};

// User reducer
const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
        analytics: null,
        analyticsLoading: false,
      };
    case 'UPDATE_USER_DATA':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'SET_ANALYTICS':
      return {
        ...state,
        analytics: action.payload,
      };
    case 'SET_ANALYTICS_LOADING':
      return {
        ...state,
        analyticsLoading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Legacy storage keys (for backward compatibility during migration)
const LEGACY_STORAGE_KEYS = {
  USER_DATA: '@snacktrack_user_data',
  USER_ID: '@snacktrack_user_id',
};

// UUID validation function
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// User provider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load user data from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Clear storage if user ID is not a valid UUID
  useEffect(() => {
    if (state.user && !isValidUUID(state.user.id)) {
      console.log('Invalid UUID detected, clearing storage...');
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
              totalSpent: 0, // Will be updated when dashboard loads
              receiptCount: 0,
            };
            
            dispatch({ type: 'SET_USER', payload: userWithSpending });
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
        AsyncStorage.removeItem('@snacktrack_analytics_cache'),
        AsyncStorage.removeItem('@snacktrack_last_sync'),
      ]);
    } catch (error) {
      // Silently fail - we tried our best to clear storage
    }
  };

  const register = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Register with the new auth API
      const response = await authApi.register({ email, password });
      
      // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
      // the full summary which includes totalSpent. This avoids a redundant API call.
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt,
        totalSpent: 0, // Will be updated when dashboard loads
        receiptCount: 0,
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      if (__DEV__) {
        console.log('✅ User registered successfully:', email);
      }
      
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

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Login with the new auth API
      const response = await authApi.login({ email, password });
      
      // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
      // the full summary which includes totalSpent. This avoids a redundant API call.
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt,
        totalSpent: 0, // Will be updated when dashboard loads
        receiptCount: 0,
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      if (__DEV__) {
        console.log('✅ User logged in successfully:', email);
      }
      
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

  const logout = async () => {
    try {
      // Call backend logout endpoint to invalidate refresh token
      await authApi.logout();
      
      // Clear local storage
      await clearUserStorage();
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      // Still dispatch logout even if API call fails
      await clearUserStorage();
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

  const setAnalytics = (analytics: UserSummary) => {
    dispatch({ type: 'SET_ANALYTICS', payload: analytics });
    // Update user data from analytics
    if (state.user && (analytics.totalSpent !== state.user.totalSpent || analytics.totalReceipts !== state.user.receiptCount)) {
      dispatch({ type: 'UPDATE_USER_DATA', payload: { 
        totalSpent: analytics.totalSpent,
        receiptCount: analytics.totalReceipts 
      }});
    }
    // Cache it
    if (state.user) {
      cacheAnalytics(state.user.id, analytics);
    }
  };

  const loadAnalytics = async (includeWrapped: boolean = false) => {
    if (!state.user) return;

    try {
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
      
      // Fetch analytics from API
      const summary = await analyticsApi.getUserSummary(state.user.id, includeWrapped);
      dispatch({ type: 'SET_ANALYTICS', payload: summary });
      
      // Cache for offline use
      await cacheAnalytics(state.user.id, summary);
      
      // Update user's totalSpent in context from the summary data
      if (summary.totalSpent !== state.user.totalSpent) {
        dispatch({ type: 'UPDATE_USER_DATA', payload: { 
          totalSpent: summary.totalSpent,
          receiptCount: summary.totalReceipts 
        }});
      }
      
    } catch (error: any) {
      // Try to use cached data on error
      const cached = await getCachedAnalytics(state.user.id);
      if (cached) {
        dispatch({ type: 'SET_ANALYTICS', payload: cached });
      }
      // Don't set error here - let screens handle it individually
    } finally {
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
    }
  };

  const value: UserContextType = {
    state,
    register,
    login,
    logout,
    refreshUserData,
    loadAnalytics,
    setAnalytics,
    clearAnalytics,
    clearError,
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
