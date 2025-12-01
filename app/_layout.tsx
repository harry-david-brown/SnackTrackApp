import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '../contexts/UserContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initSentry } from '../utils/sentry';

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
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <UserProvider>
            <OnboardingProvider>
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
                <Stack.Screen 
                  name="index" 
                  options={{ 
                    headerShown: false, 
                    contentStyle: { backgroundColor: 'transparent' },
                    animation: 'fade',
                  }} 
                />
                <Stack.Screen 
                  name="oauth-callback" 
                  options={{ 
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' },
                    animation: 'fade',
                  }} 
                />
                <Stack.Screen 
                  name="receipts" 
                  options={{ 
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' },
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
  );
}
