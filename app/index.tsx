import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import { useOnboarding } from '@contexts/OnboardingContext';
import { LoginScreen } from '@components/auth/LoginScreen';
import OnboardingScreen from '@components/OnboardingScreen';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { useExperienceStateQuery } from '@hooks/queries/useExperienceStateQuery';
import { loadExportUpsellStateForUser } from '@hooks/useExportUpsell';
import { experienceApi } from '@services/experienceApi';
import { useEffect, useMemo, useRef } from 'react';

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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state } = useUser();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const experienceQuery = useExperienceStateQuery(state.user?.id);
  const migratedLocalRecapFor = useRef<string | null>(null);
  useEffect(() => {
    const userId = state.user?.id;
    if (!userId || experienceQuery.data?.firstRecap.state !== 'ready' || migratedLocalRecapFor.current === userId) return;
    migratedLocalRecapFor.current = userId;
    void loadExportUpsellStateForUser(userId).then(local => {
      if (local.wrappedSeenAt) return experienceApi.markFirstRecapSeen().then(() => experienceQuery.refetch());
      return undefined;
    }).catch(() => undefined);
  }, [experienceQuery, state.user?.id]);

  // Wait for auth + onboarding hydration, and — when authenticated — for the
  // canonical account experience state that decides the cold-launch destination.
  const isLoading =
    state.isLoading ||
    onboardingLoading ||
    (state.isAuthenticated && Boolean(state.user)
      && experienceQuery.isPending);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (state.isAuthenticated && state.user && experienceQuery.isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ErrorMessage
            type="network"
            error="We couldn’t load your SnackTrack setup. Check your connection and try again."
            onRetry={() => {
              void experienceQuery.refetch();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (state.isAuthenticated && state.user) {
    const setupState = experienceQuery.data?.setup.state;
    if (setupState === 'importing') {
      const operationId = experienceQuery.data?.setup.activeOperationId;
      return <Redirect href={operationId ? `/import-progress?operationId=${operationId}` : '/data-setup'} />;
    }
    return <Redirect href={setupState === 'required' ? '/data-setup' : '/(tabs)'} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return <LoginScreen />;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
