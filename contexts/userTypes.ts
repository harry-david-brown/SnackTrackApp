/**
 * User context types and interfaces
 */

import { AppUser, RegisterResponse, LoginResponse, MicrosoftLoginResponse } from '@/types/api';

// User state interface
export interface UserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// User actions
export type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<AppUser> };

// User context interface
export interface UserContextType {
  state: UserState;
  login: (email: string, password: string) => Promise<LoginResponse>;
  loginWithGoogle: (idToken: string) => Promise<LoginResponse>;
  loginWithApple: (identityToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }) => Promise<LoginResponse>;
  loginWithMicrosoft: (
    identityToken: string,
    attemptToken: string,
  ) => Promise<MicrosoftLoginResponse>;
  confirmMicrosoftLoginEmail: (
    attemptToken: string,
    email: string,
    code: string,
  ) => Promise<LoginResponse>;
  register: (email: string, password: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<'pending' | 'deleted'>;
  clearError: () => void;
  markEmailVerified: () => Promise<void>;
}

// Initial state
export const initialState: UserState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};
