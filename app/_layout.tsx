import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '../contexts/UserContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NetworkStatusIndicator } from '../components/NetworkStatusIndicator';

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
        <OnboardingProvider>
          <UserProvider>
            <NetworkStatusIndicator />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </UserProvider>
        </OnboardingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
