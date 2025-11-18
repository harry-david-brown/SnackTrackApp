import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { getEnvConfig } from '../config/env';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Should be called as early as possible in the app lifecycle
 */
export function initSentry(): void {
  // Get Sentry DSN from environment (optional - app works without it)
  const sentryDsn = getSentryDsn();
  
  // Only initialize if DSN is provided
  if (!sentryDsn) {
    if (__DEV__) {
      console.log('ℹ️  Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  const envConfig = getEnvConfig();
  
  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: envConfig.appEnv,
      debug: __DEV__, // Enable debug mode in development
      
      // Release tracking - ties errors to specific builds
      release: getReleaseVersion(),
      dist: getBuildNumber(),
      
      // Performance monitoring
      tracesSampleRate: envConfig.isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev/staging
      
      // Error filtering - don't report certain errors
      beforeSend(event, hint) {
        // Filter out development-only errors
        if (__DEV__ && event.exception) {
          const error = hint.originalException;
          // Skip known development errors
          if (error instanceof Error && error.message.includes('Warning:')) {
            return null;
          }
        }
        return event;
      },
      
      // Native crash reporting
      enableNativeCrashHandling: true,
      enableNativeNagger: false,
      
      // Additional context
      initialScope: {
        tags: {
          platform: Constants.platform?.ios ? 'ios' : 'android',
          app_version: Constants.expoConfig?.version || 'unknown',
        },
      },
    });
    
    if (__DEV__) {
      console.log('✅ Sentry initialized successfully');
    }
  } catch (error) {
    // Don't crash the app if Sentry initialization fails
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Get Sentry DSN from environment variables
 * Optional - app works without it
 */
function getSentryDsn(): string | undefined {
  // Check process.env first
  if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
    return process.env.EXPO_PUBLIC_SENTRY_DSN;
  }
  
  // Check app.config.js extra config
  const extra = Constants.expoConfig?.extra as Record<string, any> | undefined;
  if (extra?.sentryDsn) {
    return extra.sentryDsn;
  }
  
  // Check legacy manifest
  const manifest = (Constants as any).manifest?.extra as Record<string, any> | undefined;
  if (manifest?.sentryDsn) {
    return manifest.sentryDsn;
  }
  
  // Check manifest2
  const manifest2 = (Constants as any).manifest2?.extra as Record<string, any> | undefined;
  if (manifest2?.sentryDsn) {
    return manifest2.sentryDsn;
  }
  
  return undefined;
}

/**
 * Get release version for Sentry (e.g., "1.0.0")
 */
function getReleaseVersion(): string {
  return Constants.expoConfig?.version || 'unknown';
}

/**
 * Get build number for Sentry (e.g., "123")
 */
function getBuildNumber(): string {
  // Try to get from native constants
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                      Constants.expoConfig?.android?.versionCode ||
                      Constants.nativeBuildVersion;
  
  return buildNumber?.toString() || 'unknown';
}

/**
 * Set user context for Sentry
 * Call this after user logs in
 */
export function setSentryUser(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email: email,
  });
}

/**
 * Clear user context for Sentry
 * Call this when user logs out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, String(value));
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

