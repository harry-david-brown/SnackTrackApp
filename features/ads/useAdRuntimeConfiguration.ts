import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { adsApi } from '@services/adsApi';
import { adKeys } from '@lib/queryKeys';

const MAX_CONFIGURATION_AGE_MS = 90_000;

export const useAdRuntimeConfiguration = (userId?: string | null) => {
  const [appActive, setAppActive] = React.useState(AppState.currentState === 'active');
  const [freshnessClock, setFreshnessClock] = React.useState(Date.now());
  const query = useQuery({
    queryKey: adKeys.runtime(userId ?? 'anonymous'),
    queryFn: adsApi.getRuntime,
    enabled: Boolean(userId) && appActive,
    staleTime: 60_000,
    refetchInterval: appActive ? 60_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const { refetch } = query;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      const active = next === 'active';
      setAppActive(active);
      if (active && userId) void refetch();
    });
    return () => subscription.remove();
  }, [refetch, userId]);

  React.useEffect(() => {
    setFreshnessClock(Date.now());
    if (query.dataUpdatedAt <= 0) return;
    const remaining = query.dataUpdatedAt + MAX_CONFIGURATION_AGE_MS - Date.now();
    const timer = setTimeout(() => setFreshnessClock(Date.now()), Math.max(0, remaining) + 10);
    return () => clearTimeout(timer);
  }, [query.dataUpdatedAt]);

  const configurationFresh = !query.isError && query.dataUpdatedAt > 0 &&
    freshnessClock - query.dataUpdatedAt <= MAX_CONFIGURATION_AGE_MS;
  return {
    configuration: configurationFresh ? query.data ?? null : null,
    configurationFresh,
    appActive,
  };
};
