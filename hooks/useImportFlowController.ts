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
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  type ExportDownloadHandoffState, getExportDownloadHandoffState, openUberExportEmail,
  setExportDownloadHandoffState, UBER_EXPORT_EMAIL_ADDRESS, UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { captureException } from '@utils/sentry';
import { createWrappedRestartHref } from '@features/wrapped/wrappedNavigation';

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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialPlatform, setTutorialPlatform] = useState<DataPlatform | undefined>();
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] = useState<GmailConnectPhase>('idle');
  const [exportDownloadState, setExportDownloadState] = useState<ExportDownloadHandoffState>('not_downloaded');
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<string | null>(null);
  const offline = useOfflineSync();
  const gmailFeatureEnabled = featureFlags.showGmailImport;

  const gmail = useGmailImport({
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      const newOrders = result.newOrders ?? result.totalReceiptsImported;
      const updatedOrders = result.updatedOrders ?? 0;
      const unchangedOrders = result.unchangedOrders ?? 0;
      const title = result.totalReceiptsProcessed === 0
        ? 'Gmail scan complete'
        : 'Gmail history imported';
      const message = result.totalReceiptsProcessed === 0
        ? 'No supported delivery receipts were found. You can scan again later or add an Uber Eats or DoorDash export.'
        : `${newOrders} new, ${updatedOrders} updated, and ${unchangedOrders} unchanged order${newOrders + updatedOrders + unchangedOrders === 1 ? '' : 's'} processed (${result.totalReceiptsProcessed} total).`;
      setTimeout(() => showAlert(title, message, [
        { text: 'Add Another Source', style: 'cancel', onPress: () => setActiveTaskId('uber_export') },
        { text: 'View My Stats', onPress: () => router.replace(createWrappedRestartHref()) },
      ]), 0);
    },
  });
  const exportUpsell = useExportUpsell(userId);
  const preferences = useImportPreferences(Boolean(userId));
  const flow = useMemo(() => resolveImportFlowState({
    preferences: preferences.preferences,
    gmailStatus: gmail.connectionStatus,
    localExportComplete: exportUpsell.hasCompletedExport,
    downloadState: exportDownloadState,
    gmailFeatureEnabled,
    focusExport: route.focus === 'export',
    showExportTutorial: route.showExportTutorial,
  }), [
    exportDownloadState, exportUpsell.hasCompletedExport, gmail.connectionStatus,
    gmailFeatureEnabled, preferences.preferences,
    route.focus, route.showExportTutorial,
  ]);

  const exportReadyVersion = preferences.preferences?.export.updatedAt ?? 'ready';
  const busy = gmail.primaryFlowState !== 'idle' || gmail.isChecking;
  const showGmailImportLoadingModal = gmailFeatureEnabled && (
    gmailConnectPhase !== 'idle'
    || gmail.primaryFlowState === 'preparing_import' || gmail.primaryFlowState === 'importing'
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
    void getExportDownloadHandoffState(userId, exportReadyVersion).then((nextState) => {
      if (!cancelled) setExportDownloadState(nextState);
    });
    return () => { cancelled = true; };
  }, [exportReadyVersion, flow.exportFileReady, userId]);

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
      ? `${route.downloadedVersion ?? 'export'}:${route.showExportTutorial}`
      : null;
    if (!focusKey || exportSectionY === null || handledFocusKey.current === focusKey) return;
    handledFocusKey.current = focusKey;
    setActiveTaskId('uber_export');
    requestAnimationFrame(() => scrollViewRef.current?.scrollTo({ y: Math.max(0, exportSectionY - 16), animated: true }));
    if (route.showExportTutorial) {
      tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
    }
  }, [exportSectionY, route.downloadedVersion, route.focus, route.showExportTutorial]);

  useEffect(() => {
    if (initialTaskApplied.current || gmail.isChecking || exportUpsell.isLoading || preferences.isLoading) return;
    initialTaskApplied.current = true;
    setActiveTaskId(flow.initialOpenTask);
  }, [exportUpsell.isLoading, flow.initialOpenTask, gmail.isChecking, preferences.isLoading]);

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
    } finally {
    }
  }, [queryClient, userId]);

  const toggleTask = useCallback((taskId: ImportTaskId) => {
    setActiveTaskId((current) => current === taskId ? null : taskId);
  }, []);

  const connectEmail = useCallback(async () => {
    if (busy) return;
    if (connectSuccessTimer.current) clearTimeout(connectSuccessTimer.current);
    setGmailConnectPhase('connecting');
    const connected = await gmail.connectGmail();
    if (!connected) {
      setGmailConnectPhase('idle');
      return;
    }
    setActiveTaskId('gmail_import');
    setGmailConnectPhase('connected');
    connectSuccessTimer.current = setTimeout(() => {
      setGmailConnectPhase('idle');
      connectSuccessTimer.current = null;
    }, 2200);
  }, [busy, gmail.connectGmail]);

  const importEmail = useCallback(async () => {
    if (busy || !flow.hasConnectedEmail || !flow.canImportFromGmail) return;
    await gmail.importReceipts();
  }, [busy, flow.canImportFromGmail, flow.hasConnectedEmail, gmail.importReceipts]);

  useEffect(() => {
    if (!route.action || !route.intentId || handledActionIntent.current === route.intentId) return;
    if (gmail.isChecking || exportUpsell.isLoading || preferences.isLoading || busy) return;
    handledActionIntent.current = route.intentId;

    if (route.action === 'connect_gmail') {
      setActiveTaskId('connect_email');
      void connectEmail();
    } else if (route.action === 'import_gmail') {
      setActiveTaskId(flow.hasConnectedEmail ? 'gmail_import' : 'connect_email');
      if (flow.hasConnectedEmail) void importEmail();
      else void connectEmail();
    } else {
      setActiveTaskId('uber_export');
      requestAnimationFrame(() => {
        if (exportSectionY !== null) {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, exportSectionY - 16), animated: true });
        }
      });
      if (route.action === 'request_export' && !flow.exportRequested && !flow.exportComplete) {
        tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
      }
    }

    router.setParams({ action: undefined, intentId: undefined });
  }, [
    busy, connectEmail, exportSectionY, exportUpsell.isLoading, flow.exportComplete,
    flow.exportRequested, flow.hasConnectedEmail, gmail.isChecking, importEmail,
    preferences.isLoading, route.action, route.intentId,
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

  const reportDownloaded = useCallback(async () => {
    if (!userId) return;
    await setExportDownloadHandoffState(userId, exportReadyVersion, 'downloaded');
    setExportDownloadState('downloaded');
    pickerRequest.current += 1;
    setAutoOpenExportPickerToken(`${exportReadyVersion}:local:${pickerRequest.current}`);
  }, [exportReadyVersion, userId]);

  const tutorialArchiveDownloaded = useCallback((_platform: DataPlatform) => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    void reportDownloaded();
  }, [reportDownloaded]);

  const openExportEmail = useCallback(async () => {
    if (!userId || !flow.exportFileReady) return;
    setExportDownloadState('checking_email');
    await setExportDownloadHandoffState(userId, exportReadyVersion, 'checking_email');
    try {
      await openUberExportEmail();
    } catch {
      setExportDownloadState('not_downloaded');
      await setExportDownloadHandoffState(userId, exportReadyVersion, 'not_downloaded');
      showAlert('Could not open Gmail', `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`, [{ text: 'OK' }]);
    }
  }, [exportReadyVersion, flow.exportFileReady, userId]);

  const uploadSucceeded = useCallback(async (result: CSVImportResponse) => {
    await exportUpsell.markCompleted();
    if (userId) await invalidateReceiptDerivedData(queryClient, userId);
    const refreshedPreferences = await preferences.refresh();
    const providerCoverage = refreshedPreferences?.coverage.exportProviders;
    const importedProviderCount = Number(providerCoverage?.uberEats.hasData)
      + Number(providerCoverage?.doorDash.hasData);

    setActiveTaskId('uber_export');
    const missingProvider = providerCoverage
      ? providerCoverage.uberEats.hasData ? 'DoorDash' : 'Uber Eats'
      : null;
    const providerName = result.provider === 'uber_eats' ? 'Uber Eats' : 'DoorDash';
    const message = importedProviderCount >= 2
      ? `${providerName} added ${result.importedCount} receipts. Both delivery exports are now included in your stats.`
      : `${providerName} added ${result.importedCount} receipts.${missingProvider ? ` You can also add ${missingProvider} for more complete history.` : ''}`;
    showAlert('Export imported', message, [
      {
        text: importedProviderCount >= 2 ? 'Stay on Import' : 'Add Another Source',
        style: 'cancel',
        onPress: () => setActiveTaskId('uber_export'),
      },
      { text: 'View My Stats', onPress: () => { void completeWrappedNavigation(); } },
    ]);
  }, [completeWrappedNavigation, exportUpsell.markCompleted, preferences.refresh, queryClient, userId]);

  const openTutorial = useCallback((platform?: DataPlatform) => {
    setTutorialPlatform(platform);
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    setTutorialPlatform(undefined);
  }, []);

  const autoOpenConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (route.downloadedVersion) router.setParams({ downloadedVersion: undefined });
  }, [route.downloadedVersion]);

  const gmailButtonLabel = gmail.primaryFlowState === 'connecting'
    ? 'Connecting Gmail…'
    : gmail.primaryFlowState === 'preparing_import' || gmail.primaryFlowState === 'importing'
      ? 'Importing receipts…'
      : flow.hasImportedEmailData ? 'Re-import from Gmail' : 'Import from Gmail';

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
    showTutorial,
    showGmailModal,
    showGmailImportLoadingModal,
    gmailConnectPhase,
    primaryFlowState: gmail.primaryFlowState,
    gmailConnectionStatus: gmail.connectionStatus,
    isGmailLoading: gmail.isLoading,
    isGmailChecking: gmail.isChecking,
    toggleTask,
    connectEmail: () => { void connectEmail(); },
    importEmail: () => { void importEmail(); },
    openGmailSettings: () => setShowGmailModal(true),
    closeGmailSettings: () => setShowGmailModal(false),
    tutorialPlatform,
    closeTutorial,
    openTutorial: () => openTutorial(),
    openProviderTutorial: openTutorial,
    completeTutorial,
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    reportDownloaded: () => { void reportDownloaded(); },
    openExportEmail: () => { void openExportEmail(); },
    autoOpenConsumed,
    uploadSucceeded: (result: CSVImportResponse) => { void uploadSucceeded(result); },
    uploadFailed: (_message: string) => undefined,
    recordExportLayout: (event: LayoutChangeEvent) => setExportSectionY(event.nativeEvent.layout.y),
    disconnectGmail: gmail.disconnectGmail,
    completeWrappedNavigation: () => { void completeWrappedNavigation(); },
  };
}
