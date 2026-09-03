import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { gmailApi } from "@services/gmailApi";
import type {
  GmailConnectionStatus,
  GmailImportResponse,
} from "@features/import-flow/contracts";
import { useUser } from "@contexts/UserContext";
import { showAlert, showSimpleAlert } from "@utils/platformAlert";
import { importPreferenceKeys } from "@lib/queryKeys";
import { cacheImportOperation } from "@hooks/useImportOperation";
import { toDomainError } from "@utils/domainError";
import { captureException } from "@utils/sentry";
import { invalidateImportState } from "@lib/queryInvalidation";
import {
  parseGmailConnectionPurpose,
  type GmailConnectionPurpose,
} from "@features/import-flow/gmailConnectionPurpose";

WebBrowser.maybeCompleteAuthSession();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const disconnectedGmailStatus: GmailConnectionStatus = { connected: false };

export type GmailPrimaryFlowState =
  "idle" | "connecting" | "preparing_import" | "importing";
export interface GmailConnectionResult {
  status: GmailConnectionStatus;
  purpose: GmailConnectionPurpose;
}

interface UseGmailImportOptions {
  connectionStatus?: GmailConnectionStatus | null;
  connectionStatusLoading?: boolean;
  onImportSuccess?: (result: GmailImportResponse) => void;
  onDisconnectSuccess?: () => void;
}

export function useGmailImport(options: UseGmailImportOptions = {}) {
  const {
    connectionStatus: projectedConnectionStatus,
    connectionStatusLoading = false,
    onDisconnectSuccess,
  } = options;
  const { state } = useUser();
  const queryClient = useQueryClient();
  const userId = state.user?.id;
  const connectionStatus = projectedConnectionStatus ?? disconnectedGmailStatus;
  const [isLoading, setIsLoading] = useState(false);
  const [primaryFlowState, setPrimaryFlowState] =
    useState<GmailPrimaryFlowState>("idle");
  const activePrimaryFlowPromise = useRef<Promise<unknown> | null>(null);
  const safetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
    };
  }, []);

  const isPrimaryActionInProgress = primaryFlowState !== "idle";

  const refreshConnectionStatus = useCallback(async () => {
    try {
      if (!userId) return null;
      const preferences = await queryClient.fetchQuery({
        queryKey: importPreferenceKeys.current(userId),
        queryFn: gmailApi.getImportPreferences,
        staleTime: 0,
      });
      return preferences.gmailConnection;
    } catch {
      return null;
    }
  }, [queryClient, userId]);

  const importReceiptsInternal = useCallback(
    async (statusOverride?: GmailConnectionStatus | null) => {
      try {
        const effectiveStatus = statusOverride ?? connectionStatus;

        if (effectiveStatus.canImport === false) {
          showSimpleAlert(
            "Reconnect Gmail",
            effectiveStatus.statusMessage ||
              "Reconnect Gmail before importing receipts.",
          );
          return false;
        }

        const result = await gmailApi.importReceipts();

        if (userId) cacheImportOperation(queryClient, userId, result);
        return true;
      } catch (error: unknown) {
        const domainError = toDomainError(error);
        if (domainError.code === "IMPORT_IN_PROGRESS") {
          showSimpleAlert(
            "Import Already Running",
            "A receipt import is already running for your account. Please wait for it to complete.",
          );
        } else if (domainError.code === "GMAIL_RECONNECT_REQUIRED") {
          showSimpleAlert("Reconnect Gmail", "Reconnect Gmail to continue.");
          await refreshConnectionStatus();
        } else if (domainError.code === "GMAIL_VALIDATION_UNAVAILABLE") {
          showSimpleAlert(
            "Couldn’t verify Gmail",
            "Gmail could not be reached. Please try again shortly.",
          );
        } else if (domainError.kind === "network") {
          showSimpleAlert(
            "Import Timeout",
            "The import is taking longer than expected. This might mean you have many emails to process. Please try again or check your connection.",
          );
        } else {
          showSimpleAlert("Import Failed", domainError.message);
        }

        return false;
      }
    },
    [
      connectionStatus,
      queryClient,
      refreshConnectionStatus,
      userId,
    ],
  );

  const waitForImportReady = useCallback(async () => {
    let latestStatus: GmailConnectionStatus | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      latestStatus = await refreshConnectionStatus();

      if (latestStatus?.connected && latestStatus.canImport !== false) {
        return latestStatus;
      }

      // The preferences query may already be in flight when the browser
      // returns from OAuth. Its first result can therefore describe the
      // pre-authorization state even though the callback has committed the
      // new credentials. Give the authoritative projection time to refresh.
      if (attempt < 7) await sleep(500);
    }

    return latestStatus;
  }, [refreshConnectionStatus]);

  const connectGmailInternal = useCallback(
    async (
      purpose: GmailConnectionPurpose,
    ): Promise<GmailConnectionResult | null> => {
      try {
        setIsLoading(true);
        setPrimaryFlowState("connecting");

        const redirectUri = AuthSession.makeRedirectUri({
          scheme: "snacktrack",
          path: "oauth-callback",
        });

        const { authUrl } = await gmailApi.getAuthUrl(redirectUri, purpose);
        const authResult = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri,
        );

        if (authResult.type !== "success" || !authResult.url) {
          if (authResult.type !== "cancel" && authResult.type !== "dismiss") {
            showSimpleAlert(
              "Error",
              "Failed to connect Gmail. Please try again.",
            );
          }
          return null;
        }

        const resultUrl = new URL(authResult.url);
        const gmailResult = resultUrl.searchParams.get("gmail");
        const errorMessage = resultUrl.searchParams.get("error");
        const returnedPurpose =
          parseGmailConnectionPurpose(
            resultUrl.searchParams.get("gmailPurpose"),
          ) ?? purpose;

        if (gmailResult !== "success") {
          showSimpleAlert(
            "Error",
            errorMessage || "Failed to connect Gmail. Please try again.",
          );
          return null;
        }

        const readyStatus = await waitForImportReady();

        if (!readyStatus?.connected) {
          showSimpleAlert(
            "Error",
            "Gmail connection was not ready after authorization. Please try again.",
          );
          return null;
        }

        if (readyStatus.canImport === false) {
          showSimpleAlert(
            "Reconnect Gmail",
            readyStatus.statusMessage ||
              "Reconnect Gmail before importing receipts.",
          );
          return null;
        }

        return { status: readyStatus, purpose: returnedPurpose };
      } catch (error: unknown) {
        showSimpleAlert("Error", toDomainError(error).message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [waitForImportReady],
  );

  const runPrimaryFlow = useCallback(
    <T>(runner: () => Promise<T>, fallback: T): Promise<T> => {
      if (activePrimaryFlowPromise.current) {
        return activePrimaryFlowPromise.current as Promise<T>;
      }

      // Safety timeout to ensure state always resets (6 minutes max, slightly longer than API timeout)
      safetyTimeout.current = setTimeout(() => {
        captureException(
          new Error("Gmail primary flow exceeded safety timeout"),
          { context: "gmail-primary-flow" },
        );
        activePrimaryFlowPromise.current = null;
        setPrimaryFlowState("idle");
      }, 360000);

      activePrimaryFlowPromise.current = (async () => {
        try {
          return await runner();
        } catch (error) {
          captureException(
            error instanceof Error
              ? error
              : new Error("Gmail primary flow failed"),
            { context: "gmail-primary-flow" },
          );
          return fallback;
        } finally {
          if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
          safetyTimeout.current = null;
          activePrimaryFlowPromise.current = null;
          setPrimaryFlowState("idle");
        }
      })();

      return activePrimaryFlowPromise.current as Promise<T>;
    },
    [],
  );

  const connectGmail = useCallback(
    async (purpose: GmailConnectionPurpose = "receipt_import") => {
      return runPrimaryFlow(async () => {
        const result = await connectGmailInternal(purpose);

        if (!result) {
          return null;
        }

        // Success is confirmed visually by the mascot loading modal on the
        // Upload screen (connect-success beat), so no native alert here — a
        // native alert would pop over and tear down the mascot modal.
        return result;
      }, null);
    },
    [connectGmailInternal, runPrimaryFlow],
  );

  const importReceipts = useCallback(
    async (statusOverride?: GmailConnectionStatus | null) => {
      return runPrimaryFlow(async () => {
        setPrimaryFlowState("importing");
        return importReceiptsInternal(statusOverride);
      }, false);
    },
    [importReceiptsInternal, runPrimaryFlow],
  );

  const disconnectGmail = useCallback(async () => {
    showAlert(
      "Disconnect Gmail",
      "Are you sure you want to disconnect your Gmail account? Your imported receipts will remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await gmailApi.disconnect();
              if (userId) await invalidateImportState(queryClient, userId);
              onDisconnectSuccess?.();
              showSimpleAlert("Success", "Gmail account disconnected.");
            } catch {
              showSimpleAlert(
                "Error",
                "Failed to disconnect Gmail. Please try again.",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [onDisconnectSuccess, queryClient, userId]);

  return {
    connectionStatus,
    isLoading,
    isChecking: connectionStatusLoading,
    primaryFlowState,
    isPrimaryActionInProgress,
    connectGmail,
    importReceipts,
    disconnectGmail,
    refreshConnectionStatus,
  };
}
