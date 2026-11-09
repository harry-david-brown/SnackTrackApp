import { useCallback, useEffect, useState } from 'react';
import type {
  ImportPreferencesResponse,
  MailboxProvider,
} from '@features/import-flow/contracts';
import type { MailboxOAuthReturnState } from '@features/import-flow/initialImportJourney';
import { waitForMailboxOAuthReadiness } from '@features/import-flow/mailboxOAuthReadiness';
import { useAppNavigation } from '@features/navigation';
import { useFlowAttemptScope } from './useFlowAttemptScope';

export function useMailboxReturnReadiness({
  userId,
  provider,
  enabled,
  succeeded,
  failed,
  refresh,
  selectProvider,
}: {
  userId?: string;
  provider: MailboxProvider | null;
  enabled: boolean;
  succeeded: boolean;
  failed: boolean;
  refresh: () => Promise<ImportPreferencesResponse | null>;
  selectProvider: (provider: MailboxProvider) => void;
}) {
  const navigation = useAppNavigation();
  const scope = useFlowAttemptScope(
    JSON.stringify([userId, provider, enabled, succeeded, failed]),
  );
  const [oauthReturn, setOAuthReturn] =
    useState<MailboxOAuthReturnState | null>(() =>
      provider && enabled && (succeeded || failed)
        ? { provider, status: failed ? 'failed' : 'confirming' }
        : null,
    );
  useEffect(() => {
    if (!enabled || !provider || (!succeeded && !failed)) {
      setOAuthReturn(null);
      return;
    }
    if (failed) {
      setOAuthReturn({ provider, status: 'failed' });
      return;
    }
    const attempt = scope.begin();
    if (attempt === null) return;
    selectProvider(provider);
    setOAuthReturn({ provider, status: 'confirming' });
    const connection = (value: ImportPreferencesResponse) =>
      provider === 'gmail' ? value.gmailConnection : value.outlookConnection;
    const isReady = (value: ImportPreferencesResponse) => {
      const current = connection(value);
      return (
        current.connected &&
        current.canImport !== false &&
        current.connectionHealth !== 'reconnect_required' &&
        current.connectionHealth !== 'unavailable'
      );
    };
    void waitForMailboxOAuthReadiness(
      () => (scope.owns(attempt) ? refresh() : Promise.resolve(null)),
      {
        isCancelled: () => !scope.owns(attempt),
        isReady,
        isTerminal: (value) =>
          connection(value).connectionHealth === 'reconnect_required',
      },
    )
      .then((value) => {
        if (!scope.owns(attempt)) return;
        setOAuthReturn(
          value && isReady(value) ? null : { provider, status: 'failed' },
        );
        if (value && isReady(value))
          navigation.setParams({
            gmail: undefined,
            outlook: undefined,
            error: undefined,
          });
      })
      .catch(() => {
        if (scope.owns(attempt)) setOAuthReturn({ provider, status: 'failed' });
      })
      .finally(() => scope.finish(attempt));
    return () => scope.finish(attempt);
  }, [
    enabled,
    provider,
    succeeded,
    failed,
    refresh,
    selectProvider,
    navigation,
    scope,
  ]);
  const clearOAuthReturn = useCallback(() => {
    scope.invalidate();
    scope.activate();
    setOAuthReturn(null);
    navigation.setParams({
      gmail: undefined,
      outlook: undefined,
      error: undefined,
    });
  }, [navigation, scope]);
  return { oauthReturn, clearOAuthReturn };
}
