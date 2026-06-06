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

interface UseGmailImportOptions {
  onImportSuccess?: () => void;
  onDisconnectSuccess?: () => void;
}

export function useGmailImport(options: UseGmailImportOptions = {}) {
  const { onImportSuccess, onDisconnectSuccess } = options;
  const { state, setAnalytics } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<GmailConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPrimaryActionInProgress, setIsPrimaryActionInProgress] = useState(false);
  const autoImportAfterConnectRef = useRef(false);

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

  const importReceipts = useCallback(async (statusOverride?: GmailConnectionStatus | null) => {
    try {
      const effectiveStatus = statusOverride ?? connectionStatus;

      if (effectiveStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', effectiveStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return false;
      }

      setIsImporting(true);
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
            onImportSuccess?.();
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
    } finally {
      setIsImporting(false);
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

  const connectGmail = useCallback(async (options?: { autoImport?: boolean }) => {
    try {
      setIsLoading(true);
      autoImportAfterConnectRef.current = options?.autoImport === true;

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'snacktrack',
        path: 'oauth-callback',
      });

      const { authUrl } = await gmailApi.getAuthUrl(redirectUri);
      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (authResult.type !== 'success' || !authResult.url) {
        if (authResult.type !== 'cancel' && authResult.type !== 'dismiss') {
          showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
        }
        autoImportAfterConnectRef.current = false;
        return false;
      }

      const resultUrl = new URL(authResult.url);
      const gmailResult = resultUrl.searchParams.get('gmail');
      const errorMessage = resultUrl.searchParams.get('error');
      const shouldAutoImport = autoImportAfterConnectRef.current;
      autoImportAfterConnectRef.current = false;

      if (gmailResult !== 'success') {
        showSimpleAlert('Error', errorMessage || 'Failed to connect Gmail. Please try again.');
        return false;
      }

      const readyStatus = await waitForImportReady();

      if (!readyStatus?.connected) {
        showSimpleAlert('Error', 'Gmail connection was not ready after authorization. Please try again.');
        return false;
      }

      if (readyStatus.canImport === false) {
        showSimpleAlert('Reconnect Gmail', readyStatus.statusMessage || 'Reconnect Gmail before importing receipts.');
        return false;
      }

      if (shouldAutoImport) {
        await importReceipts(readyStatus);
        return true;
      }

      showSimpleAlert('Success', 'Gmail connected successfully.');
      return true;
    } catch (error: any) {
      console.error('Failed to connect Gmail:', error);
      showSimpleAlert('Error', getErrorMessage(error) || 'Failed to connect Gmail. Please try again.');
      autoImportAfterConnectRef.current = false;
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [importReceipts, waitForImportReady]);

  const connectAndImportGmail = useCallback(async () => {
    try {
      setIsPrimaryActionInProgress(true);
      return await connectGmail({ autoImport: true });
    } finally {
      setIsPrimaryActionInProgress(false);
    }
  }, [connectGmail]);

  const importReceiptsWithLoading = useCallback(async (statusOverride?: GmailConnectionStatus | null) => {
    try {
      setIsPrimaryActionInProgress(true);
      return await importReceipts(statusOverride);
    } finally {
      setIsPrimaryActionInProgress(false);
    }
  }, [importReceipts]);

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
    isImporting,
    isChecking,
    isPrimaryActionInProgress,
    connectGmail,
    connectAndImportGmail,
    importReceipts: importReceiptsWithLoading,
    disconnectGmail,
    refreshConnectionStatus,
    formatExpiry,
  };
}
