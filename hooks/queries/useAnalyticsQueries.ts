import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../../services/analyticsApi';
import { analyticsKeys } from '../../lib/queryKeys';

export const useAnalyticsQuery = (userId?: string | null) =>
  useQuery({
    queryKey: analyticsKeys.summary(userId ?? 'anonymous'),
    queryFn: () => analyticsApi.getUserSummary(userId as string, false),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });

export const useWrappedAnalyticsQuery = (userId?: string | null, enabled = true) =>
  useQuery({
    queryKey: analyticsKeys.wrapped(userId ?? 'anonymous'),
    queryFn: () => analyticsApi.getUserSummary(userId as string, true),
    enabled: Boolean(userId) && enabled,
    staleTime: 10 * 60 * 1000,
  });

export const usePrefetchWrappedAnalytics = () => {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.prefetchQuery({
    queryKey: analyticsKeys.wrapped(userId),
    queryFn: () => analyticsApi.getUserSummary(userId, true),
    staleTime: 10 * 60 * 1000,
  });
};

