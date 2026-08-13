import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@contexts/UserContext';
import { analyticsKeys, gmailStatusKeys, importPreferenceKeys, receiptKeys } from '@lib/queryKeys';
import {
  gmailApi,
  type ImportPreferencesResponse,
} from '@services/gmailApi';

export function useImportPreferences(enabled = true) {
  const { state } = useUser();
  const userId = state.user?.id;
  const queryClient = useQueryClient();
  const queryKey = importPreferenceKeys.current(userId ?? 'anonymous');

  const preferencesQuery = useQuery({
    queryKey,
    queryFn: gmailApi.getImportPreferences,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
  });

  const writePreferences = (preferences: ImportPreferencesResponse) => {
    queryClient.setQueryData(queryKey, preferences);
    return preferences;
  };

  const invalidateImportDependents = async ({ receipts = false, gmail = false, preferences = true } = {}) => {
    if (!userId) return;
    await Promise.all([
      preferences ? queryClient.invalidateQueries({ queryKey: importPreferenceKeys.current(userId) }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, userId] }),
      receipts ? queryClient.invalidateQueries({ queryKey: [...receiptKeys.all, userId] }) : Promise.resolve(),
      gmail ? queryClient.invalidateQueries({ queryKey: gmailStatusKeys.current(userId) }) : Promise.resolve(),
    ]);
  };

  const monitoringConsent = useMutation({
    mutationFn: (decision: 'granted' | 'declined' | 'revoked') => gmailApi.setMonitoringConsent(decision),
    onSuccess: writePreferences,
  });

  const ongoingConsent = useMutation({
    mutationFn: (decision: 'granted' | 'declined' | 'revoked') => gmailApi.setOngoingTrackingConsent(decision),
    onSuccess: writePreferences,
  });

  const exportRequested = useMutation({
    mutationFn: () => gmailApi.markExportRequested(),
    onSuccess: writePreferences,
  });

  const exportReadyCheck = useMutation({
    mutationFn: () => gmailApi.checkExportReady(),
    onSuccess: (result) => writePreferences(result.preferences),
  });

  const disconnect = useMutation({
    mutationFn: (options?: { resetImportStatus?: boolean }) => gmailApi.disconnect(options),
    onSuccess: async () => {
      queryClient.setQueryData(gmailStatusKeys.current(userId ?? 'anonymous'), { connected: false });
      await invalidateImportDependents({ gmail: true });
    },
  });

  const trackingCheck = useMutation({
    mutationFn: () => gmailApi.checkOngoingTracking(),
    onSuccess: async (result) => {
      writePreferences(result.preferences);
      await invalidateImportDependents({ receipts: true, preferences: false });
    },
    onError: async () => {
      // The API persists reconnect/error details before returning some failed
      // checks. Refresh the authoritative preferences so the dashboard does
      // not continue showing the previous healthy tracking state.
      try {
        await queryClient.fetchQuery({
          queryKey,
          queryFn: gmailApi.getImportPreferences,
          staleTime: 0,
        });
      } catch {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const gmailImport = useMutation({
    mutationFn: () => gmailApi.importReceipts(),
    onMutate: () => {
      queryClient.setQueryData<ImportPreferencesResponse>(queryKey, (current) => current ? {
        ...current,
        gmailImport: { ...current.gmailImport, status: 'importing', errorCode: null },
      } : current);
    },
    onSettled: async () => {
      await queryClient.fetchQuery({
        queryKey,
        queryFn: gmailApi.getImportPreferences,
        staleTime: 0,
      });
      await invalidateImportDependents({ receipts: true, preferences: false });
    },
  });

  const isUpdating = monitoringConsent.isPending
    || ongoingConsent.isPending
    || exportRequested.isPending
    || exportReadyCheck.isPending
    || disconnect.isPending
    || trackingCheck.isPending
    || gmailImport.isPending;

  const mutationError = monitoringConsent.error
    || ongoingConsent.error
    || exportRequested.error
    || exportReadyCheck.error
    || disconnect.error
    || trackingCheck.error
    || gmailImport.error;

  return {
    preferences: preferencesQuery.data ?? null,
    isLoading: enabled && Boolean(userId) && preferencesQuery.isPending,
    isUpdating,
    error: preferencesQuery.isError || mutationError
      ? 'Unable to update import settings. Please try again.'
      : null,
    refresh: async () => {
      if (!enabled || !userId) return null;
      const result = await preferencesQuery.refetch();
      return result.data ?? null;
    },
    setMonitoringConsent: monitoringConsent.mutateAsync,
    setOngoingTrackingConsent: ongoingConsent.mutateAsync,
    checkOngoingTracking: trackingCheck.mutateAsync,
    importGmailReceipts: gmailImport.mutateAsync,
    markExportRequested: exportRequested.mutateAsync,
    checkExportReady: exportReadyCheck.mutateAsync,
    disconnectGmail: disconnect.mutateAsync,
  };
}
