import { useCallback, useEffect, useRef, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { gmailApi, GmailConnectionStatus } from '../services/gmailApi';
import { useUser } from '../contexts/UserContext';
import { analyticsApi } from '../services/analyticsApi';
import { showAlert, showSimpleAlert } from '../utils/platformAlert';
import { getErrorMessage } from '../utils/errorUtils';

WebBrowser.maybeCompleteAuthSession();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GmailPrimaryFlowState = 'idle' | 'connecting' | 'preparing_import' | 'importing';

let primaryFlowStateStore: GmailPrimaryFlowState = 'idle';
let activePrimaryFlowPromise: Promise<boolean> | null = null;
const primaryFlowListeners = new Set<(state: GmailPrimaryFlowState) => void>();
const handledAutoImportFlowIds = new Set<string>();

const setPrimaryFlowState = (nextState: GmailPrimaryFlowState) => {
  primaryFlowStateStore = nextState;
  primaryFlowListeners.forEach((listener) => listener(nextState));
};

interface UseGmailImportOptions {
  onImportSuccess?: () => void;
  onDisconnectSuccess?: () => void;
}

export function useGmailImport(options: UseGmailImportOptions = {}) {
  const { onImportSuccess, onDisconnectSuccess } = options;
  const { state, setAnalytics } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<GmailConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [primaryFlowState, setPrimaryFlowStateLocal] = useState<GmailPrimaryFlowState>(primaryFlowStateStore);

  useEffect(() => {
    const listener = (nextState: GmailPrimaryFlowState) => {
      setPrimaryFlowStateLocal(nextState);
    };

    primaryFlowListeners.add(listener);
    return () => {
      primaryFlowListeners.delete(listener);
    };
  }, []);

  const isPrimaryActionInProgress = primaryFlowState !== 'idle';

  const refreshConnectionStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      const status = await gmailApi.getStatus();
      setConnectionStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshConnectionStatus();
  }, [refreshConnectionStatus]);

  const formatExpiry = useCallback((expiresAt?: string | null): string | null => {
    if (!expiresAt) {
      return null;
    }

    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) {
      return null;
    }

    return expiry.toLocaleString();
  }, []);

  const importReceiptsInternal = useCallback(async (statusOverride?: GmailConnectionStatus | null) => {
    try {
      const effectiveStatus = statusOverride ?? connectionStatus;

      if (effectiveStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', effectiveStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return false;
      }

      const result = await gmailApi.importReceipts();

      if (result.success) {
        if (state.user) {
          try {
            const summary = await analyticsApi.getUserSummary(state.user.id, true);
            setAnalytics(summary);
          } catch (error) {
            console.warn('Failed to refresh analytics:', error);
          }
        }

        showSimpleAlert(
          'Import Complete',
          `Successfully imported ${result.totalReceiptsImported} receipt${result.totalReceiptsImported !== 1 ? 's' : ''} ($${result.totalAmount.toFixed(2)})`,
          () => {
            try {
              onImportSuccess?.();
            } catch (error) {
              console.error('Error in onImportSuccess callback:', error);
            }
          }
        );
        return true;
      }

      showSimpleAlert('Import Failed', 'Failed to import receipts. Please try again.');
      return false;
    } catch (error: any) {
      console.error('Import failed:', getErrorMessage(error));

      if (error.response?.status === 409 || error.response?.data?.code === 'IMPORT_IN_PROGRESS') {
        showSimpleAlert(
          'Import Already Running',
          error.response?.data?.message || 'A receipt import is already running for your account. Please wait for it to complete.'
        );
      } else if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('timeout')) {
        showSimpleAlert(
          'Import Timeout',
          'The import is taking longer than expected. This might mean you have many emails to process. Please try again or check your connection.'
        );
      } else {
        showSimpleAlert(
          'Import Failed',
          getErrorMessage(error) || 'Failed to import receipts. Please check your connection and try again.'
        );
      }

      return false;
    }
  }, [connectionStatus, onImportSuccess, setAnalytics, state.user]);

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
    } catch (error: any) {
      console.error('Failed to connect Gmail:', error);
      showSimpleAlert('Error', getErrorMessage(error) || 'Failed to connect Gmail. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [waitForImportReady]);

  const runPrimaryFlow = useCallback((runner: () => Promise<boolean>) => {
    if (activePrimaryFlowPromise) {
      return activePrimaryFlowPromise;
    }

    // Safety timeout to ensure state always resets (6 minutes max, slightly longer than API timeout)
    const safetyTimeout = setTimeout(() => {
      console.warn('Primary flow exceeded safety timeout, forcing reset to idle');
      activePrimaryFlowPromise = null;
      setPrimaryFlowState('idle');
    }, 360000);

    activePrimaryFlowPromise = (async () => {
      try {
        return await runner();
      } catch (error) {
        // Catch any uncaught errors to ensure state reset
        console.error('Uncaught error in primary flow:', error);
        return false;
      } finally {
        clearTimeout(safetyTimeout);
        activePrimaryFlowPromise = null;
        setPrimaryFlowState('idle');
      }
    })();

    return activePrimaryFlowPromise;
  }, []);

  const connectGmail = useCallback(async () => {
    return runPrimaryFlow(async () => {
      const readyStatus = await connectGmailInternal(false);

      if (!readyStatus) {
        return false;
      }

      showSimpleAlert('Success', 'Gmail connected successfully.');
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
    if (handledAutoImportFlowIds.has(flowId)) {
      return false;
    }

    handledAutoImportFlowIds.add(flowId);

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
              setConnectionStatus({ connected: false });
              onDisconnectSuccess?.();
              showSimpleAlert('Success', 'Gmail account disconnected.');
            } catch (error) {
              console.error('Disconnect failed:', error);
              showSimpleAlert('Error', 'Failed to disconnect Gmail. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [onDisconnectSuccess]);

  return {
    connectionStatus,
    isLoading,
    isChecking,
    primaryFlowState,
    isPrimaryActionInProgress,
    connectGmail,
    connectAndImportGmail,
    importReceipts,
    resumeAutoImport,
    disconnectGmail,
    refreshConnectionStatus,
    formatExpiry,
  };
}
