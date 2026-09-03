import { onlineManager, QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { toApiClientError } from '@services/api/apiError';

onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => {
  setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
}));

const isAuthenticationError = (error: unknown) => {
  const candidate = toApiClientError(error);
  return candidate.code === 'SESSION_EXPIRED'
    || candidate.statusCode === 401
    || candidate.statusCode === 403;
};

export const createAppQueryClient = (options: { forTests?: boolean } = {}) =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        gcTime: options.forTests ? Infinity : 30 * 60 * 1000,
        retry: options.forTests
          ? false
          : (failureCount, error) => !isAuthenticationError(error) && failureCount < 2,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: {
        gcTime: options.forTests ? Infinity : 5 * 60 * 1000,
        retry: false,
      },
    },
  });

export const appQueryClient = createAppQueryClient();
