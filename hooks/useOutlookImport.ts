import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type {
  GmailImportResponse,
  OutlookConnectionStatus,
} from '@features/import-flow/contracts';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import { parseGmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import { useUser } from '@contexts/UserContext';
import { outlookApi } from '@services/outlookApi';
import { invalidateImportState } from '@lib/queryInvalidation';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { toDomainError } from '@utils/domainError';
import { cacheImportOperation } from '@hooks/useImportOperation';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface UseOutlookImportOptions {
  connectionStatus?: OutlookConnectionStatus | null;
  onImportSuccess?: (result: GmailImportResponse) => void;
  onDisconnectSuccess?: () => void;
}

export function useOutlookImport(options: UseOutlookImportOptions = {}) {
  const {
    connectionStatus: projectedConnectionStatus,
    onDisconnectSuccess,
  } = options;
  const { state } = useUser();
  const queryClient = useQueryClient();
  const userId = state.user?.id;
  const connectionStatus = projectedConnectionStatus ?? {
    provider: 'microsoft' as const,
    connected: false,
    email: null,
    canImport: false,
    needsReconnect: false,
    connectionMode: 'none' as const,
    scopes: [],
    hasRequiredScope: false,
    expiresAt: null,
    statusMessage: 'Connect Outlook to import receipts.',
    connectionHealth: 'disconnected' as const,
    lastValidatedAt: null,
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const activeAction = useRef<Promise<unknown> | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!userId) return null;
    try {
      return await outlookApi.getStatus();
    } catch {
      return null;
    }
  }, [userId]);

  const waitForReady = useCallback(async () => {
    let status: OutlookConnectionStatus | null = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      status = await refreshStatus();
      if (status?.connected && status.canImport) return status;
      if (attempt < 7) await sleep(500);
    }
    return status;
  }, [refreshStatus]);

  const connectOutlook = useCallback(async (
    purpose: GmailConnectionPurpose = 'receipt_import',
  ) => {
    if (activeAction.current) return null;
    const action = (async () => {
      setIsLoading(true);
      try {
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: 'snacktrack',
          path: 'oauth-callback',
        });
        const { authUrl } = await outlookApi.getAuthUrl(redirectUri, purpose);
        const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (authResult.type !== 'success' || !authResult.url) return null;
        const resultUrl = new URL(authResult.url);
        if (resultUrl.searchParams.get('outlook') !== 'success') {
          const errorCode = resultUrl.searchParams.get('error');
          showSimpleAlert(
            'Could not connect Outlook',
            errorCode === 'authorization_denied'
              ? 'Outlook access was not granted.'
              : 'Please try again.',
          );
          return null;
        }
        const status = await waitForReady();
        if (!status?.connected || !status.canImport) {
          showSimpleAlert('Could not connect Outlook', status?.statusMessage ?? 'Please try again.');
          return null;
        }
        if (userId) await invalidateImportState(queryClient, userId);
        return {
          status,
          purpose: parseGmailConnectionPurpose(resultUrl.searchParams.get('outlookPurpose')) ?? purpose,
        };
      } catch (error) {
        showSimpleAlert('Could not connect Outlook', toDomainError(error).message);
        return null;
      } finally {
        setIsLoading(false);
        activeAction.current = null;
      }
    })();
    activeAction.current = action;
    return action;
  }, [queryClient, userId, waitForReady]);

  const importReceipts = useCallback(async () => {
    if (activeAction.current || !connectionStatus.canImport) return false;
    const action = (async () => {
      setIsImporting(true);
      try {
        const result = await outlookApi.importReceipts();
        if (userId) cacheImportOperation(queryClient, userId, result);
        return true;
      } catch (error) {
        const domainError = toDomainError(error);
        const reconnect = domainError.code === 'OUTLOOK_RECONNECT_REQUIRED';
        showSimpleAlert(reconnect ? 'Reconnect Outlook' : 'Import failed', reconnect ? 'Reconnect Outlook to continue.' : domainError.message);
        return false;
      } finally {
        setIsImporting(false);
        activeAction.current = null;
      }
    })();
    activeAction.current = action;
    return action;
  }, [connectionStatus.canImport, queryClient, userId]);

  const disconnectOutlook = useCallback(() => {
    showAlert('Disconnect Outlook', 'Your imported receipts will remain in SnackTrack.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await outlookApi.disconnect();
            if (userId) await invalidateImportState(queryClient, userId);
            onDisconnectSuccess?.();
            showSimpleAlert('Outlook disconnected', 'Your imported receipts were kept.');
          } catch {
            showSimpleAlert('Could not disconnect Outlook', 'Please try again.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [onDisconnectSuccess, queryClient, userId]);

  return {
    connectionStatus,
    isLoading,
    isImporting,
    connectOutlook,
    importReceipts,
    disconnectOutlook,
    refreshStatus,
  };
}
