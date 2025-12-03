import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { gmailApi, GmailConnectionStatus } from '../services/gmailApi';
import { useUser } from '../contexts/UserContext';
import { analyticsApi } from '../services/analyticsApi';
import { showAlert, showSimpleAlert } from '../utils/platformAlert';
import { getConfig } from '../config/env';

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

  // Get OAuth client IDs from environment
  const config = getConfig();
  
  // Set up Google OAuth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: config.gmailAndroidClientId,
    iosClientId: config.gmailIosClientId,
    webClientId: config.gmailWebClientId,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Handle OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleTokenExchange(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response.error);
      showSimpleAlert('Authorization Failed', 'Failed to connect Gmail. Please try again.');
    } else if (response?.type === 'cancel') {
      showSimpleAlert('Cancelled', 'Gmail connection was cancelled.');
    }
  }, [response]);

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

  const handleTokenExchange = async (accessToken: string) => {
    try {
      setIsLoading(true);
      
      if (__DEV__) {
        console.log('🔄 Exchanging OAuth token...');
      }
      
      const result = await gmailApi.exchangeToken(accessToken);
      
      if (result.success) {
        setConnectionStatus({ connected: true });
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
      if (!request) {
        showSimpleAlert('Error', 'OAuth configuration not ready. Please check your environment variables.');
        return;
      }

      if (__DEV__) {
        console.log(`🔐 Starting Gmail OAuth flow - Platform: ${Platform.OS}`);
      }
      
      setIsLoading(true);
      await promptAsync();
    } catch (error: any) {
      console.error('❌ Failed to initiate Gmail connection:', error);
      const errorMessage = error.message || 'Failed to open Gmail authorization. Please try again.';
      showSimpleAlert('Error', errorMessage);
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
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to import receipts. Please try again.';
      showSimpleAlert('Error', errorMessage);
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
            style={[styles.primaryButton, (isLoading || !request) && styles.buttonDisabled]}
            onPress={connectGmail}
            disabled={isLoading || !request}
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
