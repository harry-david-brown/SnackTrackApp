import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { gmailApi, GmailConnectionStatus } from '../services/gmailApi';
import { useUser } from '../contexts/UserContext';
import { analyticsApi } from '../services/analyticsApi';

interface GmailConnectionProps {
  onImportSuccess?: () => void;
}

// Warm up the browser for better UX
WebBrowser.maybeCompleteAuthSession();

export const GmailConnection: React.FC<GmailConnectionProps> = ({ onImportSuccess }) => {
  const { state, setAnalytics } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<GmailConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkConnectionStatus();
    
    // Set up deep link listener for mobile
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // For web, check if we have an OAuth code from localStorage
    if (Platform.OS === 'web') {
      checkWebOAuthCode();
    }
    
    return () => {
      subscription.remove();
    };
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

  const checkWebOAuthCode = async () => {
    if (Platform.OS !== 'web') return;

    try {
      const code = localStorage.getItem('gmail_oauth_code');
      const timestamp = localStorage.getItem('gmail_oauth_timestamp');
      
      if (!code || !timestamp) return;
      
      // Check if code is recent (within last 5 minutes)
      const codeAge = Date.now() - parseInt(timestamp);
      if (codeAge > 5 * 60 * 1000) {
        // Code is too old, clear it
        localStorage.removeItem('gmail_oauth_code');
        localStorage.removeItem('gmail_oauth_timestamp');
        return;
      }

      // Clear the code immediately to prevent reprocessing
      localStorage.removeItem('gmail_oauth_code');
      localStorage.removeItem('gmail_oauth_timestamp');

      // Exchange the code
      setIsLoading(true);
      const response = await gmailApi.exchangeToken(code);
      
      if (response.success) {
        setConnectionStatus({ connected: true });
        Alert.alert('Success', 'Gmail connected successfully! You can now import your receipts.');
      } else {
        Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
      }
    } catch (error: any) {
      console.error('Web OAuth code exchange error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to connect Gmail. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    try {
      const url = event.url;
      
      // Check if this is an OAuth callback
      if (!url.includes('oauth/callback')) {
        return;
      }

      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code as string | undefined;
      const error = queryParams?.error as string | undefined;

      if (error) {
        Alert.alert('Authorization Failed', 'Failed to connect Gmail. Please try again.');
        return;
      }

      if (!code) {
        return;
      }

      setIsLoading(true);

      try {
        // Exchange authorization code for tokens
        const response = await gmailApi.exchangeToken(code);
        
        if (response.success) {
          setConnectionStatus({ connected: true });
          Alert.alert('Success', 'Gmail connected successfully! You can now import your receipts.');
        } else {
          Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
        }
      } catch (error: any) {
        console.error('Token exchange error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to connect Gmail. Please try again.';
        Alert.alert('Error', errorMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
    }
  };

  const connectGmail = async () => {
    try {
      setIsLoading(true);
      
      // Get platform-specific OAuth URL from API
      const { authUrl, platform: detectedPlatform } = await gmailApi.getAuthUrl();
      
      if (__DEV__) {
        console.log(`🔐 Starting Gmail OAuth flow - Platform: ${Platform.OS}`);
        console.log(`   Detected platform: ${detectedPlatform}`);
      }
      
      if (Platform.OS === 'web') {
        // WEB: Redirect to Google OAuth (will redirect back to /oauth-callback)
        if (__DEV__) {
          console.log('🌐 Web: Redirecting to Google OAuth...');
        }
        window.location.href = authUrl;
      } else {
        // MOBILE: Open system browser with deep link callback
        if (__DEV__) {
          console.log('📱 Mobile: Opening system browser with deep linking...');
        }
        
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          'snacktrack://oauth/callback'
        );

        if (result.type === 'success' && result.url) {
          await handleDeepLink({ url: result.url });
        } else if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Gmail connection was cancelled.');
        }
        
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Failed to initiate Gmail connection:', error);
      const errorMessage = error.response?.data?.error || 'Failed to open Gmail authorization. Please try again.';
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  };

  const importReceipts = async () => {
    Alert.alert(
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
        Alert.alert(
          'Import Complete',
          `Successfully imported ${result.totalReceiptsImported} receipt${result.totalReceiptsImported !== 1 ? 's' : ''} ($${result.totalAmount.toFixed(2)})`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Refresh analytics
                if (state.user) {
                  try {
                    const summary = await analyticsApi.getUserSummary(state.user.id, true);
                    setAnalytics(summary);
                  } catch (error) {
                    console.warn('Failed to refresh analytics:', error);
                  }
                }
                onImportSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert('Import Failed', 'Failed to import receipts. Please try again.');
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to import receipts. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const disconnectGmail = async () => {
    Alert.alert(
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
              Alert.alert('Success', 'Gmail account disconnected.');
            } catch (error) {
              console.error('Disconnect failed:', error);
              Alert.alert('Error', 'Failed to disconnect Gmail. Please try again.');
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
          <Text style={styles.infoText}>We'll scan your email for Uber Eats receipts</Text>
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

