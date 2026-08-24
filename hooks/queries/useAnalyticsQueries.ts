import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@services/analyticsApi';
import { dashboardInsightsApi } from '@services/dashboardInsightsApi';
import { analyticsKeys } from '@lib/queryKeys';
import React from 'react';
import { AppState } from 'react-native';

export const getDeviceLocalDate = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export const useDashboardInsightsQuery = (userId?: string | null, devDayOffset = 0) => {
  const [localDate, setLocalDate] = React.useState(() => getDeviceLocalDate());
  const query = useQuery({
    queryKey: analyticsKeys.dashboardInsights(userId ?? 'anonymous', localDate, devDayOffset),
    queryFn: () => dashboardInsightsApi.getEdition(userId as string, devDayOffset),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
    placeholderData: previousEdition => previousEdition,
  });

  React.useEffect(() => {
    const updateDate = () => setLocalDate(current => {
      const next = getDeviceLocalDate();
      return next === current ? current : next;
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') updateDate();
    });
    const refreshAt = query.data?.nextRefreshAt ? Date.parse(query.data.nextRefreshAt) : Number.NaN;
    const delay = Number.isFinite(refreshAt)
      ? Math.max(250, Math.min(refreshAt - Date.now() + 250, 2_147_483_647))
      : 60 * 60 * 1000;
    const timer = setTimeout(updateDate, delay);
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [query.data?.nextRefreshAt]);

  return { ...query, localDate };
};

export const usePrefetchWrappedAnalytics = () => {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.prefetchQuery({
    queryKey: analyticsKeys.wrapped(userId),
    queryFn: () => analyticsApi.getUserSummary(userId, true),
    staleTime: 10 * 60 * 1000,
  });
};
