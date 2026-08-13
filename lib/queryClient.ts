import { QueryClient } from '@tanstack/react-query';

const isAuthenticationError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    message?: string;
    response?: { status?: number };
  };
  return candidate.message === 'SESSION_EXPIRED'
    || candidate.response?.status === 401
    || candidate.response?.status === 403;
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
