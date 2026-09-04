import Constants from 'expo-constants';

/**
 * Environment types
 */
export type AppEnvironment = 'development' | 'preview' | 'staging' | 'production';

/**
 * Environment configuration
 */
export interface EnvConfig {
  apiUrl: string;
  appEnv: AppEnvironment;
  isDevelopment: boolean;
  isPreview: boolean;
  isStaging: boolean;
  isProduction: boolean;
  // Gmail OAuth client IDs
  gmailAndroidClientId?: string;
  gmailIosClientId?: string;
  /** Google OAuth web client credential used as the native SDK's server client ID. */
  googleServerClientId?: string;
  microsoftLoginClientId?: string;
  microsoftLoginIosRedirectUri?: string;
  microsoftLoginAndroidRedirectUri?: string;
  admobNativeIosAdUnitId?: string;
  admobNativeAndroidAdUnitId?: string;
}

function normalizeIosGoogleClientId(clientId?: string): string | undefined {
  if (!clientId) {
    return undefined;
  }

  return clientId.endsWith('.apps.googleusercontent.com')
    ? clientId
    : `${clientId}.apps.googleusercontent.com`;
}

/**
 * Get environment variable with validation
 */
function getEnvVar(name: string, required: boolean = true): string | undefined {
  // 1. Check explicit environment variable (highest priority)
  if (process.env[name]) {
    return process.env[name];
  }

  const extrasSources = [
    Constants.expoConfig?.extra as Record<string, any> | undefined,
    (Constants as any).manifest?.extra as Record<string, any> | undefined,
    (Constants as any).manifest2?.extra as Record<string, any> | undefined,
  ];

  for (const extra of extrasSources) {
    if (!extra) continue;
    if (extra[name]) {
      return extra[name];
    }
  }

  if (required) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `Please set ${name} in your .env file or app.config.js\n` +
      `For local development, create a .env file with: ${name}=your_value`
    );
  }

  return undefined;
}

/**
 * Validate and get API URL
 * Throws an error if EXPO_PUBLIC_API_URL is not set (fail-secure)
 * Enforces HTTPS in non-development environments
 */
function getApiUrl(): string {
  const apiUrl = getEnvVar('EXPO_PUBLIC_API_URL', false);

  if (!apiUrl || apiUrl.trim() === '') {
    throw new Error(
      'EXPO_PUBLIC_API_URL is empty or invalid.\n' +
      'Please set EXPO_PUBLIC_API_URL in your .env file or app.config.js\n' +
      'Example: EXPO_PUBLIC_API_URL=https://snacktrackapi-production.up.railway.app'
    );
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    throw new Error(
      `EXPO_PUBLIC_API_URL is not a valid URL: ${apiUrl}\n` +
      'Please provide a valid URL (e.g., https://snacktrackapi-production.up.railway.app)'
    );
  }

  // Get app environment
  const appEnv = getAppEnv();

  // Enforce HTTPS outside local development.
  if (appEnv !== 'development' && parsedUrl.protocol !== 'https:') {
    throw new Error(
      `Security Error: ${appEnv} API URL must use HTTPS protocol.\n` +
      `Current URL: ${apiUrl}\n` +
      'Please update EXPO_PUBLIC_API_URL to use https:// instead of http://'
    );
  }

  return apiUrl;
}

/**
 * Get app environment
 */
function getAppEnv(): AppEnvironment {
  const appEnv = getEnvVar('EXPO_PUBLIC_APP_ENV', false) || 'development';

  const validEnvs: AppEnvironment[] = ['development', 'preview', 'staging', 'production'];
  if (!validEnvs.includes(appEnv as AppEnvironment)) {
    throw new Error(
      `Invalid EXPO_PUBLIC_APP_ENV: ${appEnv}\n` +
      `Must be one of: ${validEnvs.join(', ')}`
    );
  }

  return appEnv as AppEnvironment;
}

/**
 * Get environment configuration
 * This function validates all required environment variables and returns a typed config object.
 * It will throw an error if required variables are missing, ensuring the app fails fast.
 */
export function getEnvConfig(): EnvConfig {
  const apiUrl = getApiUrl();
  const appEnv = getAppEnv();

  // Gmail OAuth client IDs (optional - only needed for Gmail integration)
  const gmailAndroidClientId = getEnvVar('EXPO_PUBLIC_GMAIL_ANDROID_CLIENT_ID', false);
  const gmailIosClientId = normalizeIosGoogleClientId(
    getEnvVar('EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID', false)
  );
  // Google names this credential type a "web client ID", but the native
  // Google Sign-In SDK uses it as its server client ID.
  const googleServerClientId = getEnvVar('EXPO_PUBLIC_GMAIL_WEB_CLIENT_ID', false);
  const microsoftLoginClientId = getEnvVar('EXPO_PUBLIC_MICROSOFT_LOGIN_CLIENT_ID', false);
  const microsoftLoginIosRedirectUri = getEnvVar(
    'EXPO_PUBLIC_MICROSOFT_LOGIN_IOS_REDIRECT_URI',
    false,
  );
  const microsoftLoginAndroidRedirectUri = getEnvVar(
    'EXPO_PUBLIC_MICROSOFT_LOGIN_ANDROID_REDIRECT_URI',
    false,
  );
  const admobNativeIosAdUnitId = getEnvVar('EXPO_PUBLIC_ADMOB_NATIVE_IOS_AD_UNIT_ID', false);
  const admobNativeAndroidAdUnitId = getEnvVar('EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_AD_UNIT_ID', false);

  return {
    apiUrl,
    appEnv,
    isDevelopment: appEnv === 'development',
    isPreview: appEnv === 'preview',
    isStaging: appEnv === 'staging',
    isProduction: appEnv === 'production',
    gmailAndroidClientId,
    gmailIosClientId,
    googleServerClientId,
    microsoftLoginClientId,
    microsoftLoginIosRedirectUri,
    microsoftLoginAndroidRedirectUri,
    admobNativeIosAdUnitId,
    admobNativeAndroidAdUnitId,
  };
}

/**
 * Validate environment configuration
 * Call this at module load time to fail early if configuration is invalid.
 * This is useful for catching configuration errors before the app starts.
 */
export function validateEnv(): void {
  getEnvConfig();
}

// Export singleton instance (validated on first access)
let envConfig: EnvConfig | null = null;

/**
 * Get validated environment configuration (singleton)
 * This will validate the environment on first access and cache the result.
 */
export function getConfig(): EnvConfig {
  if (!envConfig) {
    validateEnv();
    envConfig = getEnvConfig();
  }
  return envConfig;
}

// Note: We don't validate on module load to avoid issues in test environments
// Validation happens when getConfig() is called, which is done in services/api.ts
// The validate-env.js script ensures validation happens before expo start
