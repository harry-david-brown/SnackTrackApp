import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useImportPreferences } from "@hooks/useImportPreferences";
import { gmailApi } from "@services/gmailApi";
import type { ImportPreferencesResponse } from "@features/import-flow/contracts";
import { createQueryTestWrapper } from "@/__tests__/utils/queryTestUtils";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

jest.mock("@contexts/UserContext", () => ({
  useUser: () => ({ state: { user: { id: "user-123" } } }),
}));

jest.mock("@services/gmailApi", () => ({
  gmailApi: {
    getImportPreferences: jest.fn(),
    setMonitoringConsent: jest.fn(),
    setOngoingTrackingConsent: jest.fn(),
    checkOngoingTracking: jest.fn(),
    markExportRequested: jest.fn(),
  },
}));

const preferences = (
  overrides: Partial<ImportPreferencesResponse> = {},
): ImportPreferencesResponse => ({
  ...createImportPreferencesFixture(),
  ...overrides,
});

describe("useImportPreferences", () => {
  const renderPreferencesHook = (enabled = true) => {
    const { Wrapper } = createQueryTestWrapper();
    return renderHook(() => useImportPreferences(enabled), {
      wrapper: Wrapper,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(
      preferences(),
    );
  });

  it("loads durable import preferences", async () => {
    const { result, rerender } = renderPreferencesHook();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const refresh = result.current.refresh;
    const refreshIfStale = result.current.refreshIfStale;
    rerender(undefined);

    expect(result.current.preferences?.monitoring.effectiveState).toBe(
      "not_offered",
    );
    expect(result.current.refresh).toBe(refresh);
    expect(result.current.refreshIfStale).toBe(refreshIfStale);
    await act(async () => {
      await result.current.refreshIfStale();
    });
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(1);
  });

  it("stores the server response after granting consent", async () => {
    const enabledPreferences = preferences({
      monitoring: {
        ...preferences().monitoring,
        consentState: "granted",
        consentVersion: "2026-07-29.v1",
        consentedAt: "2026-07-29T12:00:00.000Z",
        effectiveState: "enabled",
      },
    });
    (gmailApi.setMonitoringConsent as jest.Mock).mockResolvedValue(
      enabledPreferences,
    );

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setMonitoringConsent("granted");
    });

    expect(gmailApi.setMonitoringConsent).toHaveBeenCalledWith("granted");
    await waitFor(() =>
      expect(result.current.preferences?.monitoring.effectiveState).toBe(
        "enabled",
      ),
    );
  });

  it("records export-request lifecycle state", async () => {
    const requestedPreferences = preferences({
      export: {
        providers: {
          ...preferences().export.providers,
          uberEats: {
            ...preferences().export.providers.uberEats,
            status: "requested",
            requestedAt: "2026-07-29T12:00:00.000Z",
            updatedAt: "2026-07-29T12:00:00.000Z",
          },
        },
      },
    });
    (gmailApi.markExportRequested as jest.Mock).mockResolvedValue(
      requestedPreferences,
    );

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markExportRequested("uber_eats");
    });

    expect(gmailApi.markExportRequested).toHaveBeenCalledWith("uber_eats");

    await waitFor(() =>
      expect(result.current.preferences?.export.providers.uberEats.status).toBe(
        "requested",
      ),
    );
  });

  it("stores ongoing tracking consent independently from export alerts", async () => {
    const activePreferences = preferences();
    activePreferences.ongoingTracking = {
      ...activePreferences.ongoingTracking,
      consentState: "granted",
      effectiveState: "active",
      status: "active",
    };
    (gmailApi.setOngoingTrackingConsent as jest.Mock).mockResolvedValue(
      activePreferences,
    );
    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setOngoingTrackingConsent("granted");
    });

    expect(gmailApi.setOngoingTrackingConsent).toHaveBeenCalledWith("granted");
    await waitFor(() =>
      expect(result.current.preferences?.ongoingTracking.effectiveState).toBe(
        "active",
      ),
    );
  });

  it("refreshes authoritative preferences when a tracking check fails", async () => {
    const failedPreferences = preferences();
    failedPreferences.ongoingTracking = {
      ...failedPreferences.ongoingTracking,
      status: "error",
      effectiveState: "error",
      activity: {
        ...failedPreferences.ongoingTracking.activity,
        lastErrorCode: "GMAIL_RECONNECT_REQUIRED",
      },
    };
    (gmailApi.getImportPreferences as jest.Mock)
      .mockResolvedValueOnce(preferences())
      .mockResolvedValueOnce(failedPreferences);
    (gmailApi.checkOngoingTracking as jest.Mock).mockRejectedValueOnce(
      new Error("Tracking failed"),
    );

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.checkOngoingTracking()).rejects.toThrow(
        "Tracking failed",
      );
    });

    await waitFor(() =>
      expect(result.current.preferences?.ongoingTracking.effectiveState).toBe(
        "error",
      ),
    );
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(2);
  });

  it("does not load when disabled", async () => {
    const { result } = renderPreferencesHook(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(gmailApi.getImportPreferences).not.toHaveBeenCalled();
    expect(result.current.preferences).toBeNull();
  });
});
