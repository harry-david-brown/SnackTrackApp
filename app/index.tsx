import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { LoginScreen } from '../components/auth/LoginScreen';
import OnboardingScreen from '../components/OnboardingScreen';

export default function HomeScreen() {
  const { state } = useUser();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasCheckedOnboardingRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!state.isAuthenticated) {
      hasNavigatedRef.current = false;
    }
  }, [state.isAuthenticated]);


  useEffect(() => {
    // Wait for both contexts to finish loading before checking onboarding
    if (state.isLoading || onboardingLoading) {
      return;
    }

    // Initial check: decide whether to show onboarding
    if (!hasCheckedOnboardingRef.current) {
      hasCheckedOnboardingRef.current = true;
      
      // Show onboarding on first launch if not completed yet
      if (!hasCompletedOnboarding && !state.isAuthenticated) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
      return;
    }

    // After initial check, handle state changes:
    // 1. Hide onboarding if it gets completed
    if (hasCompletedOnboarding && showOnboarding) {
      setShowOnboarding(false);
    }
    
    // 2. Hide onboarding if user becomes authenticated
    if (state.isAuthenticated && showOnboarding) {
      setShowOnboarding(false);
    }
  }, [hasCompletedOnboarding, state.isAuthenticated, state.isLoading, onboardingLoading, showOnboarding]);

  useEffect(() => {
    if (!state.isAuthenticated || !state.user || showOnboarding || onboardingLoading) {
      return;
    }

    if (state.analyticsLoading) {
      return;
    }

    if (hasNavigatedRef.current) {
      return;
    }

    const totalImportedReceipts = state.analytics?.totalReceipts ?? state.user.receiptCount ?? 0;
    const hasImportedData = totalImportedReceipts > 0;

    hasNavigatedRef.current = true;

    if (
      !hasImportedData
    ) {
      router.replace('/(tabs)/upload?openGmail=true');
      return;
    }

    router.replace('/(tabs)');
  }, [
    state.isAuthenticated,
    state.user,
    state.analytics,
    state.analyticsLoading,
    showOnboarding,
    onboardingLoading,
  ]);

  const handleOnboardingComplete = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  };

  const isLoading = state.isLoading || onboardingLoading || (state.isAuthenticated && state.user && state.analyticsLoading);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  // Show onboarding on first launch
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show login screen if not authenticated
  return <LoginScreen />;
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
