import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@services/analyticsApi';
import { dashboardInsightsApi } from '@services/dashboardInsightsApi';
import { analyticsKeys } from '@lib/queryKeys';
import React from 'react';
import { AppState } from 'react-native';
import { useCurrency } from '@contexts/CurrencyContext';
import { resolveRecapCurrency } from '@features/wrapped/recapCurrency';

export const getDeviceLocalDate = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useAnalyticsQuery = (userId?: string | null, spendCurrency?: string) =>
  useQuery({
    queryKey: analyticsKeys.summary(userId ?? 'anonymous', spendCurrency),
    queryFn: () => analyticsApi.getUserSummary(userId as string, false, undefined, spendCurrency),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });

export const useWrappedAnalyticsQuery = (userId?: string | null, enabled = true) => {
  const { currency, hasManualSelection } = useCurrency();
  const summaryQuery = useAnalyticsQuery(userId);
  const displayCurrency = resolveRecapCurrency({
    receiptCurrency: summaryQuery.data?.currencyCode,
    selectedCurrency: currency,
    hasManualSelection,
  });
  return useQuery({
    queryKey: analyticsKeys.wrapped(userId ?? 'anonymous', displayCurrency),
    queryFn: () => analyticsApi.getUserSummary(userId as string, true, displayCurrency),
    enabled: Boolean(userId) && enabled && !summaryQuery.isPending,
    staleTime: 10 * 60 * 1000,
  });
};

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
  const { currency, hasManualSelection } = useCurrency();
  return async (userId: string) => {
    const summary = await queryClient.fetchQuery({
      queryKey: analyticsKeys.summary(userId),
      queryFn: () => analyticsApi.getUserSummary(userId, false),
      staleTime: 2 * 60 * 1000,
    });
    const displayCurrency = resolveRecapCurrency({
      receiptCurrency: summary.currencyCode,
      selectedCurrency: currency,
      hasManualSelection,
    });
    return queryClient.prefetchQuery({
      queryKey: analyticsKeys.wrapped(userId, displayCurrency),
      queryFn: () => analyticsApi.getUserSummary(userId, true, displayCurrency),
      staleTime: 10 * 60 * 1000,
    });
  };
};
