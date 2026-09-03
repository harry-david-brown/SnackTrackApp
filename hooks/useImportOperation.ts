import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useUser } from '@contexts/UserContext';
import type { ImportOperation } from '@features/import-flow/contracts';
import { isActiveImportOperation } from '@features/import-flow/contracts';
import { importOperationKeys } from '@lib/queryKeys';
import { invalidateImportState, invalidateReceiptDerivedData } from '@lib/queryInvalidation';
import { importOperationsApi } from '@services/importOperationsApi';

export const cacheImportOperation = (queryClient: QueryClient, userId: string, operation: ImportOperation): void => {
  queryClient.setQueryData(importOperationKeys.active(userId), operation);
};

export function useImportOperation(enabled = true, announce = false, watchedOperationId?: string) {
  const { state } = useUser();
  const userId = state.user?.id;
  const queryClient = useQueryClient();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const announced = useRef<string|null>(null);
  const queryKey = watchedOperationId && userId
    ? importOperationKeys.detail(userId, watchedOperationId)
    : importOperationKeys.active(userId ?? 'anonymous');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => subscription.remove();
  }, []);

  const query = useQuery({
    queryKey,
    enabled: enabled && Boolean(userId),
    queryFn: async () => {
      const current = queryClient.getQueryData<ImportOperation|null>(importOperationKeys.active(userId!));
      if (watchedOperationId) return importOperationsApi.get(watchedOperationId);
      return current && isActiveImportOperation(current) ? importOperationsApi.get(current.id) : importOperationsApi.getActive();
    },
    refetchInterval: (state) => foreground && isActiveImportOperation(state.state.data) ? 2_000 : false,
    staleTime: 1_000,
  });
  const { data: operation, isPending, refetch } = query;

  useEffect(() => {
    if (watchedOperationId && userId) void refetch();
  }, [refetch, userId, watchedOperationId]);

  useEffect(() => {
    if (foreground) void refetch();
  }, [foreground, refetch]);

  useEffect(() => {
    if (!announce || !userId || !operation || isActiveImportOperation(operation) || announced.current === `${operation.id}:${operation.status}`) return;
    announced.current = `${operation.id}:${operation.status}`;
    if (operation.status === 'succeeded') {
      void Promise.all([invalidateReceiptDerivedData(queryClient, userId), invalidateImportState(queryClient, userId)]);
      AccessibilityInfo.announceForAccessibility('Import complete. SnackTrack has refreshed your order history.');
    } else if (operation.status === 'failed' || operation.status === 'cancelled') {
      void invalidateImportState(queryClient, userId);
      AccessibilityInfo.announceForAccessibility(operation.status === 'cancelled'
        ? 'Import cancelled by an administrator.'
        : 'Import needs attention. Open Add and manage data to review it.');
    }
  }, [announce, operation, queryClient, userId]);

  return { operation: operation ?? null, isLoading: isPending, refresh: refetch };
}
