import { useUser } from '@contexts/UserContext';
import type { ImportJourneyContext } from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import { useImportPreferences } from './useImportPreferences';
import { useImportOperation } from './useImportOperation';
import { useGmailImport } from './useGmailImport';
import { useOutlookImport } from './useOutlookImport';

export function useImportResources(
  journeyContext: ImportJourneyContext,
  returnTo: ImportReturnTo,
) {
  const { state: userState } = useUser();
  const userId = userState.user?.id;
  const preferences = useImportPreferences(Boolean(userId));
  const active = useImportOperation(Boolean(userId));
  const gmail = useGmailImport({
    journeyContext,
    returnTo,
    connectionStatus: preferences.preferences?.gmailConnection,
    connectionStatusLoading: preferences.isLoading,
  });
  const outlook = useOutlookImport({
    journeyContext,
    returnTo,
    connectionStatus: preferences.preferences?.outlookConnection,
  });
  const connectionBusy =
    gmail.primaryFlowState !== 'idle' ||
    gmail.isChecking ||
    outlook.isLoading ||
    outlook.isImporting ||
    preferences.isUpdating;
  return {
    userState,
    userId,
    preferences,
    active,
    gmail,
    outlook,
    connectionBusy,
  };
}
export type ImportResources = ReturnType<typeof useImportResources>;
