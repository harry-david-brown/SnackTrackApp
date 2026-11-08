import { suppressAdsForSession } from '@features/ads/adSession';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, type LayoutChangeEvent, type ScrollView } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { appDestinations, useAppNavigation } from "@features/navigation";
import { featureFlags } from "@config/featureFlags";
import { useUser } from "@contexts/UserContext";
import type { ImportTaskId } from "@components/upload/ImportTaskCard";
import type { GmailConnectPhase } from "@components/gmail/GmailImportLoadingModal";
import type {
  ExportProvider,
  ImportOperation,
  ImportPreferencesResponse,
} from "@features/import-flow/contracts";
import { useGmailImport } from "./useGmailImport";
import { useOutlookImport } from "./useOutlookImport";
import { useExportUpsell } from "./useExportUpsell";
import { useImportPreferences } from "./useImportPreferences";
import { useImportOperation } from "./useImportOperation";
import type { ImportRouteParams } from "@features/import-flow/importRouteParams";
import { resolveImportFlowState } from "@features/import-flow/importFlowResolver";
import type { GmailConnectionPurpose } from "@features/import-flow/gmailConnectionPurpose";
import {
  toDataPlatform,
} from "@features/import-flow/importJourneyState";
import { showAlert, showSimpleAlert } from "@utils/platformAlert";
import {
  type ExportDownloadHandoffState,
  getExportDownloadHandoffState,
  openUberExportEmail,
  setExportDownloadHandoffState,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT,
} from "@utils/exportDownloadHandoff";
import type { DataPlatform } from "@components/upload/UberDataTutorial";
import {
  resolveProviderTutorialEntry,
  type ProviderTutorialJob,
} from "@features/import-flow/providerTutorialEntry";
import {
  resolveOngoingUpdatesPresentation,
  resolveTrackingRecovery,
} from "@features/import-flow/trackingEligibility";
import type { ImportSetupPath , MailboxOAuthReturnState } from "@features/import-flow/initialImportJourney";
import { trackAdminEvent } from "@services/adminAnalytics";

import { emailUpdatesPresentation } from '@features/import-flow/emailImportPresentation';
import { parseImportReturnTo } from '@features/import-flow/importNavigation';
import { setPendingExportRequest, clearPendingExportRequest } from '@utils/exportDownloadHandoff';
import { waitForMailboxOAuthReadiness } from '@features/import-flow/mailboxOAuthReadiness';

type GmailImportMode = "initial" | "manual_check";

export function useImportFlowController(route: ImportRouteParams, screenMode: 'auto' | 'setup' | 'manage' = 'auto') {
  const navigation = useAppNavigation();
  const isFocused = useIsFocused();
  const focused = useRef(isFocused);
  focused.current = isFocused;
  const { state: userState } = useUser();
  const userId = userState.user?.id;
  const returnTo = parseImportReturnTo(route.returnTo);
  const [requestSaving, setRequestSaving] = useState(false);
  const requestSaveInFlight = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const connectSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRequest = useRef(0);
  const handledFocusKey = useRef<string | null>(null);
  const handledActionIntent = useRef<string | null>(null);
  const initialTaskApplied = useRef(false);
  const gmailImportMode = useRef<GmailImportMode>("initial");
  const [showTutorial, setShowTutorial] = useState(route.showExportTutorial);
  const [tutorialPlatform, setTutorialPlatform] = useState<
    DataPlatform | undefined
  >(route.provider ? toDataPlatform(route.provider) : undefined);
  const [tutorialEntryJob, setTutorialEntryJob] = useState<
    ProviderTutorialJob | undefined
  >();
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] =
    useState<GmailConnectPhase>("idle");
  const [exportDownloadState, setExportDownloadState] =
    useState<ExportDownloadHandoffState>("not_downloaded");
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<
    string | null
  >(null);
  const [selectedSetupPath, setSelectedSetupPath] =
    useState<ImportSetupPath>(route.sourcePicker ? "alternative" : route.mailbox ?? null);
  const [oauthReturn, setOAuthReturn] = useState<MailboxOAuthReturnState | null>(() => {
    if (!route.mailbox) return null;
    if (route.connectionSucceeded) return { provider: route.mailbox, status: 'confirming' };
    if (route.connectionFailed) return { provider: route.mailbox, status: 'failed' };
    return null;
  });
  const oauthReturnAttempt = useRef(0);
  const [pendingTrackingSetup, setPendingTrackingSetup] = useState(false);
  const gmailFeatureEnabled = featureFlags.showGmailImport;
  const preferences = useImportPreferences(Boolean(userId));
  const markExportRequested = preferences.markExportRequested;
  const { refresh: refreshPreferences } = preferences;
  const { operation: activeImportOperation, isUnavailable: activeImportUnavailable, refresh: refreshActiveImport } = useImportOperation(Boolean(userId));
  const gmail = useGmailImport({
    journeyContext: route.journeyContext ?? (screenMode === 'setup' ? 'onboarding' : 'post_onboarding'),
    returnTo,
    connectionStatus: preferences.preferences?.gmailConnection,
    connectionStatusLoading: preferences.isLoading,
  });
  const refreshGmailConnectionStatus = gmail.refreshConnectionStatus;
  const outlook = useOutlookImport({
    journeyContext: route.journeyContext ?? (screenMode === 'setup' ? 'onboarding' : 'post_onboarding'),
    returnTo,
    connectionStatus: preferences.preferences?.outlookConnection,
  });
  const exportUpsell = useExportUpsell(userId);
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

  useEffect(() => {
    const provider = route.mailbox;
    if (screenMode !== 'setup' || !provider) return;
    if (route.connectionFailed) {
      setOAuthReturn({ provider, status: 'failed' });
      return;
    }
    if (!route.connectionSucceeded) return;

    let cancelled = false;
    const attempt = ++oauthReturnAttempt.current;
    setSelectedSetupPath(provider);
    setOAuthReturn({ provider, status: 'confirming' });

    const connectionFor = (next: ImportPreferencesResponse) => provider === 'gmail'
      ? next.gmailConnection
      : next.outlookConnection;
    const isReady = (next: ImportPreferencesResponse) => {
      const connection = connectionFor(next);
      return connection.connected
        && connection.canImport !== false
        && connection.connectionHealth !== 'reconnect_required'
        && connection.connectionHealth !== 'unavailable';
    };

    void waitForMailboxOAuthReadiness(preferences.refresh, {
      isReady,
      isTerminal: (next) => connectionFor(next).connectionHealth === 'reconnect_required',
    }).then((next) => {
      if (cancelled || attempt !== oauthReturnAttempt.current) return;
      if (next && isReady(next)) {
        setOAuthReturn(null);
        navigation.setParams({ gmail: undefined, outlook: undefined, error: undefined });
        return;
      }
      setOAuthReturn({ provider, status: 'failed' });
    });

    return () => {
      cancelled = true;
    };
  }, [navigation, preferences.refresh, route.connectionFailed, route.connectionSucceeded, route.mailbox, screenMode]);

  const handoffProvider: ExportProvider =
    route.provider ??
    (tutorialPlatform === "doordash"
      ? "doordash"
      : tutorialPlatform === "uber"
        ? "uber_eats"
        : flow.exportReadyProvider) ??
    "uber_eats";
  const providerPreference =
    handoffProvider === "uber_eats"
      ? preferences.preferences?.export.providers.uberEats
      : preferences.preferences?.export.providers.doorDash;
  const exportReadyVersion = providerPreference?.updatedAt ?? "ready";

  useEffect(() => {
    if (route.sourcePicker) setSelectedSetupPath("alternative");
  }, [route.sourcePicker]);


  const connectionBusy = gmail.primaryFlowState !== "idle"
    || gmail.isChecking
    || outlook.isLoading
    || outlook.isImporting
    || preferences.isUpdating;
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
      if (connectSuccessTimer.current)
        clearTimeout(connectSuccessTimer.current);
      if (tutorialTimer.current) clearTimeout(tutorialTimer.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!userId || !flow.exportFileReady) {
      setExportDownloadState("not_downloaded");
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
    if (
      flow.exportFileReady &&
      route.downloadedVersion === exportReadyVersion
    ) {
      setExportDownloadState("downloaded");
      setAutoOpenExportPickerToken(route.downloadedVersion);
    }
  }, [exportReadyVersion, flow.exportFileReady, route.downloadedVersion]);

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
    if (route.provider) {
      setTutorialPlatform(toDataPlatform(route.provider));
      const providerProgress =
        route.provider === "uber_eats"
          ? flow.exportProviderProgress.uberEats
          : flow.exportProviderProgress.doorDash;
      setTutorialEntryJob(
        resolveProviderTutorialEntry(providerProgress.status).job,
      );
    }
    requestAnimationFrame(() =>
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, exportSectionY - 16),
        animated: true,
      }),
    );
    if (route.showExportTutorial) {
      tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
    }
  }, [
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

  const connectEmail = useCallback(
    async (purpose: GmailConnectionPurpose = "receipt_import") => {
      if (connectionBusy) return false;
      if (connectSuccessTimer.current)
        clearTimeout(connectSuccessTimer.current);
      setGmailConnectPhase("connecting");
      const connectionResult = await gmail.connectGmail(purpose);
      if (!connectionResult) {
        setActiveTaskId(
          purpose === "export_ready_alerts"
            ? "uber_export"
            : purpose === "connection_recovery"
              ? "gmail_import"
              : "connect_email",
        );
        setGmailConnectPhase("idle");
        return false;
      }
      const refreshedPreferences = await preferences.refresh();
      if (connectionResult.purpose === "receipt_import") {
        setActiveTaskId("gmail_import");
      } else if (connectionResult.purpose === "export_ready_alerts") {
        setActiveTaskId("uber_export");

      } else if (connectionResult.purpose === "ongoing_tracking") {
        const recovery = resolveTrackingRecovery(refreshedPreferences);
        if (recovery.kind === "eligible") {
          setActiveTaskId(null);
          navigation.replace({ pathname: '/ongoing-updates', params: { manage: 'true' } });
        } else {
          setPendingTrackingSetup(true);
          setActiveTaskId("gmail_import");
          showSimpleAlert(
            "Gmail is ready",
            "Check your email history once to establish a starting point. SnackTrack will ask separately before enabling ongoing updates.",
          );
        }
      } else {
        setActiveTaskId("gmail_import");
        showSimpleAlert(
          "Gmail reconnected",
          "Your Gmail connection is ready. You can continue where you left off.",
        );
      }
      setGmailConnectPhase("connected");
      connectSuccessTimer.current = setTimeout(() => {
        setGmailConnectPhase("idle");
        connectSuccessTimer.current = null;
      }, 2200);
      return true;
    },
    [connectionBusy, gmail, preferences, navigation],
  );

  const connectOutlook = useCallback(
    async (purpose: GmailConnectionPurpose = "receipt_import") => {
      if (connectionBusy) return false;
      const result = await outlook.connectOutlook(purpose);
      if (!result) {
        setActiveTaskId("connect_email");
        return false;
      }
      const refreshedPreferences = await preferences.refresh();
      setActiveTaskId(purpose === "export_ready_alerts" ? "uber_export" : "gmail_import");
      if (purpose === "ongoing_tracking") {
        const recovery = resolveTrackingRecovery(refreshedPreferences);
        if (recovery.kind === "eligible") {
          setActiveTaskId(null);
          navigation.replace({ pathname: '/ongoing-updates', params: { manage: 'true' } });
        } else {
          showSimpleAlert(
            "Outlook is ready",
            "Check your email history once. SnackTrack will ask separately before enabling ongoing updates.",
          );
          setPendingTrackingSetup(true);
        }
      }
      return true;
    },
    [connectionBusy, outlook, preferences, navigation],
  );

  const importEmail = useCallback(
    async (mode?: GmailImportMode, automaticUpdates = false) => {
      if (busy || !flow.gmailConnected || !flow.canImportFromGmail) return;
      gmailImportMode.current =
        mode ?? (flow.hasImportedEmailData ? "manual_check" : "initial");
      try {
        const operation = await gmail.importReceipts(undefined, automaticUpdates);
        if (operation && mode !== 'manual_check') {
          if (userId) suppressAdsForSession(userId);
          navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo } });
        }
      } finally {
        gmailImportMode.current = "initial";
      }
    },
    [
      busy,
      flow.canImportFromGmail,
      flow.gmailConnected,
      flow.hasImportedEmailData,
      gmail,
      navigation,
      returnTo,
      pendingTrackingSetup,
      userId,
    ],
  );

  const importOutlook = useCallback(
    async (mode?: GmailImportMode, automaticUpdates = false) => {
      if (busy || !flow.outlookConnected || !flow.canImportFromOutlook) return;
      gmailImportMode.current = mode ?? (flow.hasImportedEmailData ? "manual_check" : "initial");
      try {
        const operation = await outlook.importReceipts(automaticUpdates);
        if (operation && mode !== 'manual_check') {
          if (userId) suppressAdsForSession(userId);
          navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo } });
        }
      } finally {
        gmailImportMode.current = "initial";
      }
    }, [
      busy,
      flow.canImportFromOutlook,
      flow.hasImportedEmailData,
      flow.outlookConnected,
      navigation,
      outlook,
      returnTo,
      pendingTrackingSetup,
      userId,
    ],
  );

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
      if (route.provider) {
        setTutorialPlatform(toDataPlatform(route.provider));
        const providerProgress =
          route.provider === "uber_eats"
            ? flow.exportProviderProgress.uberEats
            : flow.exportProviderProgress.doorDash;
        setTutorialEntryJob(
          resolveProviderTutorialEntry(providerProgress.status).job,
        );
      }
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
        tutorialTimer.current = setTimeout(() => setShowTutorial(true), 300);
      }
    }

    navigation.setParams({
      action: undefined,
      intentId: undefined,
      provider: undefined,
      gmailPurpose: undefined,
    });
  }, [
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

  const openProviderRequestPage = useCallback(async (platform: DataPlatform) => {
    const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
    if (!userId) throw new Error('Sign in before requesting your history.');
    await setPendingExportRequest(userId, provider, returnTo);
    try {
      await Linking.openURL(provider === 'uber_eats' ? 'https://myprivacy.uber.com/privacy/exploreyourdata/download' : 'https://www.doordash.com/consumer/privacy/manage_account');
    } catch (error) {
      await clearPendingExportRequest(userId, provider);
      throw error;
    }
  }, [returnTo, userId]);

  const completeTutorial = useCallback(async (platform: DataPlatform): Promise<boolean> => {
    if (requestSaveInFlight.current) return false;
    requestSaveInFlight.current = true;
    setRequestSaving(true);
    const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
    try {
      await markExportRequested(provider);
    } catch {
      showSimpleAlert('Could not save your request', 'Your request may still be with the delivery service. Try saving your progress again here.');
      return false;
    } finally {
      requestSaveInFlight.current = false;
      setRequestSaving(false);
    }
    // The server response above is authoritative, even if local cleanup fails.
    if (userId) void clearPendingExportRequest(userId, provider).catch(() => undefined);
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
    void trackAdminEvent('setup_completed', { properties: { method: 'provider_history_request' } }).catch(() => undefined);
    if (screenMode === 'setup') navigation.replace({ pathname: '/add-history', params: { intent: 'resume_export', provider, returnTo, journeyContext: 'onboarding' } });
    return true;
  }, [markExportRequested, navigation, returnTo, screenMode, userId]);

  const tutorialStillWaiting = completeTutorial;

  const reportDownloaded = useCallback(
    async (provider: ExportProvider = handoffProvider, openPicker = true) => {
      if (!userId) return;
      const providerState =
        provider === "uber_eats"
          ? preferences.preferences?.export.providers.uberEats
          : preferences.preferences?.export.providers.doorDash;
      const readyVersion = providerState?.updatedAt ?? exportReadyVersion;
      await setExportDownloadHandoffState(
        userId,
        provider,
        readyVersion,
        "downloaded",
      );
      setExportDownloadState("downloaded");
      if (openPicker) {
        pickerRequest.current += 1;
        setAutoOpenExportPickerToken(
          `${readyVersion}:local:${pickerRequest.current}`,
        );
      }
    },
    [
      exportReadyVersion,
      handoffProvider,
      preferences.preferences?.export.providers,
      userId,
    ],
  );

  const tutorialArchiveDownloaded = useCallback(
    (platform: DataPlatform) => {
      setShowTutorial(false);
      setTutorialPlatform(undefined);
      setTutorialEntryJob(undefined);
      const provider = platform === 'uber' ? 'uber_eats' : 'doordash';
      void reportDownloaded(provider, false);
      navigation.replace({ pathname: '/add-history', params: { intent: 'provider', provider, downloadedVersion: 'saved', returnTo, journeyContext: route.journeyContext ?? (screenMode === 'setup' ? 'onboarding' : 'post_onboarding') } });
    },
    [navigation, reportDownloaded, returnTo, route.journeyContext, screenMode],
  );

  const tutorialReadyConfirmed = useCallback(
    (platform: DataPlatform) => {
      const provider: ExportProvider =
        platform === "uber" ? "uber_eats" : "doordash";
      setTutorialEntryJob("download");
      void preferences.confirmExportReady(provider).catch(() => {
        showSimpleAlert(
          "Status not saved",
          "You can continue downloading the archive, but SnackTrack could not save that it is ready.",
        );
      });
    },
    [preferences],
  );

  const openExportEmail = useCallback(async () => {
    if (!userId || !flow.exportFileReady) return;
    if (handoffProvider !== "uber_eats") {
      showSimpleAlert(
        "Find the DoorDash ready message",
        "Look for the email or notification containing “View Your Data Archive,” download the ZIP, then return to SnackTrack.",
      );
      return;
    }
    if (!flow.gmailConnected) {
      showSimpleAlert(
        "Find Uber’s ready message",
        `Look for “${UBER_EXPORT_EMAIL_SUBJECT}” in the email address or phone number registered with Uber. Open the download page, save the ZIP, then return to SnackTrack.`,
      );
      return;
    }
    setExportDownloadState("checking_email");
    await setExportDownloadHandoffState(
      userId,
      handoffProvider,
      exportReadyVersion,
      "checking_email",
    );
    try {
      await openUberExportEmail();
    } catch {
      setExportDownloadState("not_downloaded");
      await setExportDownloadHandoffState(
        userId,
        handoffProvider,
        exportReadyVersion,
        "not_downloaded",
      );
      showAlert(
        "Could not open your email",
        `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`,
        [{ text: "OK" }],
      );
    }
  }, [exportReadyVersion, flow.exportFileReady, flow.gmailConnected, handoffProvider, userId]);

  const uploadSucceeded = useCallback(
    async (operation: ImportOperation) => {
      setActiveTaskId("uber_export");
      if (userId) suppressAdsForSession(userId);
      navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: pendingTrackingSetup ? 'ongoing_updates' : returnTo } });
    },
    [navigation, returnTo, pendingTrackingSetup, userId],
  );

  const openTutorial = useCallback(
    (platform?: DataPlatform, entryJobOverride?: ProviderTutorialJob) => {
      setTutorialPlatform(platform);
      if (platform) {
        const providerProgress =
          platform === "uber"
            ? flow.exportProviderProgress.uberEats
            : flow.exportProviderProgress.doorDash;
        setTutorialEntryJob(
          entryJobOverride ?? resolveProviderTutorialEntry(providerProgress.status).job,
        );
      } else {
        setTutorialEntryJob(undefined);
      }
      setShowTutorial(true);
    },
    [
      flow.exportProviderProgress.doorDash,
      flow.exportProviderProgress.uberEats,
    ],
  );

  const closeTutorial = useCallback(() => {
    if (screenMode === 'setup' && route.showExportTutorial) {
      navigation.backOr(appDestinations.dataSetup);
      return;
    }
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
  }, [navigation, route.showExportTutorial, screenMode]);

  const autoOpenConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (route.downloadedVersion)
      navigation.setParams({ downloadedVersion: undefined });
  }, [navigation, route.downloadedVersion]);

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

  const clearOAuthReturn = useCallback(() => {
    oauthReturnAttempt.current += 1;
    setOAuthReturn(null);
    navigation.setParams({ gmail: undefined, outlook: undefined, error: undefined });
  }, [navigation]);

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
    tutorialMode:
      tutorialEntryJob === "download" ||
      tutorialEntryJob === "retry" ||
      tutorialEntryJob === "processing"
        ? ("download" as const)
        : ("request" as const),
    closeTutorial,
    openTutorial: () => navigation.open({ pathname: '/data-setup', params: { sourcePicker: 'true' } }),
    openProviderTutorial: openTutorial,
    completeTutorial,
    requestNotSubmitted: (platform: DataPlatform) => {
      if (userId) void clearPendingExportRequest(userId, platform === 'uber' ? 'uber_eats' : 'doordash').catch(() => undefined);
    },
    requestSaving,
    openProviderRequestPage,
    emailUpdates: emailUpdatesPresentation(preferences.preferences),
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    tutorialReadyConfirmed,
    reportDownloaded: (provider?: ExportProvider, openPicker = true) => {
      void reportDownloaded(provider, openPicker);
    },
    openExportEmail: () => {
      void openExportEmail();
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
