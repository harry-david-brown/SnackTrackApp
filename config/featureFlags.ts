import Constants from 'expo-constants';

/**
 * Feature Flags Configuration
 * 
 * Controls visibility of dev-only features across the app.
 * 
 * By default:
 * - Dev features are SHOWN in __DEV__ mode (development builds, Expo Go)
 * - Dev features are HIDDEN in production builds
 * 
 * You can override this behavior with EXPO_PUBLIC_SHOW_DEV_FEATURES:
 * - Set to 'true' to force-show dev features (even in production)
 * - Set to 'false' to force-hide dev features (even in development)
 * - Leave unset or set to 'auto' for default behavior
 * 
 * Example .env:
 *   EXPO_PUBLIC_SHOW_DEV_FEATURES=false  # Test production UI in dev
 */

type DevFeaturesMode = 'auto' | 'true' | 'false';

/**
 * Get the dev features mode from environment
 */
function getDevFeaturesMode(): DevFeaturesMode {
  const extras =
	(Constants.expoConfig?.extra as Record<string, any> | undefined) ??
	((Constants as any).manifest?.extra as Record<string, any> | undefined) ??
	((Constants as any).manifest2?.extra as Record<string, any> | undefined) ??
	{};

  const envValue = extras.showDevFeatures ?? process.env.EXPO_PUBLIC_SHOW_DEV_FEATURES;
  
  if (envValue === 'true' || envValue === true) return 'true';
  if (envValue === 'false' || envValue === false) return 'false';
  return 'auto';
}

/**
 * Get the app environment
 */
function getAppEnv(): string {
  const extras =
	(Constants.expoConfig?.extra as Record<string, any> | undefined) ??
	((Constants as any).manifest?.extra as Record<string, any> | undefined) ??
	((Constants as any).manifest2?.extra as Record<string, any> | undefined) ??
	{};

  return extras.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'production';
}

/**
 * Determine if dev features should be shown
 * 
 * Logic:
 * 1. If EXPO_PUBLIC_SHOW_DEV_FEATURES is 'true' -> always show
 * 2. If EXPO_PUBLIC_SHOW_DEV_FEATURES is 'false' -> always hide
 * 3. Otherwise (auto): show if __DEV__ or appEnv === 'development'
 */
function calculateShowDevFeatures(): boolean {
  const mode = getDevFeaturesMode();
  
  if (mode === 'true') return true;
  if (mode === 'false') return false;
  
  // Auto mode: show in dev builds or development environment
  const appEnv = getAppEnv();
  return __DEV__ || appEnv === 'development';
}

// Cache the result since it won't change during runtime
let _showDevFeatures: boolean | null = null;

/**
 * Check if dev features should be shown
 * 
 * Use this throughout the app to conditionally render dev-only features:
 * - Gmail OAuth integration
 * - Google OAuth login button
 * - Reset Onboarding button
 * - Test Errors tab
 */
export function showDevFeatures(): boolean {
  if (_showDevFeatures === null) {
	_showDevFeatures = calculateShowDevFeatures();

	if (__DEV__) {
	  const mode = getDevFeaturesMode();
	  console.log(`🚩 Feature Flags: showDevFeatures=${_showDevFeatures} (mode=${mode})`);
	}
  }
  return _showDevFeatures;
}

/**
 * Feature flags object for easy destructuring
 * 
 * Usage:
 *   import { featureFlags } from '../config/featureFlags';
 *   const { showGoogleAuth, showGmailImport, showResetOnboarding } = featureFlags;
 */
export const featureFlags = {
  /** Show Google OAuth login button */
  get showGoogleAuth() {
	return showDevFeatures();
  },
  
  /** Show Gmail import feature */
  get showGmailImport() {
	return showDevFeatures();
  },
  
  /** Show Reset Onboarding button in profile */
  get showResetOnboarding() {
	return showDevFeatures();
  },
  
  /** Show Test Errors tab */
  get showTestErrors() {
	return showDevFeatures();
  },
};

export default featureFlags;

