import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import LoginScreen from '../components/LoginScreen';
import OnboardingScreen from '../components/OnboardingScreen';

export default function HomeScreen() {
  const { state } = useUser();
  const { hasCompletedOnboarding, completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if we should show onboarding
    if (!hasCompletedOnboarding && !state.isAuthenticated) {
      setShowOnboarding(true);
    } else if (state.isAuthenticated && state.user) {
      // User is authenticated, navigate to main app
      router.replace('/(tabs)');
    }
  }, [state.isAuthenticated, state.user, hasCompletedOnboarding]);

  const handleOnboardingComplete = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  };

  // Show loading screen while checking authentication
  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  // Show onboarding for first-time users
  if (showOnboarding && !hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show login screen if not authenticated
  if (!state.isAuthenticated) {
    return <LoginScreen />;
  }

  // This should not be reached, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
