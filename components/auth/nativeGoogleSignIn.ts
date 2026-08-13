/**
 * Lazy loader for the native Google Sign-In module. Only available in
 * development/standalone builds — Expo Go and web fall back to
 * expo-auth-session. Checked lazily (not at module load) to avoid crashes
 * in Expo Go, where the native module doesn't exist.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getConfig } from '../../config/env';

let GoogleSignin: any = null;
let statusCodes: any = null;
let nativeGoogleSignInAvailable = false;
let nativeModuleChecked = false;

export const checkNativeGoogleSignIn = (): boolean => {
  if (nativeModuleChecked) {
    return nativeGoogleSignInAvailable;
  }

  nativeModuleChecked = true;

  if (Platform.OS === 'web') {
    nativeGoogleSignInAvailable = false;
    return false;
  }

  // Check if we're in Expo Go - if so, skip native module check entirely
  // Constants.executionEnvironment is 'storeClient' in Expo Go, 'standalone' in production builds
  const executionEnvironment = Constants.executionEnvironment;
  if (executionEnvironment === 'storeClient') {
    // We're in Expo Go - native modules won't be available
    nativeGoogleSignInAvailable = false;
    return false;
  }

  // Only try to load native module if we're in a development build (not Expo Go)
  try {
    // Try to require the module - this will work in development builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule.GoogleSignin;
    statusCodes = googleSigninModule.statusCodes;

    // Configure only if loaded successfully and config is available
    if (GoogleSignin) {
      try {
        const config = getConfig();
        if (config.gmailWebClientId) {
          GoogleSignin.configure({
            webClientId: config.gmailWebClientId,
            iosClientId: config.gmailIosClientId,
            offlineAccess: true,
          });
          nativeGoogleSignInAvailable = true;
          return true;
        }
      } catch {
        // Config might not be ready yet; use expo-auth-session fallback.
      }
    }
  } catch {
    // Native module not available; use expo-auth-session fallback.
  }

  nativeGoogleSignInAvailable = false;
  return false;
};

export const isNativeGoogleSignInAvailable = (): boolean => nativeGoogleSignInAvailable;
export const getGoogleSignin = (): any => GoogleSignin;
export const getGoogleStatusCodes = (): any => statusCodes;
