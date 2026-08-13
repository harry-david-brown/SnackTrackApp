import { Colors } from '@/constants/theme';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useUser } from '../../contexts/UserContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import UberDataTutorial, { type DataPlatform } from '../../components/upload/UberDataTutorial';
import EmailVerificationBanner from '../../components/auth/EmailVerificationBanner';
import { HelpSupportModal } from '../../components/profile/HelpSupportModal';
import { CurrencySelectorModal } from '../../components/profile/CurrencySelectorModal';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../../utils/currency';
import { featureFlags } from '../../config/featureFlags';
import { authApi } from '../../services/authApi';
import { getRefreshToken } from '../../utils/tokenManager';
import { useImportPreferences } from '../../hooks/useImportPreferences';
import { showAlert } from '../../utils/platformAlert';
import { useAnalyticsQuery } from '../../hooks/queries/useAnalyticsQueries';

export default function ProfileScreen() {
  const { state, logout } = useUser();
  const { resetOnboarding } = useOnboarding();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingReceipts, setIsClearingReceipts] = useState(false);
  const showReset = featureFlags.showResetOnboarding;
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    isUpdating: areImportPreferencesUpdating,
    refresh: refreshImportPreferences,
    setMonitoringConsent,
    setOngoingTrackingConsent,
    markExportRequested,
  } = useImportPreferences(Boolean(state.user?.id));

  useFocusEffect(
    useCallback(() => {
      void refreshImportPreferences();
    }, [refreshImportPreferences])
  );
  
  const { data: analytics } = useAnalyticsQuery(state.user?.id);

  const handleResetOnboarding = async () => {
    if (isClearingReceipts) return;
    showAlert(
      'Reset Onboarding',
      'This permanently deletes all receipts and stats, disconnects Gmail, stops background syncing, and clears your Uber export progress. Your login remains active. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            setIsClearingReceipts(true);
            try {
              await resetOnboarding();
              showAlert(
                'Account Reset',
                'Your import data has been cleared and Gmail is disconnected.'
              );
              router.replace('/');
            } catch {
              showAlert('Reset Failed', 'Could not reset onboarding. Please try again.');
            } finally {
              setIsClearingReceipts(false);
            }
          }
        },
      ]
    );
  };

  const handleLogout = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Navigation after logout is handled by the Redirect guard in
            // app/(tabs)/_layout.tsx.
            await logout();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCurrencySelect = async (selectedCurrency: CurrencyCode) => {
    await setCurrency(selectedCurrency);
    setShowCurrencySelector(false);
  };

  const handleAutomaticImports = () => {
    const isGranted = importPreferences?.monitoring.consentState === 'granted';

    if (isGranted) {
      showAlert(
        'Turn off export alerts?',
        'SnackTrack will stop checking for Uber’s data-ready email. Your existing imported receipts will remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: () => {
              void setMonitoringConsent('revoked').catch(() => {
                showAlert('Update Failed', 'Could not turn off export alerts. Please try again.');
              });
            },
          },
        ]
      );
      return;
    }

    showAlert(
      'Turn on export-ready alerts?',
      'SnackTrack will check only for Uber’s data-ready email while the app is active. It will not open the link or download the file, and you can turn this off at any time.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Allow',
          onPress: () => {
            void setMonitoringConsent('granted')
              .then((nextPreferences) => {
                if (nextPreferences.monitoring.effectiveState === 'reconnect_required') {
                  showAlert(
                    'Permission saved',
                    'Reconnect Gmail from Import before export-ready alerts can work.'
                  );
                }
              })
              .catch(() => {
                showAlert('Update Failed', 'Could not enable export alerts. Please try again.');
              });
          },
        },
      ]
    );
  };

  const saveProfileExportRequest = async (decision?: 'granted' | 'declined') => {
    try {
      if (decision) {
        await setMonitoringConsent(decision);
      }
      await markExportRequested();
    } catch {
      showAlert(
        'Status Not Saved',
        'The tutorial is complete, but we could not save your export request status.'
      );
    }
  };

  const handleProfileTutorialComplete = (platform: DataPlatform) => {
    setShowTutorial(false);

    if (platform === 'doordash') {
      void saveProfileExportRequest();
      return;
    }

    if (importPreferences?.monitoring.consentState === 'granted') {
      void saveProfileExportRequest();
      return;
    }

    showAlert(
      'Notify you when it’s ready?',
      'Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            void saveProfileExportRequest('declined');
          },
        },
        {
          text: 'Notify Me',
          onPress: () => {
            void saveProfileExportRequest('granted');
          },
        },
      ]
    );
  };

  const automaticImportsLabel = (() => {
    if (areImportPreferencesLoading) {
      return 'Checking...';
    }
    switch (importPreferences?.monitoring.effectiveState) {
      case 'enabled':
        return 'On';
      case 'reconnect_required':
        return 'Reconnect';
      case 'declined':
      case 'disabled':
        return 'Off';
      default:
        return 'Not set';
    }
  })();

  const ongoingTrackingLabel = (() => {
    if (areImportPreferencesLoading) return 'Checking...';
    switch (importPreferences?.ongoingTracking.effectiveState) {
      case 'active': return 'On';
      case 'reconnect_required': return 'Reconnect';
      case 'error': return 'Needs attention';
      case 'paused':
      case 'declined': return 'Off';
      default: return 'Not set';
    }
  })();

  const handleOngoingTracking = () => {
    const active = importPreferences?.ongoingTracking.consentState === 'granted';
    if (active) {
      showAlert(
        'Turn off ongoing tracking?',
        'SnackTrack will stop periodically checking Gmail for new delivery receipts. Your imported history will remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn Off', style: 'destructive',
            onPress: () => { void setOngoingTrackingConsent('revoked'); },
          },
        ]
      );
      return;
    }
    if (!importPreferences?.gmailImport.hasImported || importPreferences.export.status !== 'completed') {
      showAlert(
        'Finish your imports first',
        'Connect Gmail and add your full export before setting up ongoing order tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Import', onPress: () => router.push('/(tabs)/upload') },
        ]
      );
      return;
    }
    if (!importPreferences?.ongoingTracking.capability.canTrack) {
      showAlert(
        'Reconnect Gmail first',
        'Ongoing tracking needs durable Gmail access. Reconnect from the Import screen, then return here.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Import', onPress: () => router.push('/(tabs)/upload') },
        ]
      );
      return;
    }
    showAlert(
      'Allow ongoing order tracking?',
      'SnackTrack will periodically read delivery receipt emails from your connected Gmail account to update spending and stats. You can turn this off at any time.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Allow tracking', onPress: () => { void setOngoingTrackingConsent('granted'); } },
      ]
    );
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://getsnacktrack.com/privacy-policy';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showAlert('Error', 'Unable to open the privacy policy link.');
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.\n\nThis action is irreversible.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const handleClearReceipts = () => {
    if (!state.user || isClearingReceipts) return;

    showAlert(
      'Reset Imported Data',
      'This permanently deletes all receipts and stats, disconnects Gmail, stops background syncing, and clears Uber export progress. Your login remains active.\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: performClearReceipts,
        },
      ]
    );
  };

  const performClearReceipts = async () => {
    if (!state.user) return;

    setIsClearingReceipts(true);

    try {
      await resetOnboarding();
      showAlert(
        'Receipts Cleared',
        'Your account import data has been reset and Gmail is disconnected.'
      );
      router.replace('/');
    } catch (error: any) {
      let errorMessage = 'Failed to clear receipts. Please try again.';

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const apiErrorMessage =
          errorData?.error?.message ||
          errorData?.error ||
          errorData?.message;

        if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 404) {
          errorMessage = 'No receipts were found for this account.';
        } else if (apiErrorMessage) {
          errorMessage = apiErrorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showAlert('Clear Failed', errorMessage);
    } finally {
      setIsClearingReceipts(false);
    }
  };

  const confirmDeleteAccount = () => {
    showAlert(
      'Final Confirmation',
      'This is your last chance to cancel. Your account will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: performAccountDeletion,
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);

    try {
      // Get refresh token to send with deletion request
      const refreshToken = await getRefreshToken();

      // Call the API to delete the account
      await authApi.deleteAccount(refreshToken || undefined);

      // Close the Help & Support modal
      setShowHelpSupport(false);

      // Success - clearing auth state triggers the tabs-layout Redirect
      // back to the login screen.
      await logout();

      showAlert(
        'Account Deleted',
        'Your account has been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {

      let errorMessage = 'Failed to delete account. Please try again.';

      if (error.response) {
        // API returned an error
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 404) {
          errorMessage = 'Account not found. It may have already been deleted.';
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      showAlert('Deletion Failed', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // No need to load analytics - Profile uses shared analytics from context
  // If analytics haven't been loaded yet, the Dashboard will load them when visited

  // If user is logged out, show loading - navigation will be handled by tabs layout
  if (!state.user || !state.isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>👤 Profile</Text>
          <Text style={styles.subtitle}>Account settings</Text>
        
        <EmailVerificationBanner />
        
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {state.user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.email}>{state.user.email}</Text>
          <Text style={styles.memberSince}>
            Member since {formatDate(state.user.createdAt)}
          </Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(analytics?.totalSpent || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics?.totalReceipts || 0}</Text>
              <Text style={styles.statLabel}>Receipts</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/receipts')}
          >
            <Ionicons name="receipt-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>My Receipts</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/upload')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Import Receipts</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAutomaticImports}
            disabled={areImportPreferencesLoading || areImportPreferencesUpdating}
            accessibilityRole="button"
            accessibilityLabel={`Export-ready alerts: ${automaticImportsLabel}`}
          >
            <Ionicons name="sync-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Export-Ready Alerts</Text>
            {areImportPreferencesUpdating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.menuSubtext}>{automaticImportsLabel}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleOngoingTracking}
            disabled={areImportPreferencesLoading || areImportPreferencesUpdating}
            accessibilityRole="button"
            accessibilityLabel={`Ongoing order tracking: ${ongoingTrackingLabel}`}
          >
            <Ionicons name="pulse-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Ongoing Order Tracking</Text>
            <Text style={styles.menuSubtext}>{ongoingTrackingLabel}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowTutorial(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>View Tutorial</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowCurrencySelector(true)}
          >
            <Ionicons name="cash-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Currency</Text>
            <Text style={styles.menuSubtext}>{SUPPORTED_CURRENCIES[currency].symbol} {currency}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowHelpSupport(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>

          {showReset && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleResetOnboarding}
              disabled={isClearingReceipts || isDeleting}
            >
              <Ionicons name="refresh-outline" size={24} color={Colors.warning} />
              <Text style={[styles.menuText, { color: Colors.warning }]}>
                {isClearingReceipts ? 'Resetting Account...' : 'Reset Onboarding (Dev)'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleClearReceipts}
            disabled={isClearingReceipts || isDeleting}
          >
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
            <Text style={[styles.menuText, { color: Colors.error }]}>
              {isClearingReceipts ? 'Resetting Account...' : 'Reset Imported Data'}
            </Text>
            {isClearingReceipts ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={[styles.menuText, { color: Colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>SnackTrack v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️</Text>
        </View>
        </View>
      </ScrollView>

      {/* Tutorial Modal - Full Screen */}
      <Modal
        visible={showTutorial}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTutorial(false)}
      >
        <UberDataTutorial
          mode={
            importPreferences
            && !['not_started', 'completed'].includes(importPreferences.export.status)
              ? 'download'
              : 'request'
          }
          onRequestConfirmed={handleProfileTutorialComplete}
          onClose={() => setShowTutorial(false)}
        />
      </Modal>

      <HelpSupportModal
        visible={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
        onPrivacyPolicy={handlePrivacyPolicy}
        onDeleteAccount={handleDeleteAccount}
        isDeleting={isDeleting}
      />

      <CurrencySelectorModal
        visible={showCurrencySelector}
        currency={currency}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencySelector(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: Colors.white,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: Colors.white,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
  },
  menuSubtext: {
    fontSize: 14,
    color: Colors.gray500,
    marginRight: 8,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: Colors.gray500,
    marginBottom: 4,
  },
});
