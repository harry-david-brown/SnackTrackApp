import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../services/api';
import { mockUserApi } from '../services/mockApi';
import { User, AppUser } from '../types/api';

// User state interface
interface UserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// User actions
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<AppUser> };

// User context interface
interface UserContextType {
  state: UserState;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  clearError: () => void;
}

// Initial state
const initialState: UserState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
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
      };
    case 'UPDATE_USER_DATA':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  USER_DATA: '@snacktrack_user_data',
  USER_ID: '@snacktrack_user_id',
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

  const loadUserFromStorage = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const [storedUserData, storedUserId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      ]);

      if (storedUserData && storedUserId) {
        const userData = JSON.parse(storedUserData) as AppUser;
        
        // Verify user still exists by fetching fresh data
        try {
          let totalSpent;
          try {
            totalSpent = await userApi.getTotalSpent(storedUserId);
          } catch (apiError) {
            // Fall back to mock API
            totalSpent = await mockUserApi.getTotalSpent(storedUserId);
          }
          
          const userWithSpending: AppUser = {
            ...userData,
            totalSpent,
          };
          
          dispatch({ type: 'SET_USER', payload: userWithSpending });
        } catch (error) {
          // User might not exist anymore, clear storage
          await clearUserStorage();
          dispatch({ type: 'SET_USER', payload: null });
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
    }
  };

  const saveUserToStorage = async (user: AppUser) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, user.id),
      ]);
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const clearUserStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
      ]);
    } catch (error) {
      console.error('Error clearing user storage:', error);
    }
  };

  const login = async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      let response;
      let totalSpent;

      try {
        // Try real API first
        response = await userApi.createUser({ email });
        totalSpent = await userApi.getTotalSpent(response.userId);
        console.log('Connected to real API successfully');
      } catch (apiError: any) {
        console.log('Real API error:', apiError.response?.data?.message || apiError.message);
        // For now, let's use the existing user data from the API
        // Get the first available user for demo purposes
        try {
          const existingUsers = await fetch('http://localhost:3000/database/users').then(res => res.json());
          if (existingUsers.users && existingUsers.users.length > 0) {
            const existingUser = existingUsers.users[0];
            response = { userId: existingUser.id, message: 'Using existing user data' };
            totalSpent = existingUser.totalSpent || 0;
            console.log('Using existing user:', existingUser.email);
          } else {
            throw new Error('No existing users found');
          }
        } catch (fallbackError) {
          console.log('Fallback failed, using mock API');
          response = await mockUserApi.createUser({ email });
          totalSpent = await mockUserApi.getTotalSpent(response.userId);
        }
      }
      
      // Create user object
      const user: AppUser = {
        id: response.userId,
        email,
        createdAt: new Date().toISOString(),
        totalSpent,
        receiptCount: 0, // Will be updated when we fetch receipts
      };

      // Save to storage and state
      await saveUserToStorage(user);
      dispatch({ type: 'SET_USER', payload: user });
      
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user account';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await clearUserStorage();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still dispatch logout even if storage clearing fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshUserData = async () => {
    if (!state.user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      let totalSpent;
      try {
        totalSpent = await userApi.getTotalSpent(state.user.id);
      } catch (apiError) {
        // Fall back to mock API
        totalSpent = await mockUserApi.getTotalSpent(state.user.id);
      }
      
      const updatedUser = { ...state.user, totalSpent };
      
      await saveUserToStorage(updatedUser);
      dispatch({ type: 'UPDATE_USER_DATA', payload: { totalSpent } });
      
    } catch (error) {
      console.error('Error refreshing user data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh user data' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value: UserContextType = {
    state,
    login,
    logout,
    refreshUserData,
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
