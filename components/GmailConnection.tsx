import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { gmailApi, GmailConnectionStatus } from '../services/gmailApi';
import { useUser } from '../contexts/UserContext';
import { analyticsApi } from '../services/analyticsApi';
import { showAlert, showSimpleAlert } from '../utils/platformAlert';
import { getConfig } from '../config/env';

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

  // Configure Google Sign-In
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        if (Platform.OS === 'android') {
          if (config.gmailAndroidClientId && config.gmailWebClientId) {
            GoogleSignin.configure({
              webClientId: config.gmailWebClientId, // Required for offline access
              offlineAccess: true, // Get refresh token
              scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
            });
            console.log('✅ Google Sign-In configured for Android');
          } else {
            console.warn('⚠️ Google Sign-In not configured for Android - missing client IDs');
          }
        } else if (Platform.OS === 'ios') {
          if (config.gmailIosClientId && config.gmailWebClientId) {
            GoogleSignin.configure({
              webClientId: config.gmailWebClientId, // Required for offline access
              iosClientId: config.gmailIosClientId,
              offlineAccess: true, // Get refresh token
              scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
            });
            console.log('✅ Google Sign-In configured for iOS');
          } else {
            console.warn('⚠️ Google Sign-In not configured for iOS - missing client IDs (iOS setup on hold)');
          }
        } else if (Platform.OS === 'web') {
          console.log('ℹ️ Google Sign-In not available on web platform');
        }
      } catch (error) {
        console.error('❌ Failed to configure Google Sign-In:', error);
      }
    };

    configureGoogleSignIn();
    checkConnectionStatus();
  }, []);

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

  const handleTokenExchange = async (accessToken: string, refreshToken?: string) => {
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
        if (__DEV__) {
          console.log('✅ Connection status refreshed:', connectionStatus);
        }
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
  };

  const connectGmail = async () => {
    try {
      setIsLoading(true);

      if (__DEV__) {
        console.log(`🔐 Starting Gmail OAuth flow - Platform: ${Platform.OS}`);
      }

      // Check platform support
      if (Platform.OS === 'web') {
        showSimpleAlert('Not Available', 'Gmail connection is not available on web. Please use the mobile app.');
        return;
      }

      if (Platform.OS === 'ios' && !config.gmailIosClientId) {
        showSimpleAlert('Not Configured', 'Gmail connection is not configured for iOS yet. Please configure iOS OAuth client ID.');
        return;
      }

      if (Platform.OS === 'android' && !config.gmailAndroidClientId) {
        showSimpleAlert('Not Configured', 'Gmail connection is not configured for Android. Please configure Android OAuth client ID.');
        return;
      }

      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Always sign out any existing Google account to force account selection
      // This ensures the account picker is shown even if there's a cached account
      try {
        await GoogleSignin.signOut();
        console.log('🔓 Signed out any existing Google account to force account selection');
      } catch (error: any) {
        // Ignore errors when signing out (might not be signed in)
        // This is fine - we just want to ensure a fresh sign-in flow
        if (__DEV__) {
          console.log('ℹ️ Sign out skipped (no existing account or error):', error?.message);
        }
      }

      // Sign in with Google - this should now show the account picker
      const signInResult = await GoogleSignin.signIn();
      
      if (__DEV__) {
        console.log('✅ Google Sign-In successful:', {
          email: signInResult.data?.user?.email,
          id: signInResult.data?.user?.id,
          serverAuthCode: !!signInResult.data?.serverAuthCode,
          // Log full response structure for debugging
          responseKeys: Object.keys(signInResult.data || {})
        });
      }
      
      // Get the tokens (includes refresh token if offlineAccess is true)
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        if (__DEV__) {
          console.log('✅ Got tokens from Google Sign-In:', {
            hasAccessToken: !!tokens.accessToken,
            idToken: tokens.idToken ? 'present' : 'missing',
            // Check if refreshToken exists in tokens object
            tokenKeys: Object.keys(tokens),
            // Try to access refreshToken even if TypeScript doesn't know about it
            refreshToken: (tokens as any).refreshToken ? 'present' : 'missing'
          });
        }
        
        // Try to get refresh token - it might be in the tokens object even if not typed
        const refreshToken = (tokens as any).refreshToken;
        
        // Send access token (and refresh token if available)
        // If refresh token is not available, backend will use access token directly
        await handleTokenExchange(tokens.accessToken, refreshToken);
      } else {
        throw new Error('No access token received from Google Sign-In');
      }
    } catch (error: any) {
      console.error('❌ Failed to connect Gmail:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showSimpleAlert('In Progress', 'Gmail connection is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showSimpleAlert('Error', 'Google Play Services not available. Please update Google Play Services.');
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
