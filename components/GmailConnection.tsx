import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gmailApi, GmailConnectionStatus } from '../services/gmailApi';
import { useUser } from '../contexts/UserContext';
import { analyticsApi } from '../services/analyticsApi';
import { showAlert, showSimpleAlert } from '../utils/platformAlert';
import { getConfig } from '../config/env';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Lazy load Google Sign-In module only when needed and on native platforms
let GoogleSigninModule: any = null;
let GoogleSignin: any = null;
let statusCodes: any = null;
let isErrorWithCode: any = null;
let isSuccessResponse: any = null;
let isNoSavedCredentialFoundResponse: any = null;
let isCancelledResponse: any = null;
let GoogleOneTapSignIn: any = null;

const loadGoogleSignIn = async () => {
  if (Platform.OS === 'web') {
    return null;
  }

  // Check if we're in Expo Go - if so, skip native module load entirely
  const executionEnvironment = Constants.executionEnvironment;
  if (executionEnvironment === 'storeClient') {
    // We're in Expo Go - native modules won't be available
    return null;
  }

  if (GoogleSigninModule) {
    return GoogleSigninModule;
  }

  try {
    // Only try to import in development builds (not Expo Go)
    GoogleSigninModule = await import('@react-native-google-signin/google-signin');
    GoogleSignin = GoogleSigninModule.GoogleSignin;
    statusCodes = GoogleSigninModule.statusCodes;
    isErrorWithCode = GoogleSigninModule.isErrorWithCode;
    isSuccessResponse = GoogleSigninModule.isSuccessResponse;
    isNoSavedCredentialFoundResponse = GoogleSigninModule.isNoSavedCredentialFoundResponse;
    isCancelledResponse = GoogleSigninModule.isCancelledResponse;
    // Universal API (One Tap) - TypeScript types may not be complete in v16
    // @ts-ignore - Universal API methods exist at runtime but types may be incomplete
    GoogleOneTapSignIn = GoogleSignin as any;
    return GoogleSigninModule;
  } catch (error) {
    // Native module not available - this is expected in Expo Go
    if (__DEV__) {
      console.warn('⚠️ Google Sign-In module not available:', error);
    }
    return null;
  }
};

// Initialize WebBrowser for web auth
WebBrowser.maybeCompleteAuthSession();

interface GmailConnectionProps {
  onImportSuccess?: () => void;
}

export const GmailConnection: React.FC<GmailConnectionProps> = ({ onImportSuccess }) => {
  const { state, setAnalytics } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<GmailConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Get OAuth client IDs from environment
  const config = getConfig();

  // Configure Universal Google Sign-In (One Tap)
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        if (Platform.OS === 'web') {
          console.log('ℹ️ Google Sign-In not available on web platform');
          checkConnectionStatus();
          return;
        }

        if (!config.gmailWebClientId) {
          console.warn('⚠️ Google Sign-In not configured - missing webClientId');
          checkConnectionStatus();
          return;
        }

        // Load the Google Sign-In module
        const module = await loadGoogleSignIn();
        if (!module || !GoogleOneTapSignIn) {
          console.warn('⚠️ Google Sign-In module not available - native module may not be linked');
          checkConnectionStatus();
          return;
        }

        // Configure Universal Google Sign-In
        // According to docs: webClientId is required, iosClientId is optional (auto-detected with Expo/Firebase)
        GoogleOneTapSignIn.configure({
          webClientId: config.gmailWebClientId,
          iosClientId: config.gmailIosClientId,
          androidClientId: config.gmailAndroidClientId,
        });

        console.log('✅ Universal Google Sign-In configured');
        checkConnectionStatus();
      } catch (error) {
        console.error('❌ Failed to configure Google Sign-In:', error);
        checkConnectionStatus();
      }
    };

    configureGoogleSignIn();
  }, [config.gmailWebClientId, config.gmailIosClientId, config.gmailAndroidClientId]);

  // Track if native Google Sign-In is available
  const [nativeGoogleSignInAvailable, setNativeGoogleSignInAvailable] = useState(false);

  // Check if native module is available
  useEffect(() => {
    const checkNativeModule = async () => {
      if (Platform.OS === 'web') {
        setNativeGoogleSignInAvailable(false);
        return;
      }
      const module = await loadGoogleSignIn();
      setNativeGoogleSignInAvailable(!!(module && GoogleOneTapSignIn));
    };
    checkNativeModule();
  }, []);

  // Expo Auth Session for Web and Expo Go Fallback
  // Conditionally construct config - use web client ID as fallback for iOS if iosClientId is missing
  const googleAuthConfig: {
    clientId: string;
    iosClientId?: string;
    androidClientId?: string;
    scopes: string[];
  } = {
    clientId: config.gmailWebClientId || '',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  };
  
  // expo-auth-session requires iosClientId on iOS, so use web client ID as fallback if missing
  if (Platform.OS === 'ios') {
    googleAuthConfig.iosClientId = config.gmailIosClientId || config.gmailWebClientId;
  } else if (config.gmailIosClientId) {
    googleAuthConfig.iosClientId = config.gmailIosClientId;
  }
  
  if (config.gmailAndroidClientId) {
    googleAuthConfig.androidClientId = config.gmailAndroidClientId;
  }
  
  const [, response, promptAsync] = Google.useAuthRequest(googleAuthConfig);

  const checkConnectionStatus = async () => {
    try {
      setIsChecking(true);
      const status = await gmailApi.getStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleTokenExchange = useCallback(async (accessToken: string, refreshToken?: string) => {
    try {
      setIsLoading(true);

      if (__DEV__) {
        console.log('🔄 Exchanging OAuth token...', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
      }

      const result = await gmailApi.exchangeToken(accessToken, refreshToken);

      if (result.success) {
        if (__DEV__) {
          console.log('✅ Token exchange successful, refreshing connection status...');
        }
        // Refresh connection status to get the connected Gmail email
        await checkConnectionStatus();
        showSimpleAlert('Success', 'Gmail connected successfully! You can now import your receipts.');
      } else {
        showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
      }
    } catch (error: any) {
      console.error('Token exchange error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to connect Gmail. Please try again.';
      showSimpleAlert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Handle auth response for both web and Expo Go (when native module isn't available)
    if (!nativeGoogleSignInAvailable && response?.type === 'success' && response.authentication) {
      console.log('✅ Authentication successful via expo-auth-session');
      handleTokenExchange(response.authentication.accessToken);
    } else if (!nativeGoogleSignInAvailable && response?.type === 'error') {
      console.error('❌ Authentication failed:', response.error);
      showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
      setIsLoading(false);
    } else if (!nativeGoogleSignInAvailable && response?.type === 'dismiss') {
      console.log('ℹ️ Authentication dismissed by user');
      setIsLoading(false);
    }
  }, [response, nativeGoogleSignInAvailable, handleTokenExchange]);

  // Request Gmail API authorization with scopes
  const requestGmailAuthorization = async () => {
    try {
      console.log('🔄 Requesting Gmail API authorization...');

      // Ensure Google Sign-In module is loaded
      const module = await loadGoogleSignIn();
      if (!module || !GoogleOneTapSignIn) {
        throw new Error('Google Sign-In module not available');
      }

      // Request authorization for Gmail scopes
      // This is separate from sign-in - it requests access to Gmail API
      await GoogleOneTapSignIn.addScopes({
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      });

      // Get tokens after adding scopes
      const tokens = await GoogleOneTapSignIn.getTokens();

      if (tokens.accessToken) {
        console.log('✅ Got Gmail access token from authorization');
        // Note: Universal API doesn't provide refresh tokens directly
        // The backend will need to handle token refresh using the access token
        await handleTokenExchange(tokens.accessToken);
      } else {
        throw new Error('No access token received from authorization request');
      }
    } catch (error: any) {
      console.error('❌ Failed to request Gmail authorization:', error);

      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_REQUIRED) {
          // User needs to sign in first
          showSimpleAlert('Error', 'Please sign in with Google first.');
        } else {
          showSimpleAlert('Error', `Authorization failed: ${error.message || 'Unknown error'}`);
        }
      } else {
        showSimpleAlert('Error', `Failed to authorize Gmail access: ${error.message || 'Unknown error'}`);
      }
      throw error;
    }
  };

  const connectGmail = async () => {
    try {
      setIsLoading(true);

      if (__DEV__) {
        console.log(`🔐 Starting Gmail OAuth flow - Platform: ${Platform.OS}`);
      }

      if (!config.gmailWebClientId) {
        showSimpleAlert('Not Configured', 'Gmail connection is not configured. Please configure OAuth client IDs.');
        setIsLoading(false);
        return;
      }

      // Use expo-auth-session for web or when native module isn't available (Expo Go)
      if (Platform.OS === 'web' || !nativeGoogleSignInAvailable) {
        console.log('🌍 Starting expo-auth-session flow...');
        await promptAsync();
        // The result will be handled by the useEffect above
        // Don't set isLoading to false here - let the useEffect handle it
        return;
      }

      // Use native Google Sign-In for development builds
      // Ensure Google Sign-In module is loaded
      const module = await loadGoogleSignIn();
      if (!module || !GoogleOneTapSignIn) {
        // Fallback to expo-auth-session if native module failed to load
        console.log('⚠️ Native module not available, falling back to expo-auth-session');
        // Update state so the useEffect will handle the response
        setNativeGoogleSignInAvailable(false);
        await promptAsync();
        return;
      }

      // Check Google Play Services (Android) or verify Google Client Library (Web)
      await GoogleOneTapSignIn.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Step 1: Try automatic sign-in (no user interaction if previously signed in)
      let signInResponse = await GoogleOneTapSignIn.signIn();

      if (isSuccessResponse(signInResponse)) {
        // User was automatically signed in
        console.log('✅ Automatic sign-in successful');
        // Now request Gmail API authorization
        await requestGmailAuthorization();
      } else if (isNoSavedCredentialFoundResponse(signInResponse)) {
        // No saved credential - user hasn't signed in before
        console.log('ℹ️ No saved credential found, starting create account flow');

        // Step 2: Create account (first-time sign-in)
        const createResponse = await GoogleOneTapSignIn.createAccount();

        if (isSuccessResponse(createResponse)) {
          console.log('✅ Account creation successful');
          // Now request Gmail API authorization
          await requestGmailAuthorization();
        } else if (isNoSavedCredentialFoundResponse(createResponse)) {
          // No Google account on device - show explicit sign-in
          console.log('ℹ️ No Google account found, showing explicit sign-in');

          // Step 3: Present explicit sign-in dialog
          const explicitResponse = await GoogleOneTapSignIn.presentExplicitSignIn();

          if (isSuccessResponse(explicitResponse)) {
            console.log('✅ Explicit sign-in successful');
            // Now request Gmail API authorization
            await requestGmailAuthorization();
          } else if (isCancelledResponse(explicitResponse)) {
            showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
          }
        } else if (isCancelledResponse(createResponse)) {
          showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
        }
      } else if (isCancelledResponse(signInResponse)) {
        showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
      }
    } catch (error: any) {
      console.error('❌ Failed to connect Gmail:', error);
      console.log('ℹ️ Configured Web Client ID:', config.gmailWebClientId);
      console.log('ℹ️ Configured iOS Client ID:', config.gmailIosClientId);
      console.log('ℹ️ Configured Android Client ID:', config.gmailAndroidClientId);

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case 'ONE_TAP_START_FAILED':
            // Android rate limiting - try explicit sign-in
            console.log('⚠️ One Tap rate limited, trying explicit sign-in');
            try {
              if (!GoogleOneTapSignIn) {
                const module = await loadGoogleSignIn();
                if (!module || !GoogleOneTapSignIn) {
                  throw new Error('Google Sign-In module not available');
                }
              }
              const explicitResponse = await GoogleOneTapSignIn.presentExplicitSignIn();
              if (isSuccessResponse(explicitResponse)) {
                await requestGmailAuthorization();
              } else if (isCancelledResponse(explicitResponse)) {
                showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
              }
            } catch {
              showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
            }
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            showSimpleAlert('Error', 'Google Play Services not available. Please update Google Play Services.');
            break;
          default:
            const errorMessage = error.message || 'Failed to connect Gmail. Please try again.';
            showSimpleAlert('Error', errorMessage);
        }
      } else {
        const errorMessage = error.message || 'Failed to connect Gmail. Please try again.';
        showSimpleAlert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const importReceipts = async () => {
    showAlert(
      'Import Receipts',
      'Do you want to replace existing email-based receipts or add new ones?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add New',
          onPress: () => performImport(false),
        },
        {
          text: 'Replace All',
          style: 'destructive',
          onPress: () => performImport(true),
        },
      ]
    );
  };

  const performImport = async (replaceExisting: boolean) => {
    try {
      setIsImporting(true);

      const result = await gmailApi.importReceipts(replaceExisting);

      if (result.success) {
        // Refresh analytics IMMEDIATELY after import succeeds
        if (state.user) {
          try {
            console.log('🔄 Refreshing analytics after Gmail import...');
            const summary = await analyticsApi.getUserSummary(state.user.id, true);
            setAnalytics(summary);
            console.log('✅ Analytics refreshed successfully');
          } catch (error) {
            console.warn('Failed to refresh analytics:', error);
          }
        }

        // Show success message
        showSimpleAlert(
          'Import Complete',
          `Successfully imported ${result.totalReceiptsImported} receipt${result.totalReceiptsImported !== 1 ? 's' : ''} ($${result.totalAmount.toFixed(2)})`,
          () => {
            onImportSuccess?.();
          }
        );
      } else {
        showSimpleAlert('Import Failed', 'Failed to import receipts. Please try again.');
      }
    } catch (error: any) {
      console.error('Import failed:', error);

      // Handle network/timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('timeout')) {
        showSimpleAlert(
          'Import Timeout',
          'The import is taking longer than expected. This might mean you have many emails to process. Please try again or check your connection.'
        );
      } else if (error.response?.data?.error || error.response?.data?.message) {
        // Server returned an error message
        const errorMessage = error.response.data.error || error.response.data.message;
        showSimpleAlert('Import Failed', errorMessage);
      } else if (error.message) {
        // Generic error message
        showSimpleAlert('Import Failed', error.message);
      } else {
        // Fallback
        showSimpleAlert('Import Failed', 'Failed to import receipts. Please check your connection and try again.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const disconnectGmail = async () => {
    showAlert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account? Your imported receipts will remain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              // Sign out from Google Sign-In
              try {
                const module = await loadGoogleSignIn();
                if (module && GoogleOneTapSignIn) {
                  await GoogleOneTapSignIn.signOut();
                  console.log('✅ Signed out from Google Sign-In');
                }
              } catch (signOutError) {
                console.warn('⚠️ Sign out error (may not be signed in):', signOutError);
              }

              // Disconnect on backend
              await gmailApi.disconnect();
              setConnectionStatus({ connected: false });
              showSimpleAlert('Success', 'Gmail account disconnected.');
            } catch (error) {
              console.error('Disconnect failed:', error);
              showSimpleAlert('Error', 'Failed to disconnect Gmail. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking Gmail connection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons
            name={connectionStatus.connected ? 'checkmark-circle' : 'mail-outline'}
            size={48}
            color={connectionStatus.connected ? '#4CAF50' : '#999'}
          />
          <Text style={styles.statusTitle}>
            {connectionStatus.connected ? 'Gmail Connected' : 'Gmail Not Connected'}
          </Text>
          {connectionStatus.email && (
            <Text style={styles.statusEmail}>{connectionStatus.email}</Text>
          )}
        </View>

        <Text style={styles.statusDescription}>
          {connectionStatus.connected
            ? 'Your Gmail account is connected. You can import Uber Eats receipts directly from your email.'
            : 'Connect your Gmail to automatically import Uber Eats receipts from your email.'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {!connectionStatus.connected ? (
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={connectGmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Connect Gmail</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, isImporting && styles.buttonDisabled]}
              onPress={importReceipts}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>Import Receipts</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
              onPress={disconnectGmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FF3B30" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
                  <Text style={styles.secondaryButtonText}>Disconnect</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📧 How Gmail Import Works</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>1</Text>
          <Text style={styles.infoText}>Connect your Gmail account securely using Google OAuth</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>2</Text>
          <Text style={styles.infoText}>We&apos;ll scan your email for Uber Eats receipts</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>3</Text>
          <Text style={styles.infoText}>Receipt data is automatically imported to your account</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>4</Text>
          <Text style={styles.infoText}>View your complete spending history and analytics</Text>
        </View>
      </View>

      {/* Privacy Note */}
      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>🔒 Your Privacy Matters</Text>
          <Text style={styles.privacyText}>
            We only request read-only access to your Gmail. Your emails are never stored, and we only extract receipt data from Uber Eats emails.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  statusEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  privacyCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  privacyText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});
