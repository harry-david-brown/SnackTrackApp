import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { appQueryClient } from '@lib/queryClient';
import { UserProvider, useUser } from '@contexts/UserContext';
import { OnboardingProvider } from '@contexts/OnboardingContext';
import { CurrencyProvider } from '@contexts/CurrencyContext';
import { ErrorBoundary } from '@components/ui/ErrorBoundary';
import { AppAlertProvider } from '@components/ui/AppAlertProvider';
import ExportReadyNotifier from '@components/upload/ExportReadyNotifier';
import { ImportBackgroundController } from '@components/import/ImportBackgroundController';
import { ImportNotificationController } from '@components/import/ImportNotificationController';
import { AdminAnalyticsController } from '@components/analytics/AdminAnalyticsController';
import { initSentry } from '@utils/sentry';
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
} from '@expo-google-fonts/fredoka';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { AppearanceProvider, useAppearance } from '@contexts/AppearanceContext';
import { NavigationPolicyProvider, resolveSessionNavigationState } from '@features/navigation';
import type { AppTheme } from '@constants/theme';
import { useEffect } from 'react';
import { prepareImportFileCache } from '@services/importFileCache';
import { MotionProvider, useAppReducedMotion } from '@contexts/MotionContext';

// Initialize Sentry as early as possible
initSentry();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useEffect(() => { void prepareImportFileCache(); }, []);
  return (
    <AppearanceProvider>
      <MotionProvider><ThemedRootLayout /></MotionProvider>
    </AppearanceProvider>
  );
}

function ThemedRootLayout() {
  const { theme, scheme, isReady } = useAppearance();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
  });
  useEffect(() => {
    if (fontsLoaded && isReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, isReady]);
  if (!fontsLoaded || !isReady) return null;
  const navigationBase = scheme === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
  const navigationTheme = {
    ...navigationBase,
    colors: {
      ...navigationBase.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.divider,
      notification: theme.colors.error,
    },
  };

  return (
    // Required for react-native-gesture-handler gestures (Wrapped drag-to-dismiss).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={navigationTheme}>
        <ErrorBoundary>
          <AppAlertProvider>
            <QueryClientProvider client={appQueryClient}>
              <CurrencyProvider>
                <UserProvider>
                  <AdminAnalyticsController />
                  <NavigationPolicyProvider>
                    <OnboardingProvider>
                      <SessionNavigation theme={theme} />
                      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                    </OnboardingProvider>
                  </NavigationPolicyProvider>
                </UserProvider>
              </CurrencyProvider>
            </QueryClientProvider>
          </AppAlertProvider>
        </ErrorBoundary>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

function SessionNavigation({ theme }: { theme: AppTheme }) {
  const reduceMotion = useAppReducedMotion();
  const { state } = useUser();
  const sessionNavigation = resolveSessionNavigationState({
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    hasUser: Boolean(state.user),
  });

  return (
    <>
      {sessionNavigation.mountAuthenticatedControllers ? (
        <>
          <ExportReadyNotifier />
          <ImportBackgroundController />
          <ImportNotificationController />
        </>
      ) : null}
      <Stack
        screenOptions={{
          animation: reduceMotion ? 'none' : 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: reduceMotion ? 'none' : 'fade',
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: reduceMotion ? 'none' : 'fade',
          }}
        />
        <Stack.Protected guard={sessionNavigation.protectedRoutesAvailable}>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          />
          <Stack.Screen
            name="oauth-callback"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: reduceMotion ? 'none' : 'fade',
            }}
          />
          <Stack.Screen
            name="receipts"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              presentation: 'card',
            }}
          />
          <Stack.Screen name="data-setup" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="add-history" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="import-progress" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="ongoing-updates" options={{ headerShown: false }} />
          <Stack.Screen name="import-result" options={{ headerShown: false }} />
          <Stack.Screen name="data-tracking" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="data-tracking/email" options={{ headerShown: false }} />
          <Stack.Screen name="data-tracking/history" options={{ headerShown: false }} />
          <Stack.Screen name="data-tracking/provider/[provider]" options={{ headerShown: false }} />
          <Stack.Screen name="settings/appearance" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="settings/currency" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="settings/help-privacy" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="settings/accounts-permissions" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="dev/visual-gallery" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
