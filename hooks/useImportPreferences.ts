import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@contexts/UserContext";
import { importPreferenceKeys } from "@lib/queryKeys";
import {
  type ExportProvider,
  type ImportPreferencesResponse,
  type ProviderRelevance,
} from "@features/import-flow/contracts";
import { gmailApi } from "@services/gmailApi";
import { cacheImportOperation } from "@hooks/useImportOperation";

export function useImportPreferences(enabled = true) {
  const { state } = useUser();
  const userId = state.user?.id;
  const queryClient = useQueryClient();
  const queryKey = importPreferenceKeys.current(userId ?? "anonymous");

  const preferencesQuery = useQuery({
    queryKey,
    queryFn: gmailApi.getImportPreferences,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
  });
  const preferencesQueryRef = useRef(preferencesQuery);
  preferencesQueryRef.current = preferencesQuery;

  const writePreferences = (preferences: ImportPreferencesResponse) => {
    queryClient.setQueryData(queryKey, preferences);
    if (userId) {
      queryClient.setQueryData(
        importPreferenceKeys.setupGuidance(userId),
        preferences.setupGuidance,
      );
    }
    return preferences;
  };

  const offerSeen = useMutation({
    mutationFn: gmailApi.acknowledgeAutomaticUpdatesOffer,
    retry: 2,
    onMutate: () => {
      queryClient.setQueryData<ImportPreferencesResponse>(queryKey, current => current
        ? { ...current, automaticUpdatesOfferSeenAt: current.automaticUpdatesOfferSeenAt ?? new Date().toISOString() } : current);
    },
    onSuccess: writePreferences,
  });

  const providerReadyConsent = useMutation({
    mutationFn: ({provider,decision}:{provider:ExportProvider;decision:'granted'|'declined'|'revoked'})=>gmailApi.setProviderReadyAlertConsent(provider,decision),
    onSuccess:writePreferences,
  });
  const monitoringConsent = useMutation({
    mutationFn: (decision: "granted" | "declined" | "revoked") =>
      gmailApi.setMonitoringConsent(decision),
    onSuccess: writePreferences,
  });

  const ongoingConsent = useMutation({
    mutationFn: (decision: "granted" | "declined" | "revoked") =>
      gmailApi.setOngoingTrackingConsent(decision),
    onSuccess: writePreferences,
  });

  const exportRequested = useMutation({
    mutationFn: (provider: ExportProvider) =>
      gmailApi.markExportRequested(provider),
    onSuccess: writePreferences,
  });

  const exportReadyCheck = useMutation({
    mutationFn: () => gmailApi.checkExportReady(),
    onSuccess: (result) => writePreferences(result.preferences),
  });

  const exportReadyConfirmation = useMutation({
    mutationFn: (provider: ExportProvider) =>
      gmailApi.confirmExportReady(provider),
    onSuccess: writePreferences,
  });

  const setupDeferral = useMutation({
    mutationFn: (decision: "defer" | "resume") =>
      gmailApi.setSetupDeferral(decision),
    onSuccess: (guidance) => {
      if (!userId) return guidance;
      queryClient.setQueryData(importPreferenceKeys.setupGuidance(userId), guidance);
      queryClient.setQueryData<ImportPreferencesResponse | undefined>(queryKey, (current) =>
        current ? { ...current, setupGuidance: guidance } : current,
      );
      return guidance;
    },
  });

  const providerRelevance = useMutation({
    mutationFn: ({ provider, relevance }: { provider: ExportProvider; relevance: ProviderRelevance }) =>
      gmailApi.setProviderRelevance(provider, relevance),
    onSuccess: writePreferences,
  });

  const trackingCheck = useMutation({
    mutationFn: () => gmailApi.checkOngoingTracking(),
    onSuccess: async (result) => {
      if (userId) cacheImportOperation(queryClient, userId, result);
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

  const isUpdating =
    providerReadyConsent.isPending ||
    monitoringConsent.isPending ||
    ongoingConsent.isPending ||
    exportRequested.isPending ||
    exportReadyCheck.isPending ||
    exportReadyConfirmation.isPending ||
    setupDeferral.isPending ||
    providerRelevance.isPending ||
    trackingCheck.isPending;

  const mutationError =
    providerReadyConsent.error ||
    monitoringConsent.error ||
    ongoingConsent.error ||
    exportRequested.error ||
    exportReadyCheck.error ||
    exportReadyConfirmation.error ||
    setupDeferral.error ||
    providerRelevance.error ||
    trackingCheck.error;

  const refresh = useCallback(async () => {
    if (!enabled || !userId) return null;
    const result = await preferencesQueryRef.current.refetch();
    return result.data ?? null;
  }, [enabled, userId]);

  const refreshVerified = useCallback(async () => {
    if (!enabled || !userId) throw new Error('Import preferences unavailable');
    const result = await preferencesQueryRef.current.refetch();
    if (result.isError || !result.data) throw result.error ?? new Error('Import preferences unavailable');
    return result.data;
  }, [enabled, userId]);

  const refreshIfStale = useCallback(async () => {
    if (!enabled || !userId) return null;
    const current = preferencesQueryRef.current;
    if (current.isPending || !current.isStale) return current.data ?? null;
    const result = await current.refetch();
    return result.data ?? null;
  }, [enabled, userId]);

  return {
    preferences: preferencesQuery.data ?? null,
    isLoading: enabled && Boolean(userId) && preferencesQuery.isPending,
    isUpdating,
    queryError: preferencesQuery.isError ? preferencesQuery.error : null,
    mutationError,
    error:
      preferencesQuery.isError || mutationError
        ? "Unable to update import settings. Please try again."
        : null,
    refresh,
    refreshIfStale,
    refreshVerified,
    acknowledgeAutomaticUpdatesOffer: offerSeen.mutateAsync,
    setProviderReadyAlertConsent: providerReadyConsent.mutateAsync,
    setMonitoringConsent: monitoringConsent.mutateAsync,
    setOngoingTrackingConsent: ongoingConsent.mutateAsync,
    checkOngoingTracking: trackingCheck.mutateAsync,
    markExportRequested: exportRequested.mutateAsync,
    confirmExportReady: exportReadyConfirmation.mutateAsync,
    checkExportReady: exportReadyCheck.mutateAsync,
    setSetupDeferral: setupDeferral.mutateAsync,
    setProviderRelevance: (provider: ExportProvider, relevance: ProviderRelevance) =>
      providerRelevance.mutateAsync({ provider, relevance }),
  };
}
