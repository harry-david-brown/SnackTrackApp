/**
 * User context types and interfaces
 */

import { AppUser, UserSummary, RegisterResponse, LoginResponse } from '../types/api';

// User state interface
export interface UserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  analytics: UserSummary | null;
  analyticsLoading: boolean;
}

// User actions
export type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<AppUser> }
  | { type: 'SET_ANALYTICS'; payload: UserSummary | null }
  | { type: 'SET_ANALYTICS_LOADING'; payload: boolean };

// User context interface
export interface UserContextType {
  state: UserState;
  login: (email: string, password: string) => Promise<LoginResponse>;
  loginWithGoogle: (idToken: string) => Promise<LoginResponse>;
  loginWithApple: (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }) => Promise<LoginResponse>;
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
export const initialState: UserState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  analytics: null,
  analyticsLoading: false,
};

