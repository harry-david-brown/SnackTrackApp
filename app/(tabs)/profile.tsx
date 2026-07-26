import { Colors } from '@/constants/theme';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useUser } from '../../contexts/UserContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { router } from 'expo-router';
import { useState } from 'react';
import UberDataTutorial from '../../components/upload/UberDataTutorial';
import EmailVerificationBanner from '../../components/auth/EmailVerificationBanner';
import { HelpSupportModal } from '../../components/profile/HelpSupportModal';
import { CurrencySelectorModal } from '../../components/profile/CurrencySelectorModal';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../../utils/currency';
import { featureFlags } from '../../config/featureFlags';
import { authApi } from '../../services/authApi';
import { receiptApi } from '../../services/api';
import { getRefreshToken } from '../../utils/tokenManager';

export default function ProfileScreen() {
  const { state, logout, resetReceiptData } = useUser();
  const { resetOnboarding } = useOnboarding();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingReceipts, setIsClearingReceipts] = useState(false);
  const showReset = featureFlags.showResetOnboarding;
  
  // Use analytics from context instead of loading separately
  const analytics = state.analytics;

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the onboarding flow again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Success', 'Onboarding reset! Logout and login again to see it.');
          }
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
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

  const handlePrivacyPolicy = async () => {
    const url = 'https://getsnacktrack.com/privacy-policy';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open the privacy policy link.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
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
      ],
      { cancelable: true }
    );
  };

  const handleClearReceipts = () => {
    if (!state.user || isClearingReceipts) return;

    Alert.alert(
      'Clear All Receipts',
      'This will permanently delete all of your receipts and reset your spending analytics. Your account will remain active.\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Receipts',
          style: 'destructive',
          onPress: performClearReceipts,
        },
      ],
      { cancelable: true }
    );
  };

  const performClearReceipts = async () => {
    if (!state.user) return;

    setIsClearingReceipts(true);

    try {
      await receiptApi.clearReceipts();
      resetReceiptData();
      Alert.alert('Receipts Cleared', 'All of your receipts have been deleted.');
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

      Alert.alert('Clear Failed', errorMessage);
    } finally {
      setIsClearingReceipts(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
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

      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted.',
        [{ text: 'OK' }],
        { cancelable: false }
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

      Alert.alert('Deletion Failed', errorMessage);
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
            <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
              <Ionicons name="refresh-outline" size={24} color={Colors.warning} />
              <Text style={[styles.menuText, { color: Colors.warning }]}>Reset Onboarding (Dev)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleClearReceipts}
            disabled={isClearingReceipts || isDeleting}
          >
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
            <Text style={[styles.menuText, { color: Colors.error }]}>
              {isClearingReceipts ? 'Clearing Receipts...' : 'Clear My Receipts'}
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
        <UberDataTutorial onComplete={() => setShowTutorial(false)} />
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
