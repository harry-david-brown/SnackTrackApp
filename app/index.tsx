import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { LoginScreen } from '../components/LoginScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import UberDataTutorial from '../components/UberDataTutorial';

export default function HomeScreen() {
  const { state } = useUser();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasCheckedOnboardingRef = useRef(false);


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

  // Separate effect to handle navigation after onboarding completion
  useEffect(() => {
    // Only navigate if user is authenticated AND onboarding is complete AND onboarding is not showing
    // AND analytics are loaded (or at least finished loading) to prevent dashboard pop-in
    // AND onboarding is not loading (to prevent navigation during onboarding check for new users)
    // IMPORTANT: For new registrations, hasCompletedOnboarding will be false until tutorial completes
    // So this ensures tutorial always shows before navigation
    if (
      state.isAuthenticated && 
      state.user && 
      hasCompletedOnboarding && 
      !showOnboarding &&
      !state.analyticsLoading && // Wait for analytics to finish loading
      !onboardingLoading // Wait for onboarding check to finish (prevents race condition)
    ) {
      router.replace('/(tabs)');
    }
  }, [state.isAuthenticated, state.user, hasCompletedOnboarding, showOnboarding, state.analyticsLoading, onboardingLoading]);


  const handleOnboardingComplete = async () => {
    // Don't mark onboarding as complete yet - wait until tutorial is done
    // Just hide the onboarding screen to show the login screen
    setShowOnboarding(false);
  };

  const handleTutorialComplete = async () => {
    try {
      await completeOnboarding();
      
      // Wait a tick for state to propagate, then navigate
      // The navigation effect should handle this, but we'll also try direct navigation as fallback
      setTimeout(() => {
        if (state.isAuthenticated && state.user) {
          router.replace('/(tabs)');
        }
      }, 100);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Show tutorial if user is authenticated but hasn't completed onboarding (new registration)
  // Check this FIRST before loading screens, as new users need to see tutorial
  // BUT: Wait for onboarding to finish loading if we just got a new userId (to avoid race condition)
  const justRegistered = state.isAuthenticated && state.user && onboardingLoading;
  const shouldShowTutorial = state.isAuthenticated && state.user && !hasCompletedOnboarding && !onboardingLoading;

  // If user just registered and onboarding is still loading, wait for it to finish
  if (justRegistered) {
    // Fall through to loading screen check below
  } else if (shouldShowTutorial) {
    return <UberDataTutorial onComplete={handleTutorialComplete} />;
  }

  // Show loading screen while checking authentication, onboarding status, or loading analytics
  // But NOT if we're about to show tutorial (checked above)
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
