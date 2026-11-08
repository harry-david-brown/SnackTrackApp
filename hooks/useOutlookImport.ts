import { resumeOrSubmitMailboxImport, ImportStatusUnavailableError } from '@services/mailboxImportSubmission';
import { beginMailboxAuthorization, finishMailboxAuthorization } from '@services/mailboxAuthorization';
import { importPreferenceKeys } from '@lib/queryKeys';
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type {
  GmailImportResponse,
  ImportJourneyContext,
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
import { waitForMailboxOAuthReadiness } from '@features/import-flow/mailboxOAuthReadiness';

interface UseOutlookImportOptions {
  connectionStatus?: OutlookConnectionStatus | null;
  onImportSuccess?: (result: GmailImportResponse) => void;
  onDisconnectSuccess?: () => void;
  journeyContext?: ImportJourneyContext;
  returnTo?: import('@features/import-flow/importNavigation').ImportReturnTo;
}

export function useOutlookImport(options: UseOutlookImportOptions = {}) {
  const {
    connectionStatus: projectedConnectionStatus,
    onDisconnectSuccess,
    journeyContext = 'legacy',
    returnTo = 'home',
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
    return waitForMailboxOAuthReadiness(refreshStatus, {
      isReady: (status) => status.connected && status.canImport,
      isTerminal: (status) => status.connectionHealth === 'reconnect_required',
    });
  }, [refreshStatus]);

  const connectOutlook = useCallback(async (
    purpose: GmailConnectionPurpose = 'receipt_import',
  ) => {
    if (activeAction.current) return null;
    const action = (async () => {
      setIsLoading(true);
      try {
        const baseRedirectUri = AuthSession.makeRedirectUri({
          scheme: 'snacktrack',
          path: 'oauth-callback',
        });
        const redirect = new URL(baseRedirectUri);
        redirect.searchParams.set('journeyContext', journeyContext);
        redirect.searchParams.set('returnTo', returnTo);
        redirect.searchParams.set('returnIntent', purpose === 'connection_recovery' ? 'reconnect' : 'email');
        const redirectUri = redirect.toString();
        if (!userId) throw new Error('Sign in before connecting your email.');
        const handoffChallenge = await beginMailboxAuthorization('outlook', userId);
        const { authUrl } = await outlookApi.getAuthUrl(redirectUri, purpose, handoffChallenge);
        const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (authResult.type !== 'success' || !authResult.url) {
          if (journeyContext === 'post_onboarding') showSimpleAlert(authResult.type === 'cancel' || authResult.type === 'dismiss' ? 'Connection cancelled' : 'Could not connect Outlook', 'No inbox was connected. You can try again or choose another email service.');
          return null;
        }
        const resultUrl = new URL(authResult.url);
        if (resultUrl.searchParams.get('outlook') !== 'pending') {
          const errorCode = resultUrl.searchParams.get('error');
          showSimpleAlert(
            'Could not connect Outlook',
            errorCode === 'authorization_denied'
              ? 'Outlook access was not granted.'
              : 'Please try again.',
          );
          return null;
        }
        await finishMailboxAuthorization('outlook', userId, resultUrl.searchParams.get('completionToken'));
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
  }, [returnTo, journeyContext, queryClient, userId, waitForReady]);

  const importReceipts = useCallback(async (automaticUpdates = false) => {
    if (activeAction.current || !connectionStatus.canImport) return false;
    const action = (async () => {
      setIsImporting(true);
      try {
        if (!userId) return false;
        const result = await resumeOrSubmitMailboxImport(userId, 'outlook', key => outlookApi.importReceipts(journeyContext, automaticUpdates, key));
        if (userId) {
          cacheImportOperation(queryClient, userId, result);
          if (automaticUpdates) void queryClient.invalidateQueries({ queryKey: importPreferenceKeys.current(userId) });
        }
        return result;
      } catch (error) {
        if (error instanceof ImportStatusUnavailableError) {
          showSimpleAlert('Import status unavailable', 'Check your connection and reload the saved import before starting another.');
          return false;
        }
        const domainError = toDomainError(error);
        const reconnect = domainError.code === 'OUTLOOK_RECONNECT_REQUIRED';
        showSimpleAlert(reconnect ? 'Reconnect Outlook' : domainError.kind === 'network' ? 'Import status unconfirmed' : 'Couldn’t start this import', reconnect ? 'Reconnect Outlook to continue.' : domainError.kind === 'network' ? 'Check your connection and try again; we’ll resume any saved work.' : domainError.message);
        return false;
      } finally {
        setIsImporting(false);
        activeAction.current = null;
      }
    })();
    activeAction.current = action;
    return action;
  }, [connectionStatus.canImport, journeyContext, queryClient, userId]);

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
