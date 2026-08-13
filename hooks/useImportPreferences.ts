import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { analyticsKeys, importPreferenceKeys, receiptKeys } from '../lib/queryKeys';
import {
  gmailApi,
  type ImportPreferencesResponse,
} from '../services/gmailApi';

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

  const trackingCheck = useMutation({
    mutationFn: () => gmailApi.checkOngoingTracking(),
    onSuccess: async (result) => {
      writePreferences(result.preferences);
      if (userId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, userId] }),
          queryClient.invalidateQueries({ queryKey: [...receiptKeys.all, userId] }),
        ]);
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
      if (userId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, userId] }),
          queryClient.invalidateQueries({ queryKey: [...receiptKeys.all, userId] }),
        ]);
      }
    },
  });

  const isUpdating = monitoringConsent.isPending
    || ongoingConsent.isPending
    || exportRequested.isPending
    || trackingCheck.isPending
    || gmailImport.isPending;

  const mutationError = monitoringConsent.error
    || ongoingConsent.error
    || exportRequested.error
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
  };
}
