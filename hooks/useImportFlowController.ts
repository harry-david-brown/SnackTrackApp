import { useMailboxImportActions } from './useMailboxImportActions';
import { type LayoutChangeEvent, type ScrollView } from 'react-native';
import { useImportResources } from './useImportResources';
import { useMailboxConnectionActions, type MailboxConnectionOutcome } from './useMailboxConnectionActions';
import { useProviderExportHandoff } from './useProviderExportHandoff';
import { suppressAdsForSession } from '@features/ads/adSession';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { appDestinations, useAppNavigation } from "@features/navigation";
import { featureFlags } from "@config/featureFlags";
import type { ImportTaskId } from "@components/upload/ImportTaskCard";
import type {
  ExportProvider,
  ImportOperation,
} from "@features/import-flow/contracts";
import { useExportUpsell } from "./useExportUpsell";
import type { ImportRouteParams } from "@features/import-flow/importRouteParams";
import { resolveImportFlowState } from "@features/import-flow/importFlowResolver";
import {
  toDataPlatform,
} from "@features/import-flow/importJourneyState";
import { showAlert, showSimpleAlert } from "@utils/platformAlert";
import {
  resolveOngoingUpdatesPresentation,
} from "@features/import-flow/trackingEligibility";
import type { ImportSetupPath } from "@features/import-flow/initialImportJourney";
import { trackAdminEvent } from "@services/adminAnalytics";

import { emailUpdatesPresentation } from '@features/import-flow/emailImportPresentation';
import { parseImportReturnTo } from '@features/import-flow/importNavigation';
import { useMailboxReturnReadiness } from './useMailboxReturnReadiness';

type GmailImportMode = "initial" | "manual_check";

export function useImportFlowController(route: ImportRouteParams, screenMode: 'auto' | 'setup' | 'manage' = 'auto') {
  const navigation = useAppNavigation();
  const returnTo = parseImportReturnTo(route.returnTo);
  const resources = useImportResources(route.journeyContext ?? (screenMode === 'setup' ? 'onboarding' : 'post_onboarding'), returnTo);
  const { userState, userId, preferences, gmail, outlook, connectionBusy } = resources;
  const { operation: activeImportOperation, isUnavailable: activeImportUnavailable, refresh: refreshActiveImport } = resources.active;
  const refreshGmailConnectionStatus = gmail.refreshConnectionStatus;
  const { refresh: refreshPreferences } = preferences;
  const scrollViewRef = useRef<ScrollView>(null);
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledFocusKey = useRef<string | null>(null);
  const handledActionIntent = useRef<string | null>(null);
  const initialTaskApplied = useRef(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [selectedSetupPath, setSelectedSetupPath] =
    useState<ImportSetupPath>(route.sourcePicker ? "alternative" : route.mailbox ?? null);
  const [pendingTrackingSetup, setPendingTrackingSetup] = useState(false);
  useEffect(() => { setPendingTrackingSetup(false); }, [userId]);
  const handleConnectionOutcome = useCallback((outcome: MailboxConnectionOutcome) => {
    if (outcome.needsBaseline) setPendingTrackingSetup(true);
    if (outcome.provider === 'outlook' && !outcome.connected) setActiveTaskId('connect_email');
    else if (outcome.purpose === 'export_ready_alerts') setActiveTaskId('uber_export');
    else if (outcome.connected && outcome.purpose === 'ongoing_tracking' && !outcome.needsBaseline) setActiveTaskId(null);
    else setActiveTaskId(outcome.connected || outcome.purpose === 'connection_recovery' ? 'gmail_import' : 'connect_email');
  }, []);
  const { connectEmail, connectOutlook, gmailConnectPhase } = useMailboxConnectionActions(resources, handleConnectionOutcome);
  const gmailFeatureEnabled = featureFlags.showGmailImport;
  const exportUpsell = useExportUpsell(userId);
  const handoff = useProviderExportHandoff(resources, { provider: route.provider, returnTo,
    journeyContext: route.journeyContext, downloadedVersion: route.downloadedVersion,
    showExportTutorial: route.showExportTutorial, screenMode });
  const { requestSaving, showTutorial, tutorialPlatform, tutorialEntryJob, exportDownloadState,
    autoOpenExportPickerToken, openProviderRequestPage, completeTutorial, tutorialStillWaiting,
    reportDownloaded, tutorialArchiveDownloaded, tutorialReadyConfirmed, openExportEmail,
    openProviderTutorial: openTutorial, closeTutorial, autoOpenConsumed,
    prepareTutorial, showPreparedTutorial } = handoff;
  const flow = useMemo(
    () =>
      resolveImportFlowState({
        preferences: preferences.preferences,
        gmailStatus: gmail.connectionStatus,
        outlookStatus: outlook.connectionStatus,
        downloadState: exportDownloadState,
        gmailFeatureEnabled,
        focusExport: route.focus === "export",
        showExportTutorial: route.showExportTutorial,
      }),
    [
      exportDownloadState,
      gmail.connectionStatus,
      outlook.connectionStatus,
      gmailFeatureEnabled,
      preferences.preferences,
      route.focus,
      route.showExportTutorial,
    ],
  );

  const { oauthReturn, clearOAuthReturn } = useMailboxReturnReadiness({
    userId, provider: route.mailbox ?? null, enabled: screenMode === 'setup',
    succeeded: Boolean(route.connectionSucceeded), failed: Boolean(route.connectionFailed),
    refresh: preferences.refresh, selectProvider: setSelectedSetupPath,
  });

  useEffect(() => {
    if (route.sourcePicker) setSelectedSetupPath("alternative");
  }, [route.sourcePicker]);


  const busy = connectionBusy || Boolean(activeImportOperation && ["awaiting_upload", "pending_dispatch", "queued", "running", "retrying"].includes(activeImportOperation.status));
  const showGmailImportLoadingModal = gmailConnectPhase !== "idle";
  const ongoingUpdatesPresentation = resolveOngoingUpdatesPresentation(
    preferences.preferences,
    flow.hasImportedEmailData || flow.hasAnyExportData,
  );

  useFocusEffect(
    useCallback(() => {
      void refreshPreferences();
    }, [refreshPreferences]),
  );

  useEffect(() => {
    initialTaskApplied.current = false;
    handledFocusKey.current = null;
    handledActionIntent.current = null;
  }, [userId]);

  useEffect(
    () => () => {
      if (tutorialTimer.current) clearTimeout(tutorialTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (gmailFeatureEnabled && showGmailModal)
      void refreshGmailConnectionStatus();
  }, [gmailFeatureEnabled, refreshGmailConnectionStatus, showGmailModal]);

  useEffect(() => {
    const focusKey =
      route.focus === "export"
        ? `${route.downloadedVersion ?? "export"}:${route.provider ?? "any"}:${route.showExportTutorial}`
        : null;
    if (
      !focusKey ||
      exportSectionY === null ||
      handledFocusKey.current === focusKey
    )
      return;
    handledFocusKey.current = focusKey;
    setActiveTaskId("uber_export");
    if (route.provider) prepareTutorial(toDataPlatform(route.provider));
    requestAnimationFrame(() =>
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, exportSectionY - 16),
        animated: true,
      }),
    );
    if (route.showExportTutorial) {
      tutorialTimer.current = setTimeout(showPreparedTutorial, 300);
    }
  }, [
    prepareTutorial,
    showPreparedTutorial,
    exportSectionY,
    flow.exportProviderProgress.doorDash,
    flow.exportProviderProgress.uberEats,
    route.downloadedVersion,
    route.focus,
    route.provider,
    route.showExportTutorial,
  ]);

  useEffect(() => {
    if (
      initialTaskApplied.current ||
      gmail.isChecking ||
      exportUpsell.isLoading ||
      preferences.isLoading
    )
      return;
    initialTaskApplied.current = true;
    setActiveTaskId(flow.initialOpenTask);
  }, [
    exportUpsell.isLoading,
    flow.initialOpenTask,
    gmail.isChecking,
    preferences.isLoading,
  ]);

  const toggleTask = useCallback((taskId: ImportTaskId) => {
    setActiveTaskId((current) => (current === taskId ? null : taskId));
  }, []);

  const { importEmail, importOutlook } = useMailboxImportActions(resources, returnTo, pendingTrackingSetup);

  const checkForNewOrders = useCallback(() => {
    setShowGmailModal(false);
    void importEmail("manual_check");
  }, [importEmail]);

  const setupOngoingUpdates = useCallback(() => {
    navigation.open(appDestinations.ongoingUpdates);
  }, [navigation]);

  useEffect(() => {
    if (
      screenMode === 'setup' ||
      !route.action ||
      !route.intentId ||
      handledActionIntent.current === route.intentId
    )
      return;
    if (
      gmail.isChecking ||
      exportUpsell.isLoading ||
      preferences.isLoading ||
      busy
    )
      return;
    handledActionIntent.current = route.intentId;

    if (route.action === "connect_gmail") {
      setActiveTaskId("connect_email");
      void connectEmail(route.gmailPurpose ?? "connection_recovery");
    } else if (route.action === "import_gmail") {
      if (!flow.showOneTimeGmailImport) {
        setActiveTaskId(null);
        setupOngoingUpdates();
      } else {
        if (route.gmailPurpose === "ongoing_tracking")
          setPendingTrackingSetup(true);
        setActiveTaskId(
          flow.hasConnectedEmail ? "gmail_import" : "connect_email",
        );
        if (flow.gmailConnected && flow.canImportFromGmail)
          void importEmail(
            route.gmailPurpose === "ongoing_tracking" ? "initial" : undefined,
          );
        else if (flow.outlookConnected && flow.canImportFromOutlook)
          void importOutlook(
            route.gmailPurpose === "ongoing_tracking" ? "initial" : undefined,
          );
        else void connectEmail(route.gmailPurpose ?? "receipt_import");
      }
    } else {
      setActiveTaskId("uber_export");
      if (route.provider) prepareTutorial(toDataPlatform(route.provider));
      requestAnimationFrame(() => {
        if (exportSectionY !== null) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, exportSectionY - 16),
            animated: true,
          });
        }
      });
      const providerProgress =
        route.provider === "uber_eats"
          ? flow.exportProviderProgress.uberEats
          : route.provider === "doordash"
            ? flow.exportProviderProgress.doorDash
            : null;
      const targetAlreadyStarted = providerProgress
        ? providerProgress.imported || providerProgress.status !== "not_started"
        : flow.exportRequested || flow.exportComplete;
      if (route.action === "request_export" && !targetAlreadyStarted) {
        tutorialTimer.current = setTimeout(showPreparedTutorial, 300);
      }
    }

    navigation.setParams({
      action: undefined,
      intentId: undefined,
      provider: undefined,
      gmailPurpose: undefined,
    });
  }, [
    prepareTutorial,
    showPreparedTutorial,
    busy,
    connectEmail,
    exportSectionY,
    exportUpsell.isLoading,
    flow.exportComplete,
    flow.exportProviderProgress.doorDash,
    flow.exportProviderProgress.uberEats,
    flow.exportRequested,
    navigation,
    flow.canImportFromGmail,
    flow.canImportFromOutlook,
    flow.gmailConnected,
    flow.hasConnectedEmail,
    flow.outlookConnected,
    flow.showOneTimeGmailImport,
    gmail.isChecking,
    importEmail,
    importOutlook,
    preferences.isLoading,
    route.action,
    screenMode,
    route.gmailPurpose,
    route.intentId,
    route.provider,
    setupOngoingUpdates,
  ]);

  const uploadSucceeded = useCallback(
    async (operation: ImportOperation) => {
      setActiveTaskId("uber_export");
      if (userId) suppressAdsForSession(userId);
      navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo } });
    },
    [navigation, returnTo, pendingTrackingSetup, userId],
  );

  const gmailButtonLabel =
    gmail.primaryFlowState === "connecting"
      ? "Connecting Gmail…"
      : gmail.primaryFlowState === "preparing_import" ||
          gmail.primaryFlowState === "importing"
        ? "Importing receipts…"
        : flow.gmailImportPresentation.idleButtonLabel;
  const outlookButtonLabel = outlook.isImporting
    ? "Importing Outlook receipts…"
    : "Import from Outlook";

  const chooseSetupEmail = useCallback(
    (provider: "gmail" | "outlook") => {
      setSelectedSetupPath(provider);
      if (provider === "gmail") {
        if (!flow.gmailConnected || flow.gmailNeedsReconnect)
          void connectEmail("receipt_import");
        return;
      }
      if (!flow.outlookConnected || flow.outlookNeedsReconnect)
        void connectOutlook("receipt_import");
    },
    [
      connectEmail,
      connectOutlook,
      flow.gmailConnected,
      flow.gmailNeedsReconnect,
      flow.outlookConnected,
      flow.outlookNeedsReconnect,
    ],
  );

  const retryOAuthConnection = useCallback(() => {
    const provider = oauthReturn?.provider ?? route.mailbox;
    if (!provider) return;
    clearOAuthReturn();
    setSelectedSetupPath(provider);
    if (provider === 'gmail') void connectEmail('receipt_import');
    else void connectOutlook('receipt_import');
  }, [clearOAuthReturn, connectEmail, connectOutlook, oauthReturn?.provider, route.mailbox]);

  return {
    user: userState.user,
    scrollViewRef,
    gmailFeatureEnabled,
    flow,
    selectedSetupPath,
    oauthReturn,
    importPreferences: preferences.preferences,
    importPreferencesLoading: preferences.isLoading,
    importPreferencesError: preferences.queryError ? "Could not load import options" : null,
    refreshImportPreferences: preferences.refresh,
    busy,
    connectionBusy,
    activeTaskId,
    exportDownloadState,
    autoOpenExportPickerToken,
    gmailButtonLabel,
    outlookButtonLabel,
    ongoingUpdatesPresentation,
    showTutorial,
    showGmailModal,
    showGmailImportLoadingModal,
    gmailConnectPhase,
    primaryFlowState: gmail.primaryFlowState,
    activeImportOperation,
    activeImportUnavailable,
    refreshActiveImport,
    gmailConnectionStatus: gmail.connectionStatus,
    isGmailLoading: gmail.isLoading,
    isGmailChecking: gmail.isChecking,
    canCheckForNewOrders:
      flow.hasImportedEmailData &&
      flow.hasConnectedEmail &&
      flow.canImportFromGmail &&
      !flow.needsReconnect &&
      !flow.gmailTemporarilyUnavailable &&
      !busy,
    toggleTask,
    connectEmail: () => connectEmail(flow.gmailNeedsReconnect ? 'connection_recovery' : 'receipt_import'),
    connectOutlook: () => connectOutlook(flow.outlookNeedsReconnect ? 'connection_recovery' : 'receipt_import'),
    connectGmailForReadyAlerts: () => connectEmail('export_ready_alerts'),
    connectOutlookForReadyAlerts: () => connectOutlook('export_ready_alerts'),
    connectEmailForOngoingTracking: () => connectEmail('ongoing_tracking'),
    connectOutlookForOngoingTracking: () => connectOutlook('ongoing_tracking'),
    reconnectEmail: () => connectEmail('connection_recovery'),
    reconnectOutlook: () => connectOutlook('connection_recovery'),
    chooseSetupEmail,
    chooseEmailSetup: () => {
      void trackAdminEvent('setup_method_selected', { properties: { method: 'email_receipts' } }).catch(() => undefined);
      setSelectedSetupPath("email");
    },
    chooseAlternativeSetup: () => {
      void trackAdminEvent('setup_method_selected', { properties: { method: 'provider_history' } }).catch(() => undefined);
      setSelectedSetupPath("alternative");
    },
    changeSetupMethod: () => {
      clearOAuthReturn();
      setSelectedSetupPath('choose_method');
    },
    retryOAuthConnection,
    importEmail: (mode?: GmailImportMode, automaticUpdates = false) => {
      void importEmail(mode, automaticUpdates);
    },
    importOutlook: (mode?: GmailImportMode, automaticUpdates = false) => {
      void importOutlook(mode, automaticUpdates);
    },
    checkForNewOrders,
    setupOngoingUpdates,
    readyAlertsBusy: preferences.isUpdating,
    enableReadyAlerts: (onEnabled?: () => void) => {
      if (preferences.isUpdating) return;
      if (!preferences.preferences?.monitoring.capability.canMonitor) {
        showAlert(
          'Connect an inbox for ready-message alerts',
          'Connect or reconnect the inbox that receives your Uber emails, then return here to turn on the alert. Your request is saved.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Manage inboxes', onPress: () => navigation.open(appDestinations.accountsPermissions) },
          ],
        );
        return;
      }
      showAlert(
        'Notify me when it’s ready?',
        'Allow SnackTrack to check your connected inbox for Uber’s data-ready email while the app is active. This does not turn on automatic order updates or download your file.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Turn on notifications', onPress: () => {
            void preferences.setMonitoringConsent('granted')
              .then(() => onEnabled?.())
              .catch(() => {
                showSimpleAlert('Couldn’t turn on alerts', 'Please try again. You can still watch for Uber’s email yourself.');
              });
          } },
        ],
      );
    },
    openGmailSettings: () => setShowGmailModal(true),
    closeGmailSettings: () => setShowGmailModal(false),
    tutorialPlatform,
    tutorialEntryJob,
    tutorialMode: handoff.tutorialMode,
    closeTutorial,
    openTutorial: () => navigation.open({ pathname: '/data-setup', params: { sourcePicker: 'true' } }),
    openProviderTutorial: openTutorial,
    completeTutorial,
    requestNotSubmitted: handoff.requestNotSubmitted,
    requestSaving,
    openProviderRequestPage,
    emailUpdates: emailUpdatesPresentation(preferences.preferences),
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    tutorialReadyConfirmed,
    reportDownloaded: (provider?: ExportProvider, openPicker = true) => {
      void reportDownloaded(provider, openPicker).catch(() => undefined);
    },
    openExportEmail: () => {
      void openExportEmail().catch(() => undefined);
    },
    autoOpenConsumed,
    uploadSucceeded,
    uploadFailed: async (_message: string) => {
      await preferences.refresh();
    },
    recordExportLayout: (event: LayoutChangeEvent) =>
      setExportSectionY(event.nativeEvent.layout.y),
    disconnectGmail: gmail.disconnectGmail,
    disconnectOutlook: outlook.disconnectOutlook,
    goHome: () => {
      navigation.replace(appDestinations.home);
    },
    tryAnotherEmail: () => {
      setSelectedSetupPath(null);
      setActiveTaskId("connect_email");
    },
  };
}
