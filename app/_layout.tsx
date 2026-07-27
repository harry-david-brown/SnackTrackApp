import { Colors } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '../contexts/UserContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { initSentry } from '../utils/sentry';
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

// Initialize Sentry as early as possible
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  // Start loading Wrapped typography with the app rather than when the Summary
  // tab is first opened. The journey still verifies readiness before rendering,
  // but in normal navigation these fonts are already warm.
  useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  return (
    // Required for react-native-gesture-handler gestures (Wrapped drag-to-dismiss).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <UserProvider>
            <OnboardingProvider>
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: Colors.transparent },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: Colors.transparent } }} />
                <Stack.Screen 
                  name="index" 
                  options={{ 
                    headerShown: false, 
                    contentStyle: { backgroundColor: Colors.transparent },
                    animation: 'fade',
                  }} 
                />
                <Stack.Screen
                  name="login"
                  options={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.transparent },
                    animation: 'fade',
                  }}
                />
                <Stack.Screen 
                  name="oauth-callback" 
                  options={{ 
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.transparent },
                    animation: 'fade',
                  }} 
                />
                <Stack.Screen 
                  name="receipts" 
                  options={{ 
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.transparent },
                    presentation: 'card',
                  }} 
                />
              </Stack>
              <StatusBar style="auto" />
            </OnboardingProvider>
          </UserProvider>
        </CurrencyProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
