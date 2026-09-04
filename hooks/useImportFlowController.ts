import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, type ScrollView } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { featureFlags } from "@config/featureFlags";
import { useUser } from "@contexts/UserContext";
import type { ImportTaskId } from "@components/upload/ImportTaskCard";
import type { GmailConnectPhase } from "@components/gmail/GmailImportLoadingModal";
import type {
  ExportProvider,
  ImportOperation,
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
  resolveImportSetupRecommendation,
  toDataPlatform,
  type ImportSetupRecommendation,
} from "@features/import-flow/importJourneyState";
import { showAlert, showSimpleAlert } from "@utils/platformAlert";
import {
  type ExportDownloadHandoffState,
  getExportDownloadHandoffState,
  openUberExportEmail,
  setExportDownloadHandoffState,
  UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT,
} from "@utils/exportDownloadHandoff";
import type { DataPlatform } from "@components/upload/UberDataTutorial";
import { resolveGmailImportResult } from "@features/import-flow/gmailImportResult";
import {
  resolveProviderTutorialEntry,
  type ProviderTutorialJob,
} from "@features/import-flow/providerTutorialEntry";
import {
  resolveOngoingUpdatesPresentation,
  resolveTrackingRecovery,
} from "@features/import-flow/trackingEligibility";
import type { ImportSetupPath } from "@features/import-flow/initialImportJourney";
import type {
  ImportCompletionNextAction,
  ImportCompletionSummary,
} from "@features/import-flow/importCompletion";
import { experienceApi } from "@services/experienceApi";
import { suppressAdsForSession } from "@features/ads/adSession";
import { resolvePostImportDestination } from "@features/import-flow/postImportNavigation";
import { trackAdminEvent } from "@services/adminAnalytics";

type GmailImportMode = "initial" | "manual_check";

const completionActionForRecommendation = (
  recommendation: ImportSetupRecommendation,
): ImportCompletionNextAction => {
  if (recommendation.kind === "provider") {
    return {
      kind: "provider",
      provider: toDataPlatform(recommendation.provider.provider),
      label: "Import missing orders",
    };
  }
  if (
    recommendation.kind === "enable_tracking"
    || recommendation.kind === "connect_email"
    || recommendation.kind === "scan_email"
    || recommendation.kind === "email_optional"
  ) {
    return { kind: "tracking", label: "Set up optional updates" };
  }
  return { kind: "done", label: "Done for now" };
};

export function useImportFlowController(route: ImportRouteParams, screenMode: 'auto' | 'setup' | 'manage' = 'auto') {
  const { state: userState } = useUser();
  const userId = userState.user?.id;
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
  const handledCompletedOperation = useRef<string | null>(null);
  const manualOperationIds = useRef(new Set<string>());
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialPlatform, setTutorialPlatform] = useState<
    DataPlatform | undefined
  >();
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
  const [pendingTrackingSetup, setPendingTrackingSetup] = useState(false);
  const [selectedSetupPath, setSelectedSetupPath] =
    useState<ImportSetupPath>(null);
  const [completionSummary, setCompletionSummary] =
    useState<ImportCompletionSummary | null>(null);
  const [dismissedDelayedOperationId, setDismissedDelayedOperationId] = useState<string | null>(null);
  const gmailFeatureEnabled = featureFlags.showGmailImport;
  const preferences = useImportPreferences(Boolean(userId));
  const { operation: activeImportOperation } = useImportOperation(Boolean(userId));
  const finishInitialImport = useCallback(async (
    sourceName: string,
    orderCount: number,
    title: string,
    message: string,
    nextPreferences: typeof preferences.preferences,
  ) => {
    if (userId) suppressAdsForSession(userId);
    const state = await experienceApi.getState().catch(() => null);
    if (state?.setup.state === 'complete') {
      void trackAdminEvent('setup_completed', { properties: { method: sourceName === 'Gmail' || sourceName === 'Outlook' ? 'email_receipts' : 'provider_archive' } }).catch(() => undefined);
    }
    if (state && state.receiptCount >= state.firstRecap.minimumOrderCount) {
      void trackAdminEvent('useful_history_reached').catch(() => undefined);
    }
    if (state && resolvePostImportDestination({ experience: state }) === 'automatic_recap') {
      router.replace({ pathname: "/(tabs)/wrapped-journey", params: { auto: "true", entryPoint: "automatic_first_import" } });
      return;
    }
    const recommendation = resolveImportSetupRecommendation({
      preferences: nextPreferences,
      gmailFeatureEnabled,
      gmailConnected: true,
      gmailNeedsReconnect: false,
    });
    const emptyHistory = orderCount === 0 && !nextPreferences?.coverage.hasEmailData && !nextPreferences?.coverage.hasExportData;
    setCompletionSummary({
      sourceName,
      orderCount,
      title,
      message,
      nextAction: emptyHistory
        ? { kind: 'provider', provider: 'uber', label: 'Import delivery history' }
        : completionActionForRecommendation(recommendation),
      emptyHistory,
    });
  }, [gmailFeatureEnabled, userId]);

  const gmail = useGmailImport({
    connectionStatus: preferences.preferences?.gmailConnection,
    connectionStatusLoading: preferences.isLoading,
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      const presentation = resolveGmailImportResult(result);
      const completedMode = gmailImportMode.current;
      void preferences.refresh().then((nextPreferences) => {
        if (pendingTrackingSetup) {
          setPendingTrackingSetup(false);
          setTimeout(
            () =>
              showAlert(
                presentation.title,
                `${presentation.message}\n\nWould you like SnackTrack to periodically check for future delivery receipts?`,
                [
                  {
                    text: "Not Now",
                    style: "cancel",
                    onPress: () => {
                      void preferences.setOngoingTrackingConsent("declined");
                    },
                  },
                  {
                    text: "Allow Ongoing Updates",
                    onPress: () => {
                      void preferences
                        .setOngoingTrackingConsent("granted")
                        .then(() =>
                          showSimpleAlert(
                            "Setting up ongoing updates",
                            "SnackTrack is catching up from your existing history. Your downloaded history remains safe.",
                          ),
                        )
                        .catch(() =>
                          showSimpleAlert(
                            "Could not enable updates",
                            "Your email check completed, but the tracking choice could not be saved. Try again from Profile.",
                          ),
                        );
                    },
                  },
                ],
              ),
            0,
          );
          return;
        }

        if (completedMode === "manual_check") {
          const manualPresentation = resolveGmailImportResult({
            ...result,
            errors: [],
          });
          setTimeout(
            () =>
              showSimpleAlert(
                manualPresentation.title,
                manualPresentation.message,
              ),
            0,
          );
          return;
        }

        void finishInitialImport("Gmail", result.newOrders + result.updatedOrders, presentation.title, presentation.message, nextPreferences);
      });
    },
  });
  const refreshGmailConnectionStatus = gmail.refreshConnectionStatus;
  const outlook = useOutlookImport({
    connectionStatus: preferences.preferences?.outlookConnection,
    onImportSuccess: (result) => {
      const presentation = resolveGmailImportResult(result);
      void preferences.refresh().then((nextPreferences) => {
        if (pendingTrackingSetup) {
          setPendingTrackingSetup(false);
          setTimeout(() => showAlert(
            presentation.title,
            `${presentation.message}\n\nWould you like SnackTrack to periodically check for future delivery receipts?`,
            [
              { text: "Not Now", style: "cancel", onPress: () => { void preferences.setOngoingTrackingConsent("declined"); } },
              { text: "Allow Ongoing Updates", onPress: () => { void preferences.setOngoingTrackingConsent("granted"); } },
            ],
          ), 0);
          return;
        }
        if (gmailImportMode.current === "manual_check") {
          setTimeout(() => showSimpleAlert(presentation.title, presentation.message), 0);
          return;
        }
        void finishInitialImport("Outlook", result.newOrders + result.updatedOrders, presentation.title, presentation.message, nextPreferences);
      });
    },
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
    if (!activeImportOperation || activeImportOperation.status !== "succeeded"
      || !["gmail_historical", "outlook_historical", "export_file"].includes(activeImportOperation.kind)
      || handledCompletedOperation.current === activeImportOperation.id) return;
    handledCompletedOperation.current = activeImportOperation.id;
    const sourceName = activeImportOperation.kind === "gmail_historical"
      ? "Gmail"
      : activeImportOperation.kind === "outlook_historical"
        ? "Outlook"
        : activeImportOperation.provider === "doordash" ? "DoorDash" : "Uber Eats";
    const result = activeImportOperation.result ?? {};
    const orderCount = activeImportOperation.kind === "export_file"
      ? Number(result.importedCount ?? result.newOrders ?? 0)
      : Number(result.newOrders ?? 0) + Number(result.updatedOrders ?? 0);
    void preferences.refresh().then((nextPreferences) => {
      if (pendingTrackingSetup) {
        setPendingTrackingSetup(false);
        showAlert(
          `${sourceName} import complete`,
          `${orderCount > 0 ? `${orderCount} orders were added or updated. ` : ""}Would you like SnackTrack to periodically check for future delivery receipts?`,
          [
            { text: "Not Now", style: "cancel", onPress: () => { void preferences.setOngoingTrackingConsent("declined"); } },
            { text: "Allow Ongoing Updates", onPress: () => { void preferences.setOngoingTrackingConsent("granted"); } },
          ],
        );
        return;
      }
      if (manualOperationIds.current.has(activeImportOperation.id)) {
        manualOperationIds.current.delete(activeImportOperation.id);
        showSimpleAlert(`${sourceName} check complete`, orderCount > 0 ? `${orderCount} orders were added or updated.` : "No new supported receipts were found.");
        return;
      }
      void finishInitialImport(sourceName, orderCount, `${sourceName} import complete`, orderCount > 0 ? `${orderCount} orders were added or updated.` : "No new supported receipts were found.", nextPreferences);
    });
  }, [activeImportOperation, finishInitialImport, pendingTrackingSetup, preferences]);

  const busy = gmail.primaryFlowState !== "idle"
    || gmail.isChecking
    || outlook.isLoading
    || outlook.isImporting
    || Boolean(activeImportOperation && ["awaiting_upload", "pending_dispatch", "queued", "running", "retrying"].includes(activeImportOperation.status))
    || preferences.isUpdating;
  const showGmailImportLoadingModal = gmailConnectPhase !== "idle";
  const ongoingUpdatesPresentation = resolveOngoingUpdatesPresentation(
    preferences.preferences,
    flow.hasImportedEmailData || flow.hasAnyExportData,
  );

  useFocusEffect(
    useCallback(() => {
      void preferences.refresh();
    }, [preferences]),
  );

  useEffect(() => {
    initialTaskApplied.current = false;
    handledFocusKey.current = null;
    handledActionIntent.current = null;
    handledCompletedOperation.current = null;
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
      if (busy) return;
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
        return;
      }
      const refreshedPreferences = await preferences.refresh();
      if (connectionResult.purpose === "receipt_import") {
        setActiveTaskId("gmail_import");
      } else if (connectionResult.purpose === "export_ready_alerts") {
        setActiveTaskId("uber_export");
        showSimpleAlert(
          "Export alerts are ready",
          "Gmail is connected. SnackTrack can now check for Uber’s data-ready email while the app is active.",
        );
      } else if (connectionResult.purpose === "ongoing_tracking") {
        const recovery = resolveTrackingRecovery(refreshedPreferences);
        if (recovery.kind === "eligible") {
          setActiveTaskId(null);
          showAlert(
            "Allow ongoing order tracking?",
            "SnackTrack will check your connected email for supported delivery receipts newer than your downloaded history and periodically check for future orders. You can turn this off at any time.",
            [
              {
                text: "Not Now",
                style: "cancel",
                onPress: () => {
                  void preferences.setOngoingTrackingConsent("declined");
                },
              },
              {
                text: "Allow Updates",
                onPress: () => {
                  void preferences
                    .setOngoingTrackingConsent("granted")
                    .then(() =>
                      showSimpleAlert(
                        "Setting up ongoing updates",
                        "SnackTrack is catching up from the end of your imported history.",
                      ),
                    );
                },
              },
            ],
          );
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
    },
    [busy, gmail, preferences],
  );

  const connectOutlook = useCallback(
    async (purpose: GmailConnectionPurpose = "receipt_import") => {
      if (busy) return;
      const result = await outlook.connectOutlook(purpose);
      if (!result) {
        setActiveTaskId("connect_email");
        return;
      }
      await preferences.refresh();
      setActiveTaskId(purpose === "export_ready_alerts" ? "uber_export" : "gmail_import");
      if (purpose === "ongoing_tracking") {
        showSimpleAlert(
          "Outlook is ready",
          "Check your email history once. SnackTrack will ask separately before enabling ongoing updates.",
        );
        setPendingTrackingSetup(true);
      }
    },
    [busy, outlook, preferences],
  );

  const importEmail = useCallback(
    async (mode?: GmailImportMode) => {
      if (busy || !flow.gmailConnected || !flow.canImportFromGmail) return;
      gmailImportMode.current =
        mode ?? (flow.hasImportedEmailData ? "manual_check" : "initial");
      try {
        const operation = await gmail.importReceipts();
        if (operation && mode === 'manual_check') manualOperationIds.current.add(operation.id);
        if (operation && mode !== 'manual_check') {
          if (userId) suppressAdsForSession(userId);
          router.replace({ pathname: '/import-progress', params: { operationId: operation.id } });
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
      userId,
    ],
  );

  const importOutlook = useCallback(
    async (mode?: GmailImportMode) => {
      if (busy || !flow.outlookConnected || !flow.canImportFromOutlook) return;
      gmailImportMode.current = mode ?? (flow.hasImportedEmailData ? "manual_check" : "initial");
      try {
        const operation = await outlook.importReceipts();
        if (operation && mode === 'manual_check') manualOperationIds.current.add(operation.id);
        if (operation && mode !== 'manual_check') {
          if (userId) suppressAdsForSession(userId);
          router.replace({ pathname: '/import-progress', params: { operationId: operation.id } });
        }
      } finally {
        gmailImportMode.current = "initial";
      }
    }, [
      busy,
      flow.canImportFromOutlook,
      flow.hasImportedEmailData,
      flow.outlookConnected,
      outlook,
      userId,
    ],
  );

  const checkForNewOrders = useCallback(() => {
    setShowGmailModal(false);
    void importEmail("manual_check");
  }, [importEmail]);

  const setupOngoingUpdates = useCallback(() => {
    if (preferences.preferences?.ongoingTracking.effectiveState === "error") {
      void preferences
        .checkOngoingTracking()
        .then(() =>
          showSimpleAlert(
            "Email checked",
            "SnackTrack checked for newer delivery receipts.",
          ),
        )
        .catch(() =>
          showSimpleAlert(
            "Could not check email",
            "Your imported history is safe. Try again shortly.",
          ),
        );
      return;
    }
    const recovery = resolveTrackingRecovery(preferences.preferences);
    if (recovery.kind === "unavailable") {
      showSimpleAlert(
        "Email is temporarily unavailable",
        "Your connection and imported history are safe. Try again shortly.",
      );
      return;
    }
    if (recovery.kind === "reconnect") {
      if (flow.outlookNeedsReconnect && !flow.gmailNeedsReconnect) {
        void connectOutlook("ongoing_tracking");
      } else {
        void connectEmail("ongoing_tracking");
      }
      return;
    }
    if (recovery.kind === "baseline") {
      showAlert(
        "Check email before enabling updates?",
        "SnackTrack will run one check for newer orders and establish where future checks should begin. You will choose ongoing permission separately afterward.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Check Email",
            onPress: () => {
              setPendingTrackingSetup(true);
              if (flow.gmailConnected && flow.canImportFromGmail) void importEmail("initial");
              else if (flow.outlookConnected && flow.canImportFromOutlook) void importOutlook("initial");
              else void connectEmail("ongoing_tracking");
            },
          },
        ],
      );
      return;
    }
    showAlert(
      "Allow ongoing order tracking?",
      preferences.preferences?.ongoingTracking.baseline.source === "exports"
        ? "SnackTrack will check your connected email accounts for supported delivery receipts newer than your downloaded history and periodically check for future orders. You can turn this off at any time."
        : "SnackTrack will periodically read supported delivery receipt emails to update your stats. You can turn this off at any time.",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () => {
            void preferences.setOngoingTrackingConsent("declined");
          },
        },
        {
          text: "Allow Updates",
          onPress: () => {
            void preferences
              .setOngoingTrackingConsent("granted")
              .then(() =>
                showSimpleAlert(
                  "Setting up ongoing updates",
                  "SnackTrack is catching up from your existing history.",
                ),
              );
          },
        },
      ],
    );
  }, [
    connectEmail,
    connectOutlook,
    flow.canImportFromGmail,
    flow.canImportFromOutlook,
    flow.gmailConnected,
    flow.gmailNeedsReconnect,
    flow.outlookConnected,
    flow.outlookNeedsReconnect,
    importEmail,
    importOutlook,
    preferences,
  ]);

  useEffect(() => {
    if (
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

    router.setParams({
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
    route.gmailPurpose,
    route.intentId,
    route.provider,
    setupOngoingUpdates,
  ]);

  const saveExportRequest = useCallback(
    async (platform: DataPlatform, decision?: "granted" | "declined") => {
      try {
        if (decision) await preferences.setMonitoringConsent(decision);
        const provider: ExportProvider =
          platform === "uber" ? "uber_eats" : "doordash";
        await preferences.markExportRequested(provider);
        void trackAdminEvent('setup_completed', { properties: { method: 'provider_history_request' } }).catch(() => undefined);
        if (screenMode === 'setup') router.replace('/(tabs)');
      } catch {
        showSimpleAlert(
          "Could not save your request status",
          "Your tutorial is complete, but we could not save this status. Please try again from Import.",
        );
      }
    },
    [preferences, screenMode],
  );

  const completeTutorial = useCallback(
    (platform: DataPlatform) => {
      setShowTutorial(false);
      setTutorialPlatform(undefined);
      setTutorialEntryJob(undefined);
      if (
        platform === "doordash" ||
        preferences.preferences?.monitoring.consentState === "granted"
      ) {
        void saveExportRequest(platform);
        return;
      }
      if (!flow.hasConnectedEmail) {
        void saveExportRequest(platform);
        showSimpleAlert(
          "Your Uber request is saved",
          `Uber will send an email or text when the archive is ready. Return to SnackTrack when you receive “${UBER_EXPORT_EMAIL_SUBJECT}”.`,
        );
        return;
      }
      showAlert(
        "Notify you when it’s ready?",
        "Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => {
              void saveExportRequest(platform, "declined");
            },
          },
          {
            text: "Notify Me",
            onPress: () => {
              void saveExportRequest(platform, "granted");
            },
          },
        ],
      );
    },
    [flow.hasConnectedEmail, preferences.preferences?.monitoring.consentState, saveExportRequest],
  );

  const tutorialStillWaiting = useCallback(
    (platform: DataPlatform) => {
      setShowTutorial(false);
      setTutorialPlatform(undefined);
      setTutorialEntryJob(undefined);

      if (platform === "doordash") {
        void saveExportRequest(platform);
        showSimpleAlert(
          "Your DoorDash history request is on the way",
          "DoorDash typically prepares your archive within a few hours, though it can take longer. Keep an eye on your email for a message from DoorDash saying your data archive is ready. The email should include “View Your Data Archive.”",
        );
        return;
      }

      const message = `Uber typically prepares your archive within a few hours, though it can take longer. Keep an eye on your email for “${UBER_EXPORT_EMAIL_SUBJECT}” from ${UBER_EXPORT_EMAIL_ADDRESS}.`;
      if (preferences.preferences?.monitoring.consentState === "granted") {
        void saveExportRequest(platform);
        showSimpleAlert("Your Uber history request is on the way", message);
        return;
      }
      if (!flow.hasConnectedEmail) {
        void saveExportRequest(platform);
        showSimpleAlert(
          "Your Uber history request is on the way",
          `Uber may notify you by email or text. Return to SnackTrack when the archive is ready.`,
        );
        return;
      }

      showAlert(
        "Your Uber history request is on the way",
        `${message}\n\nSnackTrack can check only for that data-ready email and let you know when it arrives.`,
        [
          {
            text: "I’ll Check Myself",
            style: "cancel",
            onPress: () => {
              void saveExportRequest(platform, "declined");
            },
          },
          {
            text: "Notify Me",
            onPress: () => {
              void saveExportRequest(platform, "granted");
            },
          },
        ],
      );
    },
    [flow.hasConnectedEmail, preferences.preferences?.monitoring.consentState, saveExportRequest],
  );

  const reportDownloaded = useCallback(
    async (provider: ExportProvider = handoffProvider) => {
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
      pickerRequest.current += 1;
      setAutoOpenExportPickerToken(
        `${readyVersion}:local:${pickerRequest.current}`,
      );
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
      void reportDownloaded(platform === "uber" ? "uber_eats" : "doordash");
    },
    [reportDownloaded],
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
      router.replace({ pathname: '/import-progress', params: { operationId: operation.id } });
    },
    [userId],
  );

  const openTutorial = useCallback(
    (platform?: DataPlatform) => {
      setTutorialPlatform(platform);
      if (platform) {
        const providerProgress =
          platform === "uber"
            ? flow.exportProviderProgress.uberEats
            : flow.exportProviderProgress.doorDash;
        setTutorialEntryJob(
          resolveProviderTutorialEntry(providerProgress.status).job,
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
    setShowTutorial(false);
    setTutorialPlatform(undefined);
    setTutorialEntryJob(undefined);
  }, []);

  const continueAfterCompletion = useCallback(() => {
    const nextAction = completionSummary?.nextAction;
    setCompletionSummary(null);
    if (!nextAction || nextAction.kind === "done") return;
    if (nextAction.kind === "provider") {
      openTutorial(nextAction.provider);
      return;
    }
    if (!flow.hasConnectedEmail) {
      setActiveTaskId("connect_email");
      return;
    }
    setupOngoingUpdates();
  }, [completionSummary?.nextAction, flow.hasConnectedEmail, openTutorial, setupOngoingUpdates]);

  const autoOpenConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (route.downloadedVersion)
      router.setParams({ downloadedVersion: undefined });
  }, [route.downloadedVersion]);

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

  return {
    user: userState.user,
    scrollViewRef,
    gmailFeatureEnabled,
    flow,
    selectedSetupPath,
    completionSummary,
    importPreferences: preferences.preferences,
    busy,
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
    exploreDelayedImport: () => {
      if (activeImportOperation?.presentation?.mode !== "delayed") return;
      void trackAdminEvent('delayed_import_explore_selected', { properties: { operationKind: activeImportOperation.kind } }).catch(() => undefined);
      setDismissedDelayedOperationId(activeImportOperation.id);
      router.replace("/(tabs)");
    },
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
    connectEmail: () => {
      void connectEmail("receipt_import");
    },
    connectOutlook: () => {
      void connectOutlook("receipt_import");
    },
    chooseSetupEmail,
    chooseEmailSetup: () => {
      void trackAdminEvent('setup_method_selected', { properties: { method: 'email_receipts' } }).catch(() => undefined);
      setSelectedSetupPath("email");
    },
    chooseAlternativeSetup: () => {
      void trackAdminEvent('setup_method_selected', { properties: { method: 'provider_history' } }).catch(() => undefined);
      setSelectedSetupPath("alternative");
    },
    changeSetupMethod: () => setSelectedSetupPath(null),
    continueAfterCompletion,
    importEmail: () => {
      void importEmail();
    },
    importOutlook: () => {
      void importOutlook();
    },
    checkForNewOrders,
    setupOngoingUpdates,
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
    openTutorial: () => openTutorial(),
    openProviderTutorial: openTutorial,
    completeTutorial,
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    tutorialReadyConfirmed,
    reportDownloaded: () => {
      void reportDownloaded();
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
      router.replace("/(tabs)");
    },
    tryAnotherEmail: () => {
      setCompletionSummary(null);
      setSelectedSetupPath(null);
      setActiveTaskId("connect_email");
    },
  };
}
