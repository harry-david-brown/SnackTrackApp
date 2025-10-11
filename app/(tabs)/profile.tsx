import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { router } from 'expo-router';
import { analyticsApi } from '../../services/analyticsApi';
import { UserSummary } from '../../types/api';
import { useState, useEffect } from 'react';
import OnboardingScreen from '../../components/OnboardingScreen';

export default function ProfileScreen() {
  const { state, logout } = useUser();
  const { resetOnboarding } = useOnboarding();
  const [analytics, setAnalytics] = useState<UserSummary | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const loadAnalytics = async () => {
    if (!state.user) return;
    
    try {
      const summary = await analyticsApi.getUserSummary(state.user.id);
      setAnalytics(summary);
    } catch (error) {
      // Keep analytics as null to show basic user data
    }
  };

  useEffect(() => {
    if (state.user) {
      loadAnalytics();
    }
  }, [state.user]);

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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>👤 Profile</Text>
          <Text style={styles.subtitle}>Account settings</Text>
        
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
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="person-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="analytics-outline" size={24} color="#666" />
            <Text style={styles.menuText}>View Analytics</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="cloud-upload-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Upload Data</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowOnboarding(true)}>
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text style={styles.menuText}>View Tutorial</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
              <Ionicons name="refresh-outline" size={24} color="#FF9500" />
              <Text style={[styles.menuText, { color: '#FF9500' }]}>Reset Onboarding (Dev)</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
            <Text style={[styles.menuText, { color: '#ff3b30' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Snack Track v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️</Text>
        </View>
        </View>
      </ScrollView>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      )}
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
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
});
