import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useUser } from '../../contexts/UserContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { router } from 'expo-router';
import { useState } from 'react';
import UberDataTutorial from '../../components/UberDataTutorial';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../../utils/currency';

const resolveAppEnv = () => {
  const extras =
    (Constants.expoConfig?.extra as Record<string, any> | undefined) ??
    ((Constants as any).manifest?.extra as Record<string, any> | undefined) ??
    ((Constants as any).manifest2?.extra as Record<string, any> | undefined) ??
    {};

  return extras.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'production';
};

export default function ProfileScreen() {
  const { state, logout } = useUser();
  const { resetOnboarding } = useOnboarding();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const appEnv = resolveAppEnv();
  const showReset = __DEV__ || appEnv === 'development';
  
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
          onPress: () => {
            logout();
            router.replace('/');
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

  // No need to load analytics - Profile uses shared analytics from context
  // If analytics haven't been loaded yet, the Dashboard will load them when visited

  if (!state.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading...</Text>
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
            onPress={() => router.push('/(tabs)/upload')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Upload Data</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowTutorial(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text style={styles.menuText}>View Tutorial</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowCurrencySelector(true)}
          >
            <Ionicons name="cash-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Currency</Text>
            <Text style={styles.menuSubtext}>{SUPPORTED_CURRENCIES[currency].symbol} {currency}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowHelpSupport(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {showReset && (
            <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
              <Ionicons name="refresh-outline" size={24} color="#FF9500" />
              <Text style={[styles.menuText, { color: '#FF9500' }]}>Reset Onboarding (Dev)</Text>
            </TouchableOpacity>
          )}
          
          {__DEV__ && (
            <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
              <Text style={[styles.menuText, { color: '#ff3b30' }]}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Snack Track v1.0.0</Text>
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

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpSupport}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelpSupport(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setShowHelpSupport(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.helpModalBody}>
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>📋 How to Upload Your Data</Text>
                <Text style={styles.helpSectionText}>
                  1. Open the Uber Eats app or website{'\n'}
                  2. Go to Account → Privacy → Download Your Data{'\n'}
                  3. Request your data download{'\n'}
                  4. Wait for the email (usually 2-3 hours){'\n'}
                  5. Download the ZIP file and upload it here
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>❓ Frequently Asked Questions</Text>
                <Text style={styles.helpSectionText}>
                  <Text style={styles.helpQuestion}>Q: How long does it take to process my data?</Text>{'\n'}
                  A: Usually just a few seconds after upload.{'\n\n'}
                  
                  <Text style={styles.helpQuestion}>Q: Is my data secure?</Text>{'\n'}
                  A: Yes! We only use your data to generate your analytics. We never share it with third parties.{'\n\n'}
                  
                  <Text style={styles.helpQuestion}>Q: Can I delete my account?</Text>{'\n'}
                  A: Yes, contact us at hello@getsnacktrack.com to request account deletion.
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>📧 Contact Us</Text>
                <Text style={styles.helpSectionText}>
                  Need help? Reach out to us:{'\n'}
                  Email: hello@getsnacktrack.com
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>🔒 Privacy Policy</Text>
                <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.privacyLink}>
                  <Text style={styles.privacyLinkText}>View Privacy Policy</Text>
                  <Ionicons name="open-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal
        visible={showCurrencySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencySelector(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.helpModalBody}>
              {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyItem,
                    currency === curr.code && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleCurrencySelect(curr.code)}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{curr.code}</Text>
                      <Text style={styles.currencyName}>{curr.name}</Text>
                    </View>
                  </View>
                  {currency === curr.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: 'white',
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
    color: '#666',
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
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#999',
    marginRight: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginRight: 16,
    width: 40,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  helpModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  helpModalBody: {
    padding: 20,
  },
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  helpSectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  helpQuestion: {
    fontWeight: '600',
    color: '#333',
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginTop: 8,
  },
  privacyLinkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
});
