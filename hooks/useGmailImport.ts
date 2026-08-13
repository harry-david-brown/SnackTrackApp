import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { gmailApi, GmailConnectionStatus, type GmailImportResponse } from '@services/gmailApi';
import { useUser } from '@contexts/UserContext';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { gmailStatusKeys } from '@lib/queryKeys';
import { toDomainError } from '@utils/domainError';
import { captureException } from '@utils/sentry';
import { invalidateImportState, invalidateReceiptDerivedData } from '@lib/queryInvalidation';

WebBrowser.maybeCompleteAuthSession();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GmailPrimaryFlowState = 'idle' | 'connecting' | 'preparing_import' | 'importing';

interface UseGmailImportOptions {
  onImportSuccess?: (result: GmailImportResponse) => void;
  onDisconnectSuccess?: () => void;
}

export function useGmailImport(options: UseGmailImportOptions = {}) {
  const { onImportSuccess, onDisconnectSuccess } = options;
  const { state } = useUser();
  const queryClient = useQueryClient();
  const userId = state.user?.id;
  const statusKey = gmailStatusKeys.current(userId ?? 'anonymous');
  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: gmailApi.getStatus,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
  const connectionStatus = statusQuery.data ?? { connected: false };
  const [isLoading, setIsLoading] = useState(false);
  const [primaryFlowState, setPrimaryFlowState] = useState<GmailPrimaryFlowState>('idle');
  const activePrimaryFlowPromise = useRef<Promise<boolean> | null>(null);
  const handledAutoImportFlowIds = useRef(new Set<string>());
  const safetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
    };
  }, []);

  const isPrimaryActionInProgress = primaryFlowState !== 'idle';

  const refreshConnectionStatus = useCallback(async () => {
    try {
      if (!userId) return null;
      return await queryClient.fetchQuery({
        queryKey: statusKey,
        queryFn: gmailApi.getStatus,
        staleTime: 0,
      });
    } catch {
      return null;
    }
  }, [queryClient, statusKey, userId]);

  const importReceiptsInternal = useCallback(async (statusOverride?: GmailConnectionStatus | null) => {
    try {
      const effectiveStatus = statusOverride ?? connectionStatus;

      if (effectiveStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', effectiveStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return false;
      }

      const result = await gmailApi.importReceipts();

      if (result.success) {
        if (userId) await invalidateReceiptDerivedData(queryClient, userId);
        try {
          onImportSuccess?.(result);
        } catch (error) {
          captureException(error instanceof Error ? error : new Error('Gmail import callback failed'), { context: 'gmail-import-callback' });
        }

        return true;
      }

      showSimpleAlert('Import Failed', 'Failed to import receipts. Please try again.');
      return false;
    } catch (error: unknown) {
      const domainError = toDomainError(error);
      if (domainError.code === 'IMPORT_IN_PROGRESS') {
        showSimpleAlert(
          'Import Already Running',
          'A receipt import is already running for your account. Please wait for it to complete.'
        );
      } else if (domainError.code === 'GMAIL_RECONNECT_REQUIRED') {
        showSimpleAlert(
          'Reconnect Gmail',
          'Reconnect Gmail to continue.'
        );
        await refreshConnectionStatus();
      } else if (domainError.code === 'GMAIL_VALIDATION_UNAVAILABLE') {
        showSimpleAlert(
          'Couldn’t verify Gmail',
          'Gmail could not be reached. Please try again shortly.'
        );
      } else if (domainError.kind === 'network') {
        showSimpleAlert(
          'Import Timeout',
          'The import is taking longer than expected. This might mean you have many emails to process. Please try again or check your connection.'
        );
      } else {
        showSimpleAlert(
          'Import Failed',
          domainError.message
        );
      }

      return false;
    }
  }, [connectionStatus, onImportSuccess, queryClient, refreshConnectionStatus, userId]);

  const waitForImportReady = useCallback(async () => {
    let latestStatus: GmailConnectionStatus | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      latestStatus = await refreshConnectionStatus();

      if (!latestStatus?.connected) {
        return latestStatus;
      }

      if (latestStatus.canImport !== false) {
        return latestStatus;
      }

      await sleep(500);
    }

    return latestStatus;
  }, [refreshConnectionStatus]);

  const connectGmailInternal = useCallback(async (autoImportGmail = true): Promise<GmailConnectionStatus | null> => {
    try {
      setIsLoading(true);
      setPrimaryFlowState('connecting');

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'snacktrack',
        path: 'oauth-callback',
      });

      const { authUrl } = await gmailApi.getAuthUrl(redirectUri, autoImportGmail);
      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (authResult.type !== 'success' || !authResult.url) {
        if (authResult.type !== 'cancel' && authResult.type !== 'dismiss') {
          showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
        }
        return null;
      }

      const resultUrl = new URL(authResult.url);
      const gmailResult = resultUrl.searchParams.get('gmail');
      const errorMessage = resultUrl.searchParams.get('error');

      if (gmailResult !== 'success') {
        showSimpleAlert('Error', errorMessage || 'Failed to connect Gmail. Please try again.');
        return null;
      }

      setPrimaryFlowState('preparing_import');
      const readyStatus = await waitForImportReady();

      if (!readyStatus?.connected) {
        showSimpleAlert('Error', 'Gmail connection was not ready after authorization. Please try again.');
        return null;
      }

      if (readyStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', readyStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return null;
      }

      return readyStatus;
    } catch (error: unknown) {
      showSimpleAlert('Error', toDomainError(error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [waitForImportReady]);

  const runPrimaryFlow = useCallback((runner: () => Promise<boolean>) => {
    if (activePrimaryFlowPromise.current) {
      return activePrimaryFlowPromise.current;
    }

    // Safety timeout to ensure state always resets (6 minutes max, slightly longer than API timeout)
    safetyTimeout.current = setTimeout(() => {
      captureException(new Error('Gmail primary flow exceeded safety timeout'), { context: 'gmail-primary-flow' });
      activePrimaryFlowPromise.current = null;
      setPrimaryFlowState('idle');
    }, 360000);

    activePrimaryFlowPromise.current = (async () => {
      try {
        return await runner();
      } catch (error) {
        captureException(error instanceof Error ? error : new Error('Gmail primary flow failed'), { context: 'gmail-primary-flow' });
        return false;
      } finally {
        if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
        safetyTimeout.current = null;
        activePrimaryFlowPromise.current = null;
        setPrimaryFlowState('idle');
      }
    })();

    return activePrimaryFlowPromise.current;
  }, []);

  const connectGmail = useCallback(async () => {
    return runPrimaryFlow(async () => {
      const readyStatus = await connectGmailInternal(false);

      if (!readyStatus) {
        return false;
      }

      // Success is confirmed visually by the mascot loading modal on the
      // Upload screen (connect-success beat), so no native alert here — a
      // native alert would pop over and tear down the mascot modal.
      return true;
    });
  }, [connectGmailInternal, runPrimaryFlow]);

  // Not used by the current Upload checklist. Kept for future one-step flows
  // where connecting Gmail should immediately run an import.
  const connectAndImportGmail = useCallback(async () => {
    return runPrimaryFlow(async () => {
      const readyStatus = await connectGmailInternal(true);

      if (!readyStatus) {
        return false;
      }

      setPrimaryFlowState('importing');
      return importReceiptsInternal(readyStatus);
    });
  }, [connectGmailInternal, importReceiptsInternal, runPrimaryFlow]);

  const importReceipts = useCallback(async (statusOverride?: GmailConnectionStatus | null) => {
    return runPrimaryFlow(async () => {
      setPrimaryFlowState('importing');
      return importReceiptsInternal(statusOverride);
    });
  }, [importReceiptsInternal, runPrimaryFlow]);

  const resumeAutoImport = useCallback(async (flowId: string) => {
    if (handledAutoImportFlowIds.current.has(flowId)) {
      return false;
    }

    handledAutoImportFlowIds.current.add(flowId);

    return runPrimaryFlow(async () => {
      setPrimaryFlowState('preparing_import');
      const readyStatus = await waitForImportReady();

      if (!readyStatus?.connected) {
        return false;
      }

      if (readyStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', readyStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return false;
      }

      setPrimaryFlowState('importing');
      return importReceiptsInternal(readyStatus);
    });
  }, [importReceiptsInternal, runPrimaryFlow, waitForImportReady]);

  const disconnectGmail = useCallback(async () => {
    showAlert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account? Your imported receipts will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await gmailApi.disconnect();
              queryClient.setQueryData(statusKey, { connected: false });
              if (userId) await invalidateImportState(queryClient, userId);
              onDisconnectSuccess?.();
              showSimpleAlert('Success', 'Gmail account disconnected.');
            } catch {
              showSimpleAlert('Error', 'Failed to disconnect Gmail. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [onDisconnectSuccess, queryClient, statusKey, userId]);

  return {
    connectionStatus,
    isLoading,
    isChecking: statusQuery.isPending || statusQuery.isFetching,
    primaryFlowState,
    isPrimaryActionInProgress,
    connectGmail,
    connectAndImportGmail,
    importReceipts,
    resumeAutoImport,
    disconnectGmail,
    refreshConnectionStatus,
  };
}
