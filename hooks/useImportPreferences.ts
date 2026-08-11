import { useCallback, useEffect, useState } from 'react';
import {
  gmailApi,
  type ImportPreferencesResponse,
} from '../services/gmailApi';

type ExportResetListener = () => void;
const exportResetListeners = new Set<ExportResetListener>();

/** Synchronize mounted preference consumers after the clear-receipts API resets export state. */
export const resetCachedImportExportState = () => {
  exportResetListeners.forEach((listener) => listener());
};

export function useImportPreferences(enabled = true) {
  const [preferences, setPreferences] = useState<ImportPreferencesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleExportReset = () => {
      setPreferences((current) => current ? {
        ...current,
        export: {
          status: 'not_started',
          requestedAt: null,
          updatedAt: new Date().toISOString(),
        },
        gmailImport: {
          ...current.gmailImport,
          status: 'never_started',
          updatedAt: new Date().toISOString(),
          importedCount: 0,
          errorCode: null,
          receiptCount: 0,
          hasImported: false,
        },
        coverage: {
          emailReceiptCount: 0,
          exportReceiptCount: 0,
          hasEmailData: false,
          hasExportData: false,
        },
        ongoingTracking: {
          ...current.ongoingTracking,
          activity: {
            lastCheckAttemptAt: null,
            lastSuccessfulCheckAt: null,
            lastStatsUpdatedAt: null,
            lastNewOrderAt: null,
            ordersAddedThisWeek: 0,
            lastErrorAt: null,
            lastErrorCode: null,
          },
        },
      } : current);
    };

    exportResetListeners.add(handleExportReset);
    return () => {
      exportResetListeners.delete(handleExportReset);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPreferences(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextPreferences = await gmailApi.getImportPreferences();
      setPreferences(nextPreferences);
      return nextPreferences;
    } catch {
      setError('Unable to load export-ready alert settings.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setMonitoringConsent = useCallback(async (
    decision: 'granted' | 'declined' | 'revoked'
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      const nextPreferences = await gmailApi.setMonitoringConsent(decision);
      setPreferences(nextPreferences);
      return nextPreferences;
    } catch (updateError) {
      setError('Unable to update export-ready alert permission.');
      throw updateError;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const markExportRequested = useCallback(async () => {
    setIsUpdating(true);
    setError(null);
    try {
      const nextPreferences = await gmailApi.markExportRequested();
      setPreferences(nextPreferences);
      return nextPreferences;
    } catch (updateError) {
      setError('Unable to save your export request status.');
      throw updateError;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const setOngoingTrackingConsent = useCallback(async (
    decision: 'granted' | 'declined' | 'revoked'
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      const nextPreferences = await gmailApi.setOngoingTrackingConsent(decision);
      setPreferences(nextPreferences);
      return nextPreferences;
    } catch (updateError) {
      setError('Unable to update ongoing tracking permission.');
      throw updateError;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const checkOngoingTracking = useCallback(async () => {
    setIsUpdating(true);
    setError(null);
    try {
      const result = await gmailApi.checkOngoingTracking();
      setPreferences(result.preferences);
      return result;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const importGmailReceipts = useCallback(async () => {
    setIsUpdating(true);
    setError(null);
    setPreferences((current) => current ? {
      ...current,
      gmailImport: {
        ...current.gmailImport,
        status: 'importing',
        errorCode: null,
      },
    } : current);
    try {
      const result = await gmailApi.importReceipts();
      const nextPreferences = await gmailApi.getImportPreferences();
      setPreferences(nextPreferences);
      return result;
    } catch (importError) {
      const nextPreferences = await gmailApi.getImportPreferences().catch(() => null);
      if (nextPreferences) setPreferences(nextPreferences);
      setError('Unable to scan Gmail for delivery receipts.');
      throw importError;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    preferences,
    isLoading,
    isUpdating,
    error,
    refresh,
    setMonitoringConsent,
    setOngoingTrackingConsent,
    checkOngoingTracking,
    importGmailReceipts,
    markExportRequested,
  };
}
