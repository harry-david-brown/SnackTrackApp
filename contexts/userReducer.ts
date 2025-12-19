/**
 * User reducer logic
 */

import { UserState, UserAction } from './userTypes';

// User reducer
export const userReducer = (state: UserState, action: UserAction): UserState => {
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

