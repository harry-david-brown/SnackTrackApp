import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, type ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { featureFlags } from '@config/featureFlags';
import { useUser } from '@contexts/UserContext';
import type { ImportTaskId } from '@components/upload/ImportTaskCard';
import type { GmailConnectPhase } from '@components/gmail/GmailImportLoadingModal';
import type { ExportProvider } from '@services/gmailApi';
import type { CSVImportResponse } from '@/types/api';
import { analyticsApi } from '@services/analyticsApi';
import { analyticsKeys } from '@lib/queryKeys';
import { invalidateReceiptDerivedData } from '@lib/queryInvalidation';
import { useOfflineSync } from './useOfflineSync';
import { useGmailImport } from './useGmailImport';
import { useExportUpsell } from './useExportUpsell';
import { useImportPreferences } from './useImportPreferences';
import type { ImportRouteParams } from '@features/import-flow/importRouteParams';
import { resolveImportFlowState } from '@features/import-flow/importFlowResolver';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import {
  resolveImportSetupRecommendation,
  toDataPlatform,
  type ImportSetupRecommendation,
} from '@features/import-flow/importJourneyState';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  type ExportDownloadHandoffState, getExportDownloadHandoffState, openUberExportEmail,
  setExportDownloadHandoffState, UBER_EXPORT_EMAIL_ADDRESS, UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT, resetExportDownloadStateForProvider,
} from '@utils/exportDownloadHandoff';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { captureException } from '@utils/sentry';
import { createWrappedRestartHref } from '@features/wrapped/wrappedNavigation';
import { resolveGmailImportCompletion, resolveGmailImportResult } from '@features/import-flow/gmailImportResult';
import { resolveProviderTutorialEntry, type ProviderTutorialJob } from '@features/import-flow/providerTutorialEntry';
import { resolveOngoingUpdatesPresentation, resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';

const taskForRecommendation = (recommendation: ImportSetupRecommendation): ImportTaskId | null => {
  if (recommendation.kind === 'provider') return 'uber_export';
  if (recommendation.kind === 'connect_email') return 'connect_email';
  if (recommendation.kind === 'scan_email') return 'gmail_import';
  if (recommendation.kind === 'email_optional') return recommendation.connected ? 'gmail_import' : 'connect_email';
  return null;
};

type GmailImportMode = 'initial' | 'manual_check';

export function useImportFlowController(route: ImportRouteParams) {
  const { state: userState } = useUser();
  const userId = userState.user?.id;
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const connectSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRequest = useRef(0);
  const handledFocusKey = useRef<string | null>(null);
  const handledActionIntent = useRef<string | null>(null);
  const initialTaskApplied = useRef(false);
  const gmailImportMode = useRef<GmailImportMode>('initial');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialPlatform, setTutorialPlatform] = useState<DataPlatform | undefined>();
  const [tutorialEntryJob, setTutorialEntryJob] = useState<ProviderTutorialJob | undefined>();
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] = useState<GmailConnectPhase>('idle');
  const [exportDownloadState, setExportDownloadState] = useState<ExportDownloadHandoffState>('not_downloaded');
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<string | null>(null);
  const [pendingTrackingSetup, setPendingTrackingSetup] = useState(false);
  const offline = useOfflineSync();
  const gmailFeatureEnabled = featureFlags.showGmailImport;
  const preferences = useImportPreferences(Boolean(userId));

  const completeWrappedNavigation = useCallback(async () => {
    try {
      if (userId) {
        await queryClient.fetchQuery({
          queryKey: analyticsKeys.wrapped(userId),
          queryFn: () => analyticsApi.getUserSummary(userId, true),
        });
      }
      router.replace(createWrappedRestartHref());
    } catch (error) {
      captureException(error instanceof Error ? error : new Error('Wrapped preload failed'), { context: 'import-flow-completion' });
      router.replace(createWrappedRestartHref());
    }
  }, [queryClient, userId]);

  const gmail = useGmailImport({
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      const presentation = resolveGmailImportResult(result);
      const completedMode = gmailImportMode.current;
      void preferences.refresh().then((nextPreferences) => {
        if (pendingTrackingSetup) {
          setPendingTrackingSetup(false);
          setTimeout(() => showAlert(
            presentation.title,
            `${presentation.message}\n\nWould you like SnackTrack to periodically check for future delivery receipts?`,
            [
              { text: 'Not Now', style: 'cancel', onPress: () => { void preferences.setOngoingTrackingConsent('declined'); } },
              {
                text: 'Allow Ongoing Updates',
                onPress: () => {
                  void preferences.setOngoingTrackingConsent('granted')
                    .then(() => showSimpleAlert('Setting up ongoing updates', 'SnackTrack is catching up from your existing history. Your export data remains safe.'))
                    .catch(() => showSimpleAlert('Could not enable updates', 'Your email check completed, but the tracking choice could not be saved. Try again from Profile.'));
                },
              },
            ],
          ), 0);
          return;
        }

        if (completedMode === 'manual_check') {
          const manualPresentation = resolveGmailImportResult({ ...result, errors: [] });
          setTimeout(() => showSimpleAlert(manualPresentation.title, manualPresentation.message), 0);
          return;
        }

        const availableOrderCount = nextPreferences
          ? nextPreferences.coverage.emailReceiptCount + nextPreferences.coverage.exportReceiptCount
          : result.totalReceiptsImported;
        const completion = resolveGmailImportCompletion(result, availableOrderCount);
        if (completion.kind === 'open_wrapped') {
          setActiveTaskId(null);
          void completeWrappedNavigation();
          return;
        }

        const recommendation = resolveImportSetupRecommendation({
          preferences: nextPreferences,
          gmailFeatureEnabled,
          gmailConnected: true,
          gmailNeedsReconnect: false,
        });
        const nextTask = taskForRecommendation(recommendation);
        const nextLabel = recommendation.kind === 'provider'
          ? `Add ${recommendation.provider.name}`
          : 'Done';
        setTimeout(() => showAlert(completion.presentation.title, completion.presentation.message, [
          { text: nextLabel, style: 'cancel', onPress: () => setActiveTaskId(nextTask) },
          { text: 'View My Stats', onPress: () => router.replace(createWrappedRestartHref()) },
        ]), 0);
      });
    },
  });
  const exportUpsell = useExportUpsell(userId);
  const flow = useMemo(() => resolveImportFlowState({
    preferences: preferences.preferences,
    gmailStatus: gmail.connectionStatus,
    downloadState: exportDownloadState,
    gmailFeatureEnabled,
    focusExport: route.focus === 'export',
    showExportTutorial: route.showExportTutorial,
  }), [
    exportDownloadState, gmail.connectionStatus,
    gmailFeatureEnabled, preferences.preferences,
    route.focus, route.showExportTutorial,
  ]);

  const handoffProvider: ExportProvider = route.provider
    ?? (tutorialPlatform === 'doordash' ? 'doordash' : tutorialPlatform === 'uber' ? 'uber_eats' : flow.exportReadyProvider)
    ?? 'uber_eats';
  const providerPreference = handoffProvider === 'uber_eats'
    ? preferences.preferences?.export.providers?.uberEats
    : preferences.preferences?.export.providers?.doorDash;
  const exportReadyVersion = providerPreference?.updatedAt ?? 'ready';
  const busy = gmail.primaryFlowState !== 'idle' || gmail.isChecking;
  const showGmailImportLoadingModal = gmailFeatureEnabled && (
    gmailConnectPhase !== 'idle'
    || gmail.primaryFlowState === 'preparing_import' || gmail.primaryFlowState === 'importing'
  );
  const ongoingUpdatesPresentation = resolveOngoingUpdatesPresentation(
    preferences.preferences,
    flow.hasImportedEmailData || flow.hasAnyExportData,
  );

  useFocusEffect(useCallback(() => {
    void preferences.refresh();
  }, [preferences.refresh]));

  useEffect(() => {
    initialTaskApplied.current = false;
    handledFocusKey.current = null;
    handledActionIntent.current = null;
  }, [userId]);

  useEffect(() => () => {
    if (connectSuccessTimer.current) clearTimeout(connectSuccessTimer.current);
    if (tutorialTimer.current) clearTimeout(tutorialTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !flow.exportFileReady) {
      setExportDownloadState('not_downloaded');
      return () => { cancelled = true; };
    }
    void getExportDownloadHandoffState(userId, handoffProvider, exportReadyVersion).then((nextState) => {
      if (!cancelled) setExportDownloadState(nextState);
    });
    return () => { cancelled = true; };
  }, [exportReadyVersion, flow.exportFileReady, handoffProvider, userId]);

  useEffect(() => {
    if (flow.exportFileReady && route.downloadedVersion === exportReadyVersion) {
      setExportDownloadState('downloaded');
      setAutoOpenExportPickerToken(route.downloadedVersion);
    }
  }, [exportReadyVersion, flow.exportFileReady, route.downloadedVersion]);

  useEffect(() => {
    if (gmailFeatureEnabled && showGmailModal) void gmail.refreshConnectionStatus();
  }, [gmail.refreshConnectionStatus, gmailFeatureEnabled, showGmailModal]);

  useEffect(() => {
    const focusKey = route.focus === 'export'
      ? `${route.downloadedVersion ?? 'export'}:${route.provider ?? 'any'}:${route.showExportTutorial}`
      : null;
    if (!focusKey || exportSectionY === null || handledFocusKey.current === focusKey) return;
    handledFocusKey.current = focusKey;
    setActiveTaskId('uber_export');
    if (route.provider) {
      setTutorialPlatform(toDataPlatform(route.provider));
      const providerProgress = route.provider === 'uber_eats'
        ? flow.exportProviderProgress.uberEats
        : flow.exportProviderProgress.doorDash;
      setTutorialEntryJob(resolveProviderTutorialEntry(providerProgress.status).job);
    }
    requestAnimationFrame(() => scrollViewRef.current?.scrollTo({ y: Math.max(0, exportSectionY - 16), animated: true }));
    if (route.showExportTutorial) {
      tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
    }
  }, [exportSectionY, flow.exportProviderProgress.doorDash, flow.exportProviderProgress.uberEats, route.downloadedVersion, route.focus, route.provider, route.showExportTutorial]);

  useEffect(() => {
    if (initialTaskApplied.current || gmail.isChecking || exportUpsell.isLoading || preferences.isLoading) return;
    initialTaskApplied.current = true;
    setActiveTaskId(flow.initialOpenTask);
  }, [exportUpsell.isLoading, flow.initialOpenTask, gmail.isChecking, preferences.isLoading]);

  const toggleTask = useCallback((taskId: ImportTaskId) => {
    setActiveTaskId((current) => current === taskId ? null : taskId);
  }, []);

  const connectEmail = useCallback(async (purpose: GmailConnectionPurpose = 'receipt_import') => {
    if (busy) return;
    if (connectSuccessTimer.current) clearTimeout(connectSuccessTimer.current);
    setGmailConnectPhase('connecting');
    const connectionResult = await gmail.connectGmail(purpose);
    if (!connectionResult) {
      setActiveTaskId(purpose === 'export_ready_alerts'
        ? 'uber_export'
        : purpose === 'connection_recovery'
          ? 'gmail_import'
          : 'connect_email');
      setGmailConnectPhase('idle');
      return;
    }
    const refreshedPreferences = await preferences.refresh();
    if (connectionResult.purpose === 'receipt_import') {
      setActiveTaskId('gmail_import');
    } else if (connectionResult.purpose === 'export_ready_alerts') {
      setActiveTaskId('uber_export');
      showSimpleAlert('Export alerts are ready', 'Gmail is connected. SnackTrack can now check for Uber’s data-ready email while the app is active.');
    } else if (connectionResult.purpose === 'ongoing_tracking') {
      const recovery = resolveTrackingRecovery(refreshedPreferences);
      if (recovery.kind === 'eligible') {
        setActiveTaskId(null);
        showAlert(
          'Allow ongoing order tracking?',
          'SnackTrack will check Gmail for supported delivery receipts newer than your exports and periodically check for future orders. You can turn this off at any time.',
          [
            { text: 'Not Now', style: 'cancel', onPress: () => { void preferences.setOngoingTrackingConsent('declined'); } },
            {
              text: 'Allow Updates',
              onPress: () => {
                void preferences.setOngoingTrackingConsent('granted')
                  .then(() => showSimpleAlert('Setting up ongoing updates', 'SnackTrack is catching up from the end of your imported history.'));
              },
            },
          ],
        );
      } else {
        setPendingTrackingSetup(true);
        setActiveTaskId('gmail_import');
        showSimpleAlert('Gmail is ready', 'Check your email history once to establish a starting point. SnackTrack will ask separately before enabling ongoing updates.');
      }
    } else {
      setActiveTaskId('gmail_import');
      showSimpleAlert('Gmail reconnected', 'Your Gmail connection is ready. You can continue where you left off.');
    }
    setGmailConnectPhase('connected');
    connectSuccessTimer.current = setTimeout(() => {
      setGmailConnectPhase('idle');
      connectSuccessTimer.current = null;
    }, 2200);
  }, [busy, gmail.connectGmail, preferences.refresh]);

  const importEmail = useCallback(async (mode?: GmailImportMode) => {
    if (busy || !flow.hasConnectedEmail || !flow.canImportFromGmail) return;
    gmailImportMode.current = mode ?? (flow.hasImportedEmailData ? 'manual_check' : 'initial');
    try {
      await gmail.importReceipts();
    } finally {
      gmailImportMode.current = 'initial';
    }
  }, [busy, flow.canImportFromGmail, flow.hasConnectedEmail, flow.hasImportedEmailData, gmail.importReceipts]);

  const checkForNewOrders = useCallback(() => {
    setShowGmailModal(false);
    void importEmail('manual_check');
  }, [importEmail]);

  const setupOngoingUpdates = useCallback(() => {
    if (preferences.preferences?.ongoingTracking.effectiveState === 'error') {
      void preferences.checkOngoingTracking()
        .then(() => showSimpleAlert('Gmail checked', 'SnackTrack checked for newer delivery receipts.'))
        .catch(() => showSimpleAlert('Could not check Gmail', 'Your imported history is safe. Try again shortly.'));
      return;
    }
    const recovery = resolveTrackingRecovery(preferences.preferences);
    if (recovery.kind === 'unavailable') {
      showSimpleAlert('Gmail is temporarily unavailable', 'Your connection and imported history are safe. Try again shortly.');
      return;
    }
    if (recovery.kind === 'reconnect') {
      void connectEmail('ongoing_tracking');
      return;
    }
    if (recovery.kind === 'baseline') {
      showAlert(
        'Check email before enabling updates?',
        'SnackTrack will run one check for newer orders and establish where future checks should begin. You will choose ongoing permission separately afterward.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Check Email',
            onPress: () => {
              setPendingTrackingSetup(true);
              if (flow.hasConnectedEmail) void importEmail('initial');
              else void connectEmail('ongoing_tracking');
            },
          },
        ],
      );
      return;
    }
    showAlert(
      'Allow ongoing order tracking?',
      preferences.preferences?.ongoingTracking.baseline?.source === 'exports'
        ? 'SnackTrack will check Gmail for supported delivery receipts newer than your exports and periodically check for future orders. You can turn this off at any time.'
        : 'SnackTrack will periodically read supported delivery receipt emails to update your stats. You can turn this off at any time.',
      [
        { text: 'Not Now', style: 'cancel', onPress: () => { void preferences.setOngoingTrackingConsent('declined'); } },
        {
          text: 'Allow Updates',
          onPress: () => {
            void preferences.setOngoingTrackingConsent('granted')
              .then(() => showSimpleAlert('Setting up ongoing updates', 'SnackTrack is catching up from your existing history.'));
          },
        },
      ],
    );
  }, [connectEmail, flow.hasConnectedEmail, importEmail, preferences.checkOngoingTracking, preferences.preferences, preferences.setOngoingTrackingConsent]);

  useEffect(() => {
    if (!route.action || !route.intentId || handledActionIntent.current === route.intentId) return;
    if (gmail.isChecking || exportUpsell.isLoading || preferences.isLoading || busy) return;
    handledActionIntent.current = route.intentId;

    if (route.action === 'connect_gmail') {
      setActiveTaskId('connect_email');
      void connectEmail(route.gmailPurpose ?? 'connection_recovery');
    } else if (route.action === 'import_gmail') {
      if (!flow.showOneTimeGmailImport) {
        setActiveTaskId(null);
        setupOngoingUpdates();
      } else {
        if (route.gmailPurpose === 'ongoing_tracking') setPendingTrackingSetup(true);
        setActiveTaskId(flow.hasConnectedEmail ? 'gmail_import' : 'connect_email');
        if (flow.hasConnectedEmail) void importEmail(route.gmailPurpose === 'ongoing_tracking' ? 'initial' : undefined);
        else void connectEmail(route.gmailPurpose ?? 'receipt_import');
      }
    } else {
      setActiveTaskId('uber_export');
      if (route.provider) {
        setTutorialPlatform(toDataPlatform(route.provider));
        const providerProgress = route.provider === 'uber_eats'
          ? flow.exportProviderProgress.uberEats
          : flow.exportProviderProgress.doorDash;
        setTutorialEntryJob(resolveProviderTutorialEntry(providerProgress.status).job);
      }
      requestAnimationFrame(() => {
        if (exportSectionY !== null) {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, exportSectionY - 16), animated: true });
        }
      });
      const providerProgress = route.provider === 'uber_eats'
        ? flow.exportProviderProgress.uberEats
        : route.provider === 'doordash'
          ? flow.exportProviderProgress.doorDash
          : null;
      const targetAlreadyStarted = providerProgress
        ? providerProgress.imported || providerProgress.status !== 'not_started'
        : flow.exportRequested || flow.exportComplete;
      if (route.action === 'request_export' && !targetAlreadyStarted) {
        tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
      }
    }

    router.setParams({ action: undefined, intentId: undefined, provider: undefined, gmailPurpose: undefined });
  }, [
    busy, connectEmail, exportSectionY, exportUpsell.isLoading, flow.exportComplete,
    flow.exportRequested, flow.hasConnectedEmail, flow.showOneTimeGmailImport, gmail.isChecking, importEmail,
    preferences.isLoading, route.action, route.gmailPurpose, route.intentId, route.provider,
    setupOngoingUpdates,
  ]);

  const saveExportRequest = useCallback(async (platform: DataPlatform, decision?: 'granted' | 'declined') => {
    try {
      if (decision) await preferences.setMonitoringConsent(decision);
      const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
      await preferences.markExportRequested(provider);
    } catch {
      showSimpleAlert('Could not save your export status', 'Your tutorial is complete, but we could not save this status. Please try again from Import.');
    }
  }, [preferences.markExportRequested, preferences.setMonitoringConsent]);

  const completeTutorial = useCallback((platform: DataPlatform) => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
    if (platform === 'doordash' || preferences.preferences?.monitoring.consentState === 'granted') {
      void saveExportRequest(platform);
      return;
    }
    showAlert('Notify you when it’s ready?', 'Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.', [
      { text: 'Not Now', style: 'cancel', onPress: () => { void saveExportRequest(platform, 'declined'); } },
      { text: 'Notify Me', onPress: () => { void saveExportRequest(platform, 'granted'); } },
    ]);
  }, [preferences.preferences?.monitoring.consentState, saveExportRequest]);

  const tutorialStillWaiting = useCallback((platform: DataPlatform) => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);

    if (platform === 'doordash') {
      void saveExportRequest(platform);
      showSimpleAlert(
        'Your DoorDash export is on the way',
        'DoorDash typically prepares your archive within a few hours, though it can take longer. Keep an eye on your email for a message from DoorDash saying your data archive is ready. The email should include “View Your Data Archive.”',
      );
      return;
    }

    const message = `Uber typically prepares your archive within a few hours, though it can take longer. Keep an eye on your email for “${UBER_EXPORT_EMAIL_SUBJECT}” from ${UBER_EXPORT_EMAIL_ADDRESS}.`;
    if (preferences.preferences?.monitoring.consentState === 'granted') {
      void saveExportRequest(platform);
      showSimpleAlert('Your Uber export is on the way', message);
      return;
    }

    showAlert(
      'Your Uber export is on the way',
      `${message}\n\nSnackTrack can check only for that data-ready email and let you know when it arrives.`,
      [
        { text: 'I’ll Check Myself', style: 'cancel', onPress: () => { void saveExportRequest(platform, 'declined'); } },
        { text: 'Notify Me', onPress: () => { void saveExportRequest(platform, 'granted'); } },
      ],
    );
  }, [preferences.preferences?.monitoring.consentState, saveExportRequest]);

  const reportDownloaded = useCallback(async (provider: ExportProvider = handoffProvider) => {
    if (!userId) return;
    const providerState = provider === 'uber_eats'
      ? preferences.preferences?.export.providers?.uberEats
      : preferences.preferences?.export.providers?.doorDash;
    const readyVersion = providerState?.updatedAt ?? exportReadyVersion;
    await setExportDownloadHandoffState(userId, provider, readyVersion, 'downloaded');
    setExportDownloadState('downloaded');
    pickerRequest.current += 1;
    setAutoOpenExportPickerToken(`${readyVersion}:local:${pickerRequest.current}`);
  }, [exportReadyVersion, handoffProvider, preferences.preferences?.export.providers, userId]);

  const tutorialArchiveDownloaded = useCallback((platform: DataPlatform) => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
    void reportDownloaded(platform === 'uber' ? 'uber_eats' : 'doordash');
  }, [reportDownloaded]);

  const tutorialReadyConfirmed = useCallback((platform: DataPlatform) => {
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    setTutorialEntryJob('download');
    void preferences.confirmExportReady(provider).catch(() => {
      showSimpleAlert('Status not saved', 'You can continue downloading the archive, but SnackTrack could not save that it is ready.');
    });
  }, [preferences.confirmExportReady]);

  const openExportEmail = useCallback(async () => {
    if (!userId || !flow.exportFileReady) return;
    if (handoffProvider !== 'uber_eats') {
      showSimpleAlert('Open the DoorDash ready email', 'Look for the message containing “View Your Data Archive,” download the ZIP, then return to SnackTrack.');
      return;
    }
    setExportDownloadState('checking_email');
    await setExportDownloadHandoffState(userId, handoffProvider, exportReadyVersion, 'checking_email');
    try {
      await openUberExportEmail();
    } catch {
      setExportDownloadState('not_downloaded');
      await setExportDownloadHandoffState(userId, handoffProvider, exportReadyVersion, 'not_downloaded');
      showAlert('Could not open Gmail', `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`, [{ text: 'OK' }]);
    }
  }, [exportReadyVersion, flow.exportFileReady, handoffProvider, userId]);

  const uploadSucceeded = useCallback(async (result: CSVImportResponse) => {
    await exportUpsell.markCompleted();
    if (userId) {
      await resetExportDownloadStateForProvider(userId, result.provider);
      await invalidateReceiptDerivedData(queryClient, userId);
    }
    const refreshedPreferences = await preferences.refresh();
    const providerCoverage = refreshedPreferences?.coverage.exportProviders;
    const importedProviderCount = Number(providerCoverage?.uberEats.hasData)
      + Number(providerCoverage?.doorDash.hasData);

    setActiveTaskId('uber_export');
    const missingProvider = providerCoverage
      ? providerCoverage.uberEats.hasData ? 'DoorDash' : 'Uber Eats'
      : null;
    const providerName = result.provider === 'uber_eats' ? 'Uber Eats' : 'DoorDash';
    const recommendation = resolveImportSetupRecommendation({
      preferences: refreshedPreferences,
      gmailFeatureEnabled,
      gmailConnected: flow.hasConnectedEmail,
      gmailNeedsReconnect: flow.needsReconnect,
    });
    const nextTask = taskForRecommendation(recommendation);
    const message = importedProviderCount >= 2
      ? `${providerName} added ${result.importedCount} receipts. Both delivery exports are now included in your stats.`
      : `${providerName} added ${result.importedCount} receipts.${missingProvider ? ` You can also add ${missingProvider} for more complete history.` : ''}`;
    showAlert('Export imported', message, [
      {
        text: recommendation.kind === 'provider'
          ? `Add ${recommendation.provider.name}`
          : recommendation.kind === 'enable_tracking'
            ? 'Enable Ongoing Updates'
          : recommendation.kind === 'scan_email' || recommendation.kind === 'connect_email' || recommendation.kind === 'email_optional'
            ? 'Set Up Optional Updates'
            : 'Done',
        style: 'cancel',
        onPress: () => {
          if (recommendation.kind === 'enable_tracking') setupOngoingUpdates();
          else setActiveTaskId(nextTask);
        },
      },
      { text: 'View My Stats', onPress: () => { void completeWrappedNavigation(); } },
    ]);
  }, [completeWrappedNavigation, exportUpsell.markCompleted, flow.hasConnectedEmail, flow.needsReconnect, gmailFeatureEnabled, preferences.refresh, queryClient, setupOngoingUpdates, userId]);

  const openTutorial = useCallback((platform?: DataPlatform) => {
    setTutorialPlatform(platform);
    if (platform) {
      const providerProgress = platform === 'uber'
        ? flow.exportProviderProgress.uberEats
        : flow.exportProviderProgress.doorDash;
      setTutorialEntryJob(resolveProviderTutorialEntry(providerProgress.status).job);
    } else {
      setTutorialEntryJob(undefined);
    }
    setShowTutorial(true);
  }, [flow.exportProviderProgress.doorDash, flow.exportProviderProgress.uberEats]);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
  }, []);

  const autoOpenConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (route.downloadedVersion) router.setParams({ downloadedVersion: undefined });
  }, [route.downloadedVersion]);

  const gmailButtonLabel = gmail.primaryFlowState === 'connecting'
    ? 'Connecting Gmail…'
    : gmail.primaryFlowState === 'preparing_import' || gmail.primaryFlowState === 'importing'
      ? 'Importing receipts…'
      : flow.gmailImportPresentation.idleButtonLabel;

  return {
    user: userState.user,
    scrollViewRef,
    offline,
    gmailFeatureEnabled,
    flow,
    busy,
    activeTaskId,
    exportDownloadState,
    autoOpenExportPickerToken,
    gmailButtonLabel,
    ongoingUpdatesPresentation,
    showTutorial,
    showGmailModal,
    showGmailImportLoadingModal,
    gmailConnectPhase,
    primaryFlowState: gmail.primaryFlowState,
    gmailConnectionStatus: gmail.connectionStatus,
    isGmailLoading: gmail.isLoading,
    isGmailChecking: gmail.isChecking,
    canCheckForNewOrders: flow.hasImportedEmailData
      && flow.hasConnectedEmail
      && flow.canImportFromGmail
      && !flow.needsReconnect
      && !flow.gmailTemporarilyUnavailable
      && !busy,
    toggleTask,
    connectEmail: () => { void connectEmail('receipt_import'); },
    importEmail: () => { void importEmail(); },
    checkForNewOrders,
    setupOngoingUpdates,
    openGmailSettings: () => setShowGmailModal(true),
    closeGmailSettings: () => setShowGmailModal(false),
    tutorialPlatform,
    tutorialEntryJob,
    tutorialMode: tutorialEntryJob === 'download' || tutorialEntryJob === 'retry' || tutorialEntryJob === 'processing'
      ? 'download' as const
      : 'request' as const,
    closeTutorial,
    openTutorial: () => openTutorial(),
    openProviderTutorial: openTutorial,
    completeTutorial,
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    tutorialReadyConfirmed,
    reportDownloaded: () => { void reportDownloaded(); },
    openExportEmail: () => { void openExportEmail(); },
    autoOpenConsumed,
    uploadSucceeded: (result: CSVImportResponse) => { void uploadSucceeded(result); },
    uploadFailed: (_message: string) => { void preferences.refresh(); },
    recordExportLayout: (event: LayoutChangeEvent) => setExportSectionY(event.nativeEvent.layout.y),
    disconnectGmail: gmail.disconnectGmail,
    completeWrappedNavigation: () => { void completeWrappedNavigation(); },
  };
}
