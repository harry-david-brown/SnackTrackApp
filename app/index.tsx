import { Colors } from '@/constants/theme';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { LoginScreen } from '../components/auth/LoginScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import { useAnalyticsQuery } from '../hooks/queries/useAnalyticsQueries';

/**
 * Entry route. Everything here is derived directly from auth/onboarding
 * state — no imperative navigation:
 *   loading      → spinner
 *   authed       → redirect into tabs (upload first if no data yet)
 *   first launch → onboarding
 *   otherwise    → login
 * The reverse direction (signed out while inside tabs) is handled by the
 * Redirect guard in app/(tabs)/_layout.tsx.
 */
export default function HomeScreen() {
  const { state } = useUser();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const analyticsQuery = useAnalyticsQuery(state.user?.id);

  // Wait for auth + onboarding hydration, and — when authenticated — for the
  // analytics probe that decides whether to land on Upload or Dashboard.
  const isLoading =
    state.isLoading ||
    onboardingLoading ||
    (state.isAuthenticated && Boolean(state.user) && analyticsQuery.isPending);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (state.isAuthenticated && state.user) {
    const totalImportedReceipts = analyticsQuery.data?.totalReceipts ?? 0;
    return <Redirect href={totalImportedReceipts > 0 ? '/(tabs)' : '/(tabs)/upload'} />;
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
});
