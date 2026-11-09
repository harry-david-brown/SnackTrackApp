import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type {
  ExportProvider,
  ImportOperation,
  ImportJourneyContext,
} from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import { emailUpdatesPresentation } from '@features/import-flow/emailImportPresentation';
import { resolveImportFlowState } from '@features/import-flow/importFlowResolver';
import { featureFlags } from '@config/featureFlags';
import { suppressAdsForSession } from '@features/ads/adSession';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { useImportResources } from './useImportResources';
import {
  useMailboxConnectionActions,
  type MailboxConnectionOutcome,
} from './useMailboxConnectionActions';
import { useMailboxImportActions } from './useMailboxImportActions';
import { useProviderExportHandoff } from './useProviderExportHandoff';

export function useReturningImportActions(
  provider: ExportProvider | null,
  returnTo: ImportReturnTo,
  journeyContext: ImportJourneyContext = 'post_onboarding',
) {
  const resources = useImportResources(journeyContext, returnTo);
  const {
    preferences,
    gmail,
    outlook,
    active,
    userState,
    userId,
    connectionBusy,
  } = resources;
  const navigation = useAppNavigation();
  const [pendingTrackingSetup, setPendingTrackingSetup] = useState(false);
  useEffect(() => {
    setPendingTrackingSetup(false);
  }, [userId]);
  const handleConnectionOutcome = useCallback(
    (outcome: MailboxConnectionOutcome) => {
      if (outcome.needsBaseline) setPendingTrackingSetup(true);
    },
    [],
  );
  const connections = useMailboxConnectionActions(
    resources,
    handleConnectionOutcome,
  );
  const imports = useMailboxImportActions(
    resources,
    returnTo,
    pendingTrackingSetup,
  );
  const handoff = useProviderExportHandoff(resources, {
    provider,
    returnTo,
    journeyContext,
  });
  const { refresh } = preferences;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const flow = useMemo(
    () =>
      resolveImportFlowState({
        preferences: preferences.preferences,
        gmailStatus: gmail.connectionStatus,
        outlookStatus: outlook.connectionStatus,
        downloadState: handoff.exportDownloadState,
        gmailFeatureEnabled: featureFlags.showGmailImport,
        focusExport: false,
        showExportTutorial: false,
      }),
    [
      preferences.preferences,
      gmail.connectionStatus,
      outlook.connectionStatus,
      handoff.exportDownloadState,
    ],
  );
  return {
    ...handoff,
    ...imports,
    flow,
    user: userState.user,
    connectionBusy,
    importPreferences: preferences.preferences,
    importPreferencesLoading: preferences.isLoading,
    importPreferencesError: preferences.queryError,
    refreshImportPreferences: refresh,
    activeImportOperation: active.operation,
    activeImportUnavailable: active.isUnavailable,
    refreshActiveImport: active.refresh,
    emailUpdates: emailUpdatesPresentation(preferences.preferences),
    connectEmail: () =>
      connections.connectEmail(
        flow.gmailNeedsReconnect ? 'connection_recovery' : 'receipt_import',
      ),
    connectOutlook: () =>
      connections.connectOutlook(
        flow.outlookNeedsReconnect ? 'connection_recovery' : 'receipt_import',
      ),
    reconnectEmail: () => connections.connectEmail('connection_recovery'),
    reconnectOutlook: () => connections.connectOutlook('connection_recovery'),
    connectEmailForOngoingTracking: () =>
      connections.connectEmail('ongoing_tracking'),
    connectOutlookForOngoingTracking: () =>
      connections.connectOutlook('ongoing_tracking'),
    connectGmailForReadyAlerts: () =>
      connections.connectEmail('export_ready_alerts'),
    connectOutlookForReadyAlerts: () =>
      connections.connectOutlook('export_ready_alerts'),
    setupOngoingUpdates: () => navigation.open(appDestinations.ongoingUpdates),
    uploadSucceeded: async (operation: ImportOperation) => {
      if (userId) suppressAdsForSession(userId);
      navigation.replace({
        pathname: '/import-progress',
        params: {
          operationId: operation.id,
          returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo,
        },
      });
    },
    uploadFailed: async (_message: string) => {
      await refresh();
    },
  };
}
