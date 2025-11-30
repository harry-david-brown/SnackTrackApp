import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (email: string, password: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  loadAnalytics: (includeWrapped?: boolean) => Promise<UserSummary | null>;
  setAnalytics: (analytics: UserSummary) => void;
  clearAnalytics: () => void;
  clearError: () => void;
  markEmailVerified: () => void;
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
              emailVerified: userData.emailVerified ?? false,
              totalSpent: 0, // Will be updated when analytics loads
              receiptCount: 0,
            };
            
            dispatch({ type: 'SET_USER', payload: userWithSpending });
            
            // Start loading analytics immediately so dashboard has data ready
            // This is non-blocking - navigation will wait for it to complete
            dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
            analyticsApi.getUserSummary(userId, false)
              .then((summary) => {
                dispatch({ type: 'SET_ANALYTICS', payload: summary });
                cacheAnalytics(userId, summary).catch(() => {
                  // Silently fail caching - not critical
                });
                
                // Update user's totalSpent from the summary data
                if (summary.totalSpent !== userWithSpending.totalSpent) {
                  dispatch({ type: 'UPDATE_USER_DATA', payload: { 
                    totalSpent: summary.totalSpent,
                    receiptCount: summary.totalReceipts 
                  }});
                }
                
                // After /summary completes, if user has data, immediately preload wrapped data
                if (summary.totalReceipts > 0) {
                  // Preload wrapped analytics in background
                  analyticsApi.getUserSummary(userId, true)
                    .then((wrappedSummary) => {
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
              })
              .catch((analyticsError) => {
                // Try to use cached data on error
                getCachedAnalytics(userId).then((cached) => {
                  if (cached) {
                    dispatch({ type: 'SET_ANALYTICS', payload: cached });
                  }
                }).catch(() => {
                  // Silently fail cache retrieval
                });
                console.warn('Failed to load analytics on app start:', analyticsError);
              })
              .finally(() => {
                dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
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
        AsyncStorage.removeItem('@snacktrack_analytics_cache'),
        AsyncStorage.removeItem('@snacktrack_last_sync'),
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
      
      // Note: We don't fetch totalSpent here anymore - the dashboard will fetch
      // the full summary which includes totalSpent. This avoids a redundant API call.
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt,
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: 0, // Will be updated when dashboard loads
        receiptCount: 0,
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      console.log('🔍 [UserContext] User registered and set:', {
        userId: user.id,
        email: user.email,
        isAuthenticated: true, // Will be set by reducer
      });
      
      // Set Sentry user context for error tracking
      setSentryUser(response.userId, response.email);
      
      if (__DEV__) {
        console.log('✅ User registered successfully:', email);
      }
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
      
      // Immediately load analytics to avoid showing $0 total spent
      // This ensures the dashboard has data as soon as it renders
      
      // Create user object (totalSpent will be loaded by dashboard)
      const user: AppUser = {
        id: response.userId,
        email: response.email,
        createdAt: response.user.createdAt,
        emailVerified: response.user.emailVerified ?? false,
        totalSpent: 0, // Will be updated when dashboard loads
        receiptCount: 0,
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      // Set Sentry user context for error tracking
      setSentryUser(response.userId, response.email);
      
      // Start loading analytics immediately (non-blocking) so dashboard has data ready
      // This prevents "Total Spent" from popping in after dashboard renders
      // Use response.userId directly since state.user might not be updated yet
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
      analyticsApi.getUserSummary(response.userId, false)
        .then((summary) => {
          dispatch({ type: 'SET_ANALYTICS', payload: summary });
          cacheAnalytics(response.userId, summary).catch(() => {
            // Silently fail caching - not critical
          });

          // Update user's totalSpent from the summary data
          if (summary.totalSpent !== user.totalSpent) {
            dispatch({ type: 'UPDATE_USER_DATA', payload: { 
              totalSpent: summary.totalSpent,
              receiptCount: summary.totalReceipts 
            }});
          }
          
          // After /summary completes, if user has data, immediately preload wrapped data
          // This ensures Wrapped Journey tab loads instantly when clicked
          // Check both totalReceipts and totalSpent to be safe
          const hasData = summary.totalReceipts > 0 || summary.totalSpent > 0;
          if (hasData) {
            // Preload wrapped analytics in background (don't await - let it run async)
            analyticsApi.getUserSummary(response.userId, true)
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
                cacheAnalytics(response.userId, wrappedSummary).catch(() => {
                  // Silently fail caching - not critical
                });
              })
              .catch(() => {
                // Silently fail wrapped preload - not critical for login
              });
          }
        })
        .catch((analyticsError) => {
          // Try to use cached data on error
          getCachedAnalytics(response.userId).then((cached) => {
            if (cached) {
              dispatch({ type: 'SET_ANALYTICS', payload: cached });
            }
          }).catch(() => {
            // Silently fail cache retrieval
          });
        // Don't fail login if analytics fails - user can still use the app
        console.warn('Failed to load analytics after login:', analyticsError);
        })
        .finally(() => {
          dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
        });
      
      if (__DEV__) {
        console.log('✅ User logged in successfully:', email);
      }
      
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

  const loadAnalytics = async (includeWrapped: boolean = false): Promise<UserSummary | null> => {
    if (!state.user) return null;

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
      
      // If we loaded without wrapped data and user has data, preload wrapped data in background
      // This ensures Wrapped Journey tab loads instantly when clicked
      if (!includeWrapped && summary.totalReceipts > 0 && state.user) {
        // Preload wrapped analytics in background (don't await - let it run async)
        const userId = state.user.id;
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
    } catch (error: any) {
      // Try to use cached data on error
      const cached = await getCachedAnalytics(state.user.id);
      if (cached) {
        dispatch({ type: 'SET_ANALYTICS', payload: cached });
        return cached;
      }
      // Don't set error here - let screens handle it individually
      return null;
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
