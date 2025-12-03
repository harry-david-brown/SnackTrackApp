import Constants from 'expo-constants';

/**
 * Environment types
 */
export type AppEnvironment = 'development' | 'staging' | 'production';

/**
 * Environment configuration
 */
export interface EnvConfig {
  apiUrl: string;
  appEnv: AppEnvironment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  // Gmail OAuth client IDs
  gmailAndroidClientId?: string;
  gmailIosClientId?: string;
  gmailWebClientId?: string;
}

/**
 * Get environment variable with validation
 */
function getEnvVar(name: string, required: boolean = true): string | undefined {
  // 1. Check explicit environment variable (highest priority)
  if (process.env[name]) {
    return process.env[name];
  }
  
  // 2. Check app.config.js extra config
  const extra = Constants.expoConfig?.extra as Record<string, any> | undefined;
  if (extra?.[name]) {
    return extra[name];
  }
  
  // 3. Check legacy manifest (for older Expo versions)
  const manifest = (Constants as any).manifest?.extra as Record<string, any> | undefined;
  if (manifest?.[name]) {
    return manifest[name];
  }
  
  // 4. Check manifest2 (for newer Expo versions)
  const manifest2 = (Constants as any).manifest2?.extra as Record<string, any> | undefined;
  if (manifest2?.[name]) {
    return manifest2[name];
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
 * Defaults to Railway production API if not set
 */
function getApiUrl(): string {
  const apiUrl = getEnvVar('EXPO_PUBLIC_API_URL', false) || 'https://snacktrackapi-production.up.railway.app';
  
  if (!apiUrl || apiUrl.trim() === '') {
    throw new Error(
      'EXPO_PUBLIC_API_URL is empty or invalid.\n' +
      'Please set EXPO_PUBLIC_API_URL in your .env file or app.config.js\n' +
      'Example: EXPO_PUBLIC_API_URL=https://snacktrackapi-production.up.railway.app'
    );
  }
  
  // Validate URL format
  try {
    new URL(apiUrl);
  } catch (error) {
    throw new Error(
      `EXPO_PUBLIC_API_URL is not a valid URL: ${apiUrl}\n` +
      'Please provide a valid URL (e.g., https://snacktrackapi-production.up.railway.app)'
    );
  }
  
  return apiUrl;
}

/**
 * Get app environment
 */
function getAppEnv(): AppEnvironment {
  const appEnv = getEnvVar('EXPO_PUBLIC_APP_ENV', false) || 'development';
  
  const validEnvs: AppEnvironment[] = ['development', 'staging', 'production'];
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
  const gmailIosClientId = getEnvVar('EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID', false);
  const gmailWebClientId = getEnvVar('EXPO_PUBLIC_GMAIL_WEB_CLIENT_ID', false);
  
  return {
    apiUrl,
    appEnv,
    isDevelopment: appEnv === 'development',
    isStaging: appEnv === 'staging',
    isProduction: appEnv === 'production',
    gmailAndroidClientId,
    gmailIosClientId,
    gmailWebClientId,
  };
}

/**
 * Validate environment configuration
 * Call this at module load time to fail early if configuration is invalid.
 * This is useful for catching configuration errors before the app starts.
 */
export function validateEnv(): void {
  try {
    getEnvConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Environment Configuration Error:');
    console.error('=====================================');
    console.error(message);
    console.error('\n💡 Quick Fix:');
    console.error('1. Create a .env file in the project root');
    console.error('2. Add: EXPO_PUBLIC_API_URL=https://snacktrackapi-production.up.railway.app');
    console.error('   (Or use a different URL if needed)');
    console.error('3. Add: EXPO_PUBLIC_APP_ENV=development (optional)');
    console.error('\n📚 See README.md for detailed setup instructions.\n');
    throw error;
  }
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

