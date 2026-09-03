import { Colors } from '@constants/theme';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import { useOnboarding } from '@contexts/OnboardingContext';
import { LoginScreen } from '@components/auth/LoginScreen';
import OnboardingScreen from '@components/OnboardingScreen';
import { useAnalyticsQuery } from '@hooks/queries/useAnalyticsQueries';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { useSetupGuidanceQuery } from '@hooks/queries/useSetupGuidanceQuery';
import { resolveInitialDataEntry } from '@features/import-flow/initialDataEntry';

/**
 * Entry route. Everything here is derived directly from auth/onboarding
 * state — no imperative navigation:
 *   loading      → spinner
 *   authed       → redirect into Home or guided data setup
 *   first launch → onboarding
 *   otherwise    → login
 * The reverse direction (signed out while inside tabs) is handled by the
 * Redirect guard in app/(tabs)/_layout.tsx.
 */
export default function HomeScreen() {
  const { state } = useUser();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const setupGuidanceQuery = useSetupGuidanceQuery(state.user?.id);

  // Wait for auth + onboarding hydration, and — when authenticated — for the
  // lightweight guidance and receipt probes that decide the cold-launch destination.
  const isLoading =
    state.isLoading ||
    onboardingLoading ||
    (state.isAuthenticated && Boolean(state.user)
      && (analyticsQuery.isPending || setupGuidanceQuery.isPending));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (state.isAuthenticated && state.user && analyticsQuery.isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ErrorMessage
            type="network"
            error="We couldn’t load your SnackTrack history. Check your connection and try again."
            onRetry={() => {
              void analyticsQuery.refetch();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (state.isAuthenticated && state.user) {
    const destination = resolveInitialDataEntry({
      isAuthenticated: true,
      hasUser: true,
      totalReceipts: analyticsQuery.data?.totalReceipts ?? null,
      guidance: setupGuidanceQuery.data ?? null,
      isLoading: false,
      hasError: setupGuidanceQuery.isError,
    });
    return <Redirect href={destination.id === 'guided_setup' ? '/(tabs)/upload' : '/(tabs)'} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return <LoginScreen />;
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
