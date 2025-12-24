import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logger } from './logger';

// Storage keys for authentication
// Sensitive tokens use SecureStore on native, AsyncStorage on web
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'snacktrack_auth_token', // SecureStore (sensitive) / AsyncStorage (web)
  REFRESH_TOKEN: 'snacktrack_refresh_token', // SecureStore (sensitive) / AsyncStorage (web)
  USER_DATA: '@snacktrack_user_data', // AsyncStorage (non-sensitive)
  USER_ID: '@snacktrack_user_id', // AsyncStorage (non-sensitive)
  TOKEN_EXPIRES_AT: '@snacktrack_token_expires', // AsyncStorage (non-sensitive)
} as const;

// Helper functions to handle storage (SecureStore on native, AsyncStorage on web)
const setSecureItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteSecureItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Token expiry times (in milliseconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if expiring within 5 minutes
} as const;

/**
 * Decode JWT token to get expiry time
 */
const decodeJWTExpiry = (token: string): number => {
  try {
    // JWT format: header.payload.signature
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    // JWT exp is in seconds, convert to milliseconds
    return decoded.exp ? decoded.exp * 1000 : Date.now() + TOKEN_EXPIRY.ACCESS_TOKEN;
  } catch (error) {
    // If decode fails, use default expiry (fallback)
    return Date.now() + TOKEN_EXPIRY.ACCESS_TOKEN;
  }
};

/**
 * Store authentication tokens and user data
 * Sensitive tokens (access, refresh) are stored in SecureStore
 * Non-sensitive data (user data, user ID, expiry) are stored in AsyncStorage
 */
export const storeAuthTokens = async (
  accessToken: string,
  refreshToken: string,
  userId: string,
  userData: any
): Promise<void> => {
  try {
    // Get expiry time from the JWT token itself
    const expiresAt = decodeJWTExpiry(accessToken);
    
    // Store sensitive tokens (SecureStore on native, AsyncStorage on web)
    await Promise.all([
      setSecureItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      setSecureItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
    
    // Store non-sensitive data in AsyncStorage
    await Promise.all([
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER_ID, userId),
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString()),
    ]);
    
    if (__DEV__) {
      const storageType = Platform.OS === 'web' ? 'AsyncStorage' : 'SecureStore';
      logger.debug(`✅ Auth tokens stored successfully (${storageType})`);
      logger.debug(`🕐 Token expires at: ${new Date(expiresAt).toLocaleTimeString()}`);
    }
  } catch (error) {
    logger.error('Error storing auth tokens:', error);
    throw new Error('Failed to store authentication tokens');
  }
};

/**
 * Get the stored access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await getSecureItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    logger.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get the stored refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await getSecureItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    logger.error('Error getting refresh token:', error);
    return null;
  }
};

/**
 * Get stored user ID
 */
export const getUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_STORAGE_KEYS.USER_ID);
  } catch (error) {
    logger.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Get stored user data
 */
export const getUserData = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    logger.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Check if the access token is expired or will expire soon
 */
export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const expiresAtStr = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT);
    if (!expiresAtStr) return true;
    
    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Date.now();
    
    // Return true if token is expired or will expire within threshold
    return now >= expiresAt - TOKEN_EXPIRY.REFRESH_THRESHOLD;
  } catch (error) {
    logger.error('Error checking token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Update the access token and expiry time (after refresh)
 */
export const updateAccessToken = async (
  accessToken: string,
  refreshToken?: string
): Promise<void> => {
  try {
    // Get expiry time from the JWT token itself
    const expiresAt = decodeJWTExpiry(accessToken);
    
    // Update sensitive tokens
    const secureUpdates = [
      setSecureItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    ];
    
    if (refreshToken) {
      secureUpdates.push(setSecureItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken));
    }
    
    // Update non-sensitive expiry in AsyncStorage
    const asyncUpdates = [
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString()),
    ];
    
    await Promise.all([...secureUpdates, ...asyncUpdates]);
    
    if (__DEV__) {
      const storageType = Platform.OS === 'web' ? 'AsyncStorage' : 'SecureStore';
      logger.debug(`✅ Access token updated successfully (${storageType})`);
      logger.debug(`🕐 Token expires at: ${new Date(expiresAt).toLocaleTimeString()}`);
    }
  } catch (error) {
    logger.error('Error updating access token:', error);
    throw new Error('Failed to update access token');
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthTokens = async (): Promise<void> => {
  try {
    // Clear sensitive tokens
    await Promise.all([
      deleteSecureItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN).catch(() => {}),
      deleteSecureItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
    ]);
    
    // Clear non-sensitive data from AsyncStorage
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_DATA),
      AsyncStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT),
    ]);
    
    if (__DEV__) {
      logger.debug('✅ Auth tokens cleared successfully');
    }
  } catch (error) {
    logger.error('Error clearing auth tokens:', error);
  }
};

/**
 * Check if user is authenticated (has valid tokens)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
    ]);
    
    return !!(accessToken && refreshToken);
  } catch (error) {
    logger.error('Error checking authentication:', error);
    return false;
  }
};

