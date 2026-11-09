import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import type {
  ExportProvider,
  ImportJourneyContext,
} from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import { resolveImportFlowState } from '@features/import-flow/importFlowResolver';
import { toDataPlatform } from '@features/import-flow/importJourneyState';
import {
  resolveProviderTutorialEntry,
  type ProviderTutorialJob,
} from '@features/import-flow/providerTutorialEntry';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  getExportDownloadHandoffState,
  setExportDownloadHandoffState,
  setPendingExportRequest,
  clearPendingExportRequest,
  openUberExportEmail,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT,
  type ExportDownloadHandoffState,
} from '@utils/exportDownloadHandoff';
import { trackAdminEvent } from '@services/adminAnalytics';
import type { ImportResources } from './useImportResources';
import { useFlowAttemptScope } from './useFlowAttemptScope';

export function useProviderExportHandoff(
  { userId, preferences, gmail, outlook }: ImportResources,
  {
    provider,
    returnTo,
    journeyContext,
    downloadedVersion = null,
    showExportTutorial = false,
    screenMode = 'manage',
  }: {
    provider: ExportProvider | null;
    returnTo: ImportReturnTo;
    journeyContext?: ImportJourneyContext;
    downloadedVersion?: string | null;
    showExportTutorial?: boolean;
    screenMode?: 'auto' | 'setup' | 'manage';
  },
) {
  const navigation = useAppNavigation();
  const requestScope = useFlowAttemptScope(JSON.stringify([userId, provider]));
  const downloadScope = useFlowAttemptScope(
    JSON.stringify([userId, provider, 'download']),
  );
  const [requestSaving, setRequestSaving] = useState(false);
  const [tutorial, setTutorial] = useState<{
    visible: boolean;
    platform?: DataPlatform;
    job?: ProviderTutorialJob;
  }>({
    visible: showExportTutorial,
    platform: provider ? toDataPlatform(provider) : undefined,
  });
  const {
    visible: showTutorial,
    platform: tutorialPlatform,
    job: tutorialEntryJob,
  } = tutorial;
  const [exportDownloadState, setExportDownloadState] =
    useState<ExportDownloadHandoffState>('not_downloaded');
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<
    string | null
  >(null);
  const pickerRequest = useRef(0);
  const flow = resolveImportFlowState({
    preferences: preferences.preferences,
    gmailStatus: gmail.connectionStatus,
    outlookStatus: outlook.connectionStatus,
    downloadState: exportDownloadState,
    gmailFeatureEnabled: true,
    focusExport: false,
    showExportTutorial,
  });
  useEffect(() => {
    setRequestSaving(false);
  }, [requestScope]);
  const handoffProvider: ExportProvider =
    provider ??
    (tutorialPlatform === 'doordash'
      ? 'doordash'
      : tutorialPlatform === 'uber'
        ? 'uber_eats'
        : flow.exportReadyProvider) ??
    'uber_eats';
  const providerPreference =
    handoffProvider === 'uber_eats'
      ? preferences.preferences?.export.providers.uberEats
      : preferences.preferences?.export.providers.doorDash;
  const exportReadyVersion = providerPreference?.updatedAt ?? 'ready';

  useEffect(() => {
    let cancelled = false;
    if (!userId || !flow.exportFileReady) {
      setExportDownloadState('not_downloaded');
      return () => {
        cancelled = true;
      };
    }
    void getExportDownloadHandoffState(
      userId,
      handoffProvider,
      exportReadyVersion,
    ).then((nextState) => {
      if (!cancelled) setExportDownloadState(nextState);
    });
    return () => {
      cancelled = true;
    };
  }, [exportReadyVersion, flow.exportFileReady, handoffProvider, userId]);

  useEffect(() => {
    if (flow.exportFileReady && downloadedVersion === exportReadyVersion) {
      setExportDownloadState('downloaded');
      setAutoOpenExportPickerToken(downloadedVersion);
    }
  }, [exportReadyVersion, flow.exportFileReady, downloadedVersion]);

  const openProviderRequestPage = useCallback(
    async (platform: DataPlatform) => {
      const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
      if (!userId) throw new Error('Sign in before requesting your history.');
      if (!requestScope.isLive()) return;
      await setPendingExportRequest(userId, provider, returnTo);
      if (!requestScope.isLive()) return;
      try {
        await Linking.openURL(
          provider === 'uber_eats'
            ? 'https://myprivacy.uber.com/privacy/exploreyourdata/download'
            : 'https://www.doordash.com/consumer/privacy/manage_account',
        );
      } catch (error) {
        await clearPendingExportRequest(userId, provider);
        throw error;
      }
    },
    [returnTo, userId, requestScope],
  );

  const completeTutorial = useCallback(
    async (platform: DataPlatform): Promise<boolean> => {
      const attempt = requestScope.begin();
      if (attempt === null) return false;
      setRequestSaving(true);
      const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
      try {
        await preferences.markExportRequested(provider);
        if (!requestScope.owns(attempt)) return false;
      } catch {
        if (!requestScope.owns(attempt)) return false;
        showSimpleAlert(
          'Could not save your request',
          'Your request may still be with the delivery service. Try saving your progress again here.',
        );
        return false;
      } finally {
        if (requestScope.owns(attempt)) setRequestSaving(false);
        requestScope.finish(attempt);
      }
      // The server response above is authoritative, even if local cleanup fails.
      if (userId)
        void clearPendingExportRequest(userId, provider).catch(() => undefined);
      setTutorial({ visible: false });
      void trackAdminEvent('setup_completed', {
        properties: { method: 'provider_history_request' },
      }).catch(() => undefined);
      if (screenMode === 'setup')
        navigation.replace({
          pathname: '/add-history',
          params: {
            intent: 'resume_export',
            provider,
            returnTo,
            journeyContext: 'onboarding',
          },
        });
      return true;
    },
    [preferences, navigation, returnTo, screenMode, userId, requestScope],
  );

  const tutorialStillWaiting = completeTutorial;

  const reportDownloaded = useCallback(
    async (provider: ExportProvider = handoffProvider, openPicker = true) => {
      if (!userId) return;
      const attempt = downloadScope.begin();
      if (attempt === null) return;
      try {
        const providerState =
          provider === 'uber_eats'
            ? preferences.preferences?.export.providers.uberEats
            : preferences.preferences?.export.providers.doorDash;
        const readyVersion = providerState?.updatedAt ?? exportReadyVersion;
        await setExportDownloadHandoffState(
          userId,
          provider,
          readyVersion,
          'downloaded',
        );
        if (!downloadScope.owns(attempt)) return;
        setExportDownloadState('downloaded');
        if (openPicker) {
          pickerRequest.current += 1;
          setAutoOpenExportPickerToken(
            `${readyVersion}:local:${pickerRequest.current}`,
          );
        }
      } finally {
        downloadScope.finish(attempt);
      }
    },
    [
      downloadScope,
      exportReadyVersion,
      handoffProvider,
      preferences.preferences?.export.providers,
      userId,
    ],
  );

  const tutorialArchiveDownloaded = useCallback(
    (platform: DataPlatform) => {
      setTutorial({ visible: false });
      const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
      void reportDownloaded(provider, false).catch(() => undefined);
      navigation.replace({
        pathname: '/add-history',
        params: {
          intent: 'provider',
          provider,
          downloadedVersion: 'saved',
          returnTo,
          journeyContext:
            journeyContext ??
            (screenMode === 'setup' ? 'onboarding' : 'post_onboarding'),
        },
      });
    },
    [navigation, reportDownloaded, returnTo, journeyContext, screenMode],
  );

  const tutorialReadyConfirmed = useCallback(
    (platform: DataPlatform) => {
      const provider: ExportProvider =
        platform === 'uber' ? 'uber_eats' : 'doordash';
      setTutorial((current) => ({ ...current, job: 'download' }));
      void preferences.confirmExportReady(provider).catch(() => {
        if (!requestScope.isLive()) return;
        showSimpleAlert(
          'Status not saved',
          'You can continue downloading the archive, but SnackTrack could not save that it is ready.',
        );
      });
    },
    [preferences, requestScope],
  );

  const openExportEmail = useCallback(async () => {
    if (!userId || !flow.exportFileReady) return;
    if (handoffProvider !== 'uber_eats') {
      showSimpleAlert(
        'Find the DoorDash ready message',
        'Look for the email or notification containing “View Your Data Archive,” download the ZIP, then return to SnackTrack.',
      );
      return;
    }
    if (!flow.gmailConnected) {
      showSimpleAlert(
        'Find Uber’s ready message',
        `Look for “${UBER_EXPORT_EMAIL_SUBJECT}” in the email address or phone number registered with Uber. Open the download page, save the ZIP, then return to SnackTrack.`,
      );
      return;
    }
    const attempt = downloadScope.begin();
    if (attempt === null) return;
    try {
      setExportDownloadState('checking_email');
      await setExportDownloadHandoffState(
        userId,
        handoffProvider,
        exportReadyVersion,
        'checking_email',
      );
      try {
        if (!downloadScope.owns(attempt)) return;
        await openUberExportEmail();
      } catch {
        if (!downloadScope.owns(attempt)) return;
        setExportDownloadState('not_downloaded');
        await setExportDownloadHandoffState(
          userId,
          handoffProvider,
          exportReadyVersion,
          'not_downloaded',
        );
        if (!downloadScope.owns(attempt)) return;
        showAlert(
          'Could not open your email',
          `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`,
          [{ text: 'OK' }],
        );
      }
    } finally {
      downloadScope.finish(attempt);
    }
  }, [
    downloadScope,
    exportReadyVersion,
    flow.exportFileReady,
    flow.gmailConnected,
    handoffProvider,
    userId,
  ]);

  const prepareTutorial = useCallback(
    (platform?: DataPlatform, entryJobOverride?: ProviderTutorialJob) => {
      const progress =
        platform === 'uber'
          ? flow.exportProviderProgress.uberEats
          : flow.exportProviderProgress.doorDash;
      setTutorial((current) => ({
        visible: current.visible,
        platform,
        job: platform
          ? (entryJobOverride ??
            resolveProviderTutorialEntry(progress.status).job)
          : undefined,
      }));
    },
    [
      flow.exportProviderProgress.uberEats,
      flow.exportProviderProgress.doorDash,
    ],
  );
  const showPreparedTutorial = useCallback(
    () => setTutorial((current) => ({ ...current, visible: true })),
    [],
  );
  const openTutorial = useCallback(
    (platform?: DataPlatform, entryJobOverride?: ProviderTutorialJob) => {
      prepareTutorial(platform, entryJobOverride);
      showPreparedTutorial();
    },
    [prepareTutorial, showPreparedTutorial],
  );

  const closeTutorial = useCallback(() => {
    if (screenMode === 'setup' && showExportTutorial) {
      navigation.backOr(appDestinations.dataSetup);
      return;
    }
    setTutorial({ visible: false });
  }, [navigation, showExportTutorial, screenMode]);

  const autoOpenConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (downloadedVersion)
      navigation.setParams({ downloadedVersion: undefined });
  }, [navigation, downloadedVersion]);

  return {
    requestSaving,
    showTutorial,
    tutorialPlatform,
    tutorialEntryJob,
    exportDownloadState,
    autoOpenExportPickerToken,
    openProviderRequestPage,
    completeTutorial,
    tutorialStillWaiting,
    reportDownloaded,
    tutorialArchiveDownloaded,
    tutorialReadyConfirmed,
    openExportEmail,
    openProviderTutorial: openTutorial,
    closeTutorial,
    autoOpenConsumed,
    prepareTutorial,
    showPreparedTutorial,
    requestNotSubmitted: (platform: DataPlatform) => {
      if (userId)
        void clearPendingExportRequest(
          userId,
          platform === 'uber' ? 'uber_eats' : 'doordash',
        ).catch(() => undefined);
    },
    tutorialMode:
      tutorialEntryJob === 'download' ||
      tutorialEntryJob === 'retry' ||
      tutorialEntryJob === 'processing'
        ? ('download' as const)
        : ('request' as const),
  };
}
