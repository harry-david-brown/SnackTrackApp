import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, type ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { featureFlags } from '@config/featureFlags';
import { useUser } from '@contexts/UserContext';
import type { ImportTaskId } from '@components/upload/ImportTaskCard';
import type { GmailConnectPhase } from '@components/gmail/GmailImportLoadingModal';
import type { GmailImportResponse } from '@services/gmailApi';
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
  setExportDownloadHandoffState, UBER_EXPORT_EMAIL_SEARCH_QUERY,
} from '@utils/exportDownloadHandoff';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { captureException } from '@utils/sentry';

export function useImportFlowController(route: ImportRouteParams) {
  const { state: userState } = useUser();
  const userId = userState.user?.id;
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const connectSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRequest = useRef(0);
  const autoImportKey = useRef<string | null>(null);
  const handledFocusKey = useRef<string | null>(null);
  const initialTaskApplied = useRef(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailImportResult, setGmailImportResult] = useState<GmailImportResponse | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] = useState<GmailConnectPhase>('idle');
  const [exportDownloadState, setExportDownloadState] = useState<ExportDownloadHandoffState>('not_downloaded');
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<string | null>(null);
  const offline = useOfflineSync();
  const gmailFeatureEnabled = featureFlags.showGmailImport;

  const gmail = useGmailImport({
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      setGmailImportResult(result);
    },
  });
  const exportUpsell = useExportUpsell(userId);
  const preferences = useImportPreferences(Boolean(userId));
  const flow = useMemo(() => resolveImportFlowState({
    preferences: preferences.preferences,
    gmailStatus: gmail.connectionStatus,
    localExportComplete: exportUpsell.hasCompletedExport,
    gmailImportSucceeded: gmailImportResult?.success ?? false,
    downloadState: exportDownloadState,
    gmailFeatureEnabled,
    focusExport: route.focus === 'export',
    showExportTutorial: route.showExportTutorial,
  }), [
    exportDownloadState, exportUpsell.hasCompletedExport, gmail.connectionStatus,
    gmailFeatureEnabled, gmailImportResult?.success, preferences.preferences,
    route.focus, route.showExportTutorial,
  ]);

  const exportReadyVersion = preferences.preferences?.export.updatedAt ?? 'ready';
  const busy = gmail.primaryFlowState !== 'idle' || gmail.isChecking;
  const showGmailImportLoadingModal = gmailFeatureEnabled && !showLoader && (
    gmailImportResult !== null || gmailConnectPhase !== 'idle'
    || gmail.primaryFlowState === 'preparing_import' || gmail.primaryFlowState === 'importing'
  );

  useFocusEffect(useCallback(() => {
    void preferences.refresh();
  }, [preferences.refresh]));

  useEffect(() => {
    initialTaskApplied.current = false;
    autoImportKey.current = null;
    handledFocusKey.current = null;
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
    if (!gmailFeatureEnabled || !route.autoImportGmail || !route.autoImportFlowId || gmail.isChecking) return;
    if (autoImportKey.current === route.autoImportFlowId) return;
    autoImportKey.current = route.autoImportFlowId;
    void gmail.resumeAutoImport(route.autoImportFlowId);
  }, [gmail, gmailFeatureEnabled, route.autoImportFlowId, route.autoImportGmail]);

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
      router.replace('/(tabs)/wrapped-journey');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error('Wrapped preload failed'), { context: 'import-flow-completion' });
      router.replace('/(tabs)/wrapped-journey');
    } finally {
      setShowLoader(false);
    }
  }, [queryClient, userId]);

  useEffect(() => {
    if (!gmailImportResult) return;
    const timer = setTimeout(() => {
      void completeWrappedNavigation().finally(() => setGmailImportResult(null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [completeWrappedNavigation, gmailImportResult]);

  const toggleTask = useCallback((taskId: ImportTaskId) => {
    setActiveTaskId((current) => current === taskId ? null : taskId);
  }, []);

  const connectEmail = useCallback(async () => {
    if (busy) return;
    if (connectSuccessTimer.current) clearTimeout(connectSuccessTimer.current);
    setGmailConnectPhase('connecting');
    const connected = await gmail.connectAndImportGmail();
    if (!connected) {
      setGmailConnectPhase('idle');
      return;
    }
    setActiveTaskId(flow.exportComplete ? null : 'uber_export');
    setGmailConnectPhase('connected');
    connectSuccessTimer.current = setTimeout(() => {
      setGmailConnectPhase('idle');
      connectSuccessTimer.current = null;
    }, 2200);
  }, [busy, flow.exportComplete, gmail.connectAndImportGmail]);

  const importEmail = useCallback(async () => {
    if (busy || !flow.hasConnectedEmail || !flow.canImportFromGmail) return;
    await gmail.importReceipts();
  }, [busy, flow.canImportFromGmail, flow.hasConnectedEmail, gmail.importReceipts]);

  const saveExportRequest = useCallback(async (decision?: 'granted' | 'declined') => {
    try {
      if (decision) await preferences.setMonitoringConsent(decision);
      await preferences.markExportRequested();
    } catch {
      showSimpleAlert('Could not save your export status', 'Your tutorial is complete, but we could not save this status. Please try again from Import.');
    }
  }, [preferences.markExportRequested, preferences.setMonitoringConsent]);

  const completeTutorial = useCallback((platform: DataPlatform) => {
    setShowTutorial(false);
    if (platform === 'doordash' || preferences.preferences?.monitoring.consentState === 'granted') {
      void saveExportRequest();
      return;
    }
    showAlert('Notify you when it’s ready?', 'Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.', [
      { text: 'Not Now', style: 'cancel', onPress: () => { void saveExportRequest('declined'); } },
      { text: 'Notify Me', onPress: () => { void saveExportRequest('granted'); } },
    ]);
  }, [preferences.preferences?.monitoring.consentState, saveExportRequest]);

  const reportDownloaded = useCallback(async () => {
    if (!userId || !flow.exportFileReady) return;
    await setExportDownloadHandoffState(userId, exportReadyVersion, 'downloaded');
    setExportDownloadState('downloaded');
    pickerRequest.current += 1;
    setAutoOpenExportPickerToken(`${exportReadyVersion}:local:${pickerRequest.current}`);
  }, [exportReadyVersion, flow.exportFileReady, userId]);

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

  const uploadSucceeded = useCallback(async (_count: number) => {
    await exportUpsell.markCompleted();
    if (userId) await invalidateReceiptDerivedData(queryClient, userId);
    setShowLoader(true);
  }, [exportUpsell.markCompleted, queryClient, userId]);

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
    showLoader,
    gmailImportResult,
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
    closeTutorial: () => setShowTutorial(false),
    openTutorial: () => setShowTutorial(true),
    completeTutorial,
    reportDownloaded: () => { void reportDownloaded(); },
    openExportEmail: () => { void openExportEmail(); },
    autoOpenConsumed,
    uploadSucceeded: (count: number) => { void uploadSucceeded(count); },
    uploadFailed: (_message: string) => undefined,
    recordExportLayout: (event: LayoutChangeEvent) => setExportSectionY(event.nativeEvent.layout.y),
    disconnectGmail: gmail.disconnectGmail,
    completeWrappedNavigation: () => { void completeWrappedNavigation(); },
  };
}
