import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useGmailImport } from "@hooks/useGmailImport";
import { gmailApi } from "@services/gmailApi";
import * as WebBrowser from "expo-web-browser";
import { showSimpleAlert } from "@utils/platformAlert";
import { createQueryTestWrapper } from "@/__tests__/utils/queryTestUtils";
import type { GmailConnectionStatus } from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";
import { importOperationKeys, importPreferenceKeys } from "@lib/queryKeys";
jest.mock('@services/mailboxImportSubmission', () => ({ ImportStatusUnavailableError: class extends Error {}, resumeOrSubmitMailboxImport: (_user: string, _mailbox: string, submit: (key: string) => Promise<unknown>) => submit('test-request') }));

const mockInvalidateReceiptDerivedData = jest.fn();

jest.mock('@services/mailboxAuthorization', () => ({
  beginMailboxAuthorization: jest.fn(async () => 'a'.repeat(64)),
  finishMailboxAuthorization: jest.fn(async () => {}),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "snacktrack://oauth-callback"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("@services/gmailApi", () => ({
  gmailApi: {
    getAuthUrl: jest.fn(),
    getImportPreferences: jest.fn(),
    importReceipts: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock("@contexts/UserContext", () => ({
  useUser: jest.fn(() => ({
    state: { user: { id: "user-123" } },
  })),
}));

jest.mock("@services/analyticsApi", () => ({
  analyticsApi: {
    getUserSummary: jest.fn(),
  },
}));

jest.mock("@utils/platformAlert", () => ({
  showAlert: jest.fn(),
  showSimpleAlert: jest.fn(),
}));

jest.mock("@lib/queryInvalidation", () => ({
  invalidateImportState: jest.fn(),
  invalidateReceiptDerivedData: (...args: unknown[]) =>
    mockInvalidateReceiptDerivedData(...args),
}));

describe("useGmailImport", () => {
  const preferencesWithConnection = (
    gmailConnection: GmailConnectionStatus,
  ) => ({
    ...createImportPreferencesFixture(),
    gmailConnection,
  });
  const renderGmailHook = (
    connectionStatus: GmailConnectionStatus = { connected: false },
  ) => {
    const { Wrapper, queryClient } = createQueryTestWrapper();
    return {
      ...renderHook(() => useGmailImport({ connectionStatus }), {
        wrapper: Wrapper,
      }),
      queryClient,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(
      preferencesWithConnection({ connected: false }),
    );
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "cancel",
    });
  });

  it("reports the primary action as in progress while Gmail connection is loading", async () => {
    let resolveAuthUrl!: (value: { authUrl: string }) => void;

    (gmailApi.getAuthUrl as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAuthUrl = resolve;
        }),
    );

    const { result } = renderGmailHook();

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    let connectPromise!: ReturnType<typeof result.current.connectGmail>;

    await act(async () => {
      connectPromise = result.current.connectGmail();
    });

    await waitFor(() => {
      expect(gmailApi.getAuthUrl).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.primaryFlowState).toBe("connecting");
      expect(result.current.isPrimaryActionInProgress).toBe(true);
    });

    resolveAuthUrl({ authUrl: "https://example.com/auth" });

    await act(async () => {
      await connectPromise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.primaryFlowState).toBe("idle");
      expect(result.current.isPrimaryActionInProgress).toBe(false);
    });
  });

  it("connects the upload checklist without starting an automatic Gmail import", async () => {
    (gmailApi.getAuthUrl as jest.Mock).mockResolvedValue({
      authUrl: "https://example.com/auth",
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "snacktrack://oauth-callback?gmail=pending&completionToken=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&gmailPurpose=receipt_import",
    });
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(
      preferencesWithConnection({ connected: true, canImport: true }),
    );

    const { result } = renderGmailHook();
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => {
      await result.current.connectGmail();
    });

    expect(gmailApi.getAuthUrl).toHaveBeenCalledWith(
      expect.stringContaining("snacktrack://oauth-callback?"),
      "receipt_import",
      "a".repeat(64),
    );
    expect(gmailApi.importReceipts).not.toHaveBeenCalled();
  });

  it("waits through a stale disconnected projection after OAuth succeeds", async () => {
    (gmailApi.getAuthUrl as jest.Mock).mockResolvedValue({
      authUrl: "https://example.com/auth",
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "snacktrack://oauth-callback?gmail=pending&completionToken=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&gmailPurpose=receipt_import",
    });
    (gmailApi.getImportPreferences as jest.Mock)
      .mockResolvedValueOnce(
        preferencesWithConnection({ connected: false, canImport: false }),
      )
      .mockResolvedValue(
        preferencesWithConnection({ connected: true, canImport: true }),
      );

    const { result } = renderGmailHook();
    let connectionResult;

    await act(async () => {
      connectionResult = await result.current.connectGmail();
    });

    expect(connectionResult).toMatchObject({
      status: { connected: true, canImport: true },
      purpose: "receipt_import",
    });
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(2);
    expect(showSimpleAlert).not.toHaveBeenCalledWith(
      "Error",
      "Gmail connection was not ready after authorization. Please try again.",
    );
  });

  it("round-trips the signed Gmail connection purpose", async () => {
    (gmailApi.getAuthUrl as jest.Mock).mockResolvedValue({
      authUrl: "https://example.com/auth",
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "snacktrack://oauth-callback?gmail=pending&completionToken=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&gmailPurpose=export_ready_alerts",
    });
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(
      preferencesWithConnection({ connected: true, canImport: true }),
    );

    const { result } = renderGmailHook();
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    let connectionResult;
    await act(async () => {
      connectionResult = await result.current.connectGmail(
        "export_ready_alerts",
      );
    });

    expect(connectionResult).toMatchObject({ purpose: "export_ready_alerts" });
    expect(gmailApi.getAuthUrl).toHaveBeenCalledWith(
      expect.stringContaining("snacktrack://oauth-callback?"),
      "export_ready_alerts",
      "a".repeat(64),
    );
  });

  it("returns to idle after a failed explicit import", async () => {
    (gmailApi.importReceipts as jest.Mock).mockRejectedValue(
      new Error("Import failed"),
    );

    const { result } = renderGmailHook({ connected: true, canImport: true });

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    await act(async () => {
      await result.current.importReceipts();
    });

    await waitFor(() => {
      expect(gmailApi.importReceipts).toHaveBeenCalled();
      expect(result.current.primaryFlowState).toBe("idle");
      expect(result.current.isPrimaryActionInProgress).toBe(false);
    });
  });

  it("refreshes connection state and asks for reconnection after invalid_grant", async () => {
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(
      preferencesWithConnection({
        connected: true,
        canImport: false,
        needsReconnect: true,
      }),
    );
    (gmailApi.importReceipts as jest.Mock).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            version: "1",
            code: "GMAIL_RECONNECT_REQUIRED",
            message: "Reconnect Gmail to continue.",
            statusCode: 409,
            timestamp: "2026-08-31T20:00:00.000Z",
            path: "/gmail/import",
            method: "POST",
            requestId: "11111111-1111-4111-8111-111111111111",
          },
        },
      },
    });

    const { result, queryClient } = renderGmailHook({
      connected: true,
      canImport: true,
    });
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => {
      await result.current.importReceipts();
    });

    expect(showSimpleAlert).toHaveBeenCalledWith(
      "Reconnect Gmail",
      "Reconnect Gmail to continue.",
    );
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(importPreferenceKeys.current("user-123")),
    ).toMatchObject({
      gmailConnection: { needsReconnect: true },
    });
  });

  it("caches the durable operation after Gmail accepts the import", async () => {
    (gmailApi.importReceipts as jest.Mock).mockResolvedValue({
      id: "operation-1",
      kind: "gmail_historical",
      trigger: "user",
      status: "pending_dispatch",
      phase: "waiting",
      progress: 0,
      result: null,
      errorCode: null,
      errorMessage: null,
      attempts: 0,
      createdAt: "2026-09-02T12:00:00.000Z",
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      updatedAt: "2026-09-02T12:00:00.000Z",
    });
    const { Wrapper, queryClient } = createQueryTestWrapper();
    const { result } = renderHook(
      () =>
        useGmailImport({
          connectionStatus: { connected: true, canImport: true },
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => {
      await result.current.importReceipts();
    });

    expect(mockInvalidateReceiptDerivedData).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(importOperationKeys.active("user-123"))).toMatchObject({
      id: "operation-1",
      status: "pending_dispatch",
    });
  });
});
