import { useCallback } from 'react';
import { isActiveImportOperation } from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import { useAppNavigation } from '@features/navigation';
import { suppressAdsForSession } from '@features/ads/adSession';
import type { ImportResources } from './useImportResources';
import { useFlowAttemptScope } from './useFlowAttemptScope';

export type MailboxImportMode = 'initial' | 'manual_check';
export function useMailboxImportActions(
  resources: ImportResources,
  returnTo: ImportReturnTo,
  pendingTrackingSetup: boolean,
) {
  const { userId, gmail, outlook, active, connectionBusy } = resources;
  const navigation = useAppNavigation();
  const scope = useFlowAttemptScope(userId ?? 'signed-out');
  const submit = useCallback(
    async (
      provider: 'gmail' | 'outlook',
      mode?: MailboxImportMode,
      automaticUpdates = false,
    ) => {
      const connection =
        provider === 'gmail'
          ? gmail.connectionStatus
          : outlook.connectionStatus;
      if (
        connectionBusy ||
        isActiveImportOperation(active.operation) ||
        !connection?.connected ||
        connection.canImport === false
      )
        return;
      const attempt = scope.begin();
      if (attempt === null) return;
      try {
        const operation = await (provider === 'gmail'
          ? gmail.importReceipts(undefined, automaticUpdates)
          : outlook.importReceipts(automaticUpdates));
        if (!scope.owns(attempt)) return;
        if (operation && mode !== 'manual_check') {
          if (userId) suppressAdsForSession(userId);
          navigation.replace({
            pathname: '/import-progress',
            params: {
              operationId: operation.id,
              returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo,
            },
          });
        }
      } finally {
        scope.finish(attempt);
      }
    },
    [
      active.operation,
      connectionBusy,
      gmail,
      outlook,
      navigation,
      pendingTrackingSetup,
      returnTo,
      scope,
      userId,
    ],
  );
  return {
    importEmail: useCallback(
      (mode?: MailboxImportMode, automaticUpdates = false) =>
        submit('gmail', mode, automaticUpdates),
      [submit],
    ),
    importOutlook: useCallback(
      (mode?: MailboxImportMode, automaticUpdates = false) =>
        submit('outlook', mode, automaticUpdates),
      [submit],
    ),
  };
}
