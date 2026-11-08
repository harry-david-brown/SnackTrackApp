import {
  gmailApi,
  MONITORING_CONSENT_VERSION,
  ONGOING_TRACKING_CONSENT_VERSION,
} from "@services/gmailApi";
import api from "@services/api";
import type {
  ImportPreferencesResponse,
  ProviderExportLifecycleStatus,
} from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

jest.mock("@services/api");

const preferences = (
  monitoringState: ImportPreferencesResponse["monitoring"]["consentState"] = "not_offered",
  exportStatus: ProviderExportLifecycleStatus = "not_started",
): ImportPreferencesResponse => {
  const value = createImportPreferencesFixture();
  value.monitoring.consentState = monitoringState;
  value.monitoring.consentVersion =
    monitoringState === "granted" ? MONITORING_CONSENT_VERSION : null;
  value.monitoring.effectiveState =
    monitoringState === "granted"
      ? "enabled"
      : monitoringState === "declined"
        ? "declined"
        : "not_offered";
  value.monitoring.capability = {
    gmailConnected: true,
    durableAccess: true,
    needsReconnect: false,
    connectionHealth: "valid",
    lastValidatedAt: null,
    canMonitor: true,
  };
  value.ongoingTracking.capability = {
    gmailConnected: true,
    durableAccess: true,
    needsReconnect: false,
    connectionHealth: "valid",
    lastValidatedAt: null,
    canTrack: true,
  };
  value.export.providers.uberEats.status = exportStatus;
  return value;
};

const importResult = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  code: null,
  totalEmailsFound: 0,
  totalReceiptsProcessed: 0,
  emailsExamined: 0,
  supportedReceiptsFound: 0,
  exportCoveredReceipts: 0,
  eligibleReceipts: 0,
  deduplicatedReceipts: 0,
  totalReceiptsImported: 0,
  totalAmount: 0,
  errors: [],
  newOrders: 0,
  updatedOrders: 0,
  unchangedOrders: 0,
  ...overrides,
});

describe("gmailApi.importReceipts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("leaves duplicate-action prevention to the flow controller and API lock", async () => {
    const response = {
      data: importResult({
        totalEmailsFound: 5,
        totalReceiptsProcessed: 4,
        emailsExamined: 5,
        supportedReceiptsFound: 4,
        eligibleReceipts: 4,
        deduplicatedReceipts: 4,
        totalReceiptsImported: 4,
        totalAmount: 42.5,
        newOrders: 4,
      }),
    };
    (api.post as jest.Mock).mockResolvedValue(response);

    await expect(gmailApi.importReceipts()).resolves.toMatchObject(
      response.data,
    );

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      "/gmail/import",
      {},
      { timeout: 300000 },
    );
  });

  it("allows a new import after the previous one completes", async () => {
    (api.post as jest.Mock)
      .mockResolvedValueOnce({
        data: importResult({
          totalEmailsFound: 1,
          totalReceiptsProcessed: 1,
          emailsExamined: 1,
          supportedReceiptsFound: 1,
          eligibleReceipts: 1,
          deduplicatedReceipts: 1,
          totalReceiptsImported: 1,
          totalAmount: 12,
          newOrders: 1,
        }),
      })
      .mockResolvedValueOnce({
        data: importResult({
          totalEmailsFound: 2,
          totalReceiptsProcessed: 2,
          emailsExamined: 2,
          supportedReceiptsFound: 2,
          eligibleReceipts: 2,
          deduplicatedReceipts: 2,
          totalReceiptsImported: 2,
          totalAmount: 24,
          newOrders: 2,
        }),
      });

    await gmailApi.importReceipts();
    await gmailApi.importReceipts();

    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it("rejects legacy import results that omit canonical lifecycle counts", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        code: null,
        totalEmailsFound: 1,
        totalReceiptsProcessed: 1,
        totalReceiptsImported: 1,
        totalAmount: 12,
        errors: [],
      },
    });

    await expect(gmailApi.importReceipts()).rejects.toThrow(
      "Invalid Gmail response: import.emailsExamined",
    );
  });
});

describe("gmailApi Gmail connection purpose", () => {
  it("sends the typed OAuth purpose with the callback URI", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: true, authUrl: "https://example.com/auth" },
    });

    await gmailApi.getAuthUrl(
      "snacktrack://oauth-callback",
      "ongoing_tracking",
      "a".repeat(64),
    );

    expect(api.post).toHaveBeenCalledWith("/gmail/auth-url", {
      redirectUri: "snacktrack://oauth-callback",
      purpose: "ongoing_tracking",
      handoffChallenge: "a".repeat(64),
    });
  });
});

describe("gmailApi import preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records versioned monitoring consent", async () => {
    const response = preferences("granted");
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.setMonitoringConsent("granted")).resolves.toEqual(
      response,
    );
    expect(api.put).toHaveBeenCalledWith(
      "/gmail/preferences/monitoring-consent",
      {
        decision: "granted",
        consentVersion: MONITORING_CONSENT_VERSION,
      },
    );
  });

  it("does not attach a consent version to decline or revocation", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: preferences("declined") });

    await gmailApi.setMonitoringConsent("declined");
    await gmailApi.setMonitoringConsent("revoked");

    expect(api.put).toHaveBeenNthCalledWith(
      1,
      "/gmail/preferences/monitoring-consent",
      {
        decision: "declined",
        consentVersion: undefined,
      },
    );
    expect(api.put).toHaveBeenNthCalledWith(
      2,
      "/gmail/preferences/monitoring-consent",
      {
        decision: "revoked",
        consentVersion: undefined,
      },
    );
  });

  it("records separate versioned consent for ongoing receipt tracking", async () => {
    const response = preferences();
    response.ongoingTracking.consentState = "granted";
    response.ongoingTracking.effectiveState = "active";
    response.ongoingTracking.status = "active";
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(
      gmailApi.setOngoingTrackingConsent("granted"),
    ).resolves.toEqual(response);
    expect(api.put).toHaveBeenCalledWith(
      "/gmail/preferences/ongoing-tracking-consent",
      {
        decision: "granted",
        consentVersion: ONGOING_TRACKING_CONSENT_VERSION,
      },
    );
  });

  it("can request an authenticated ongoing receipt check", async () => {
    const response = {
      ...importResult({
        newOrders: 2,
        totalEmailsFound: 2,
        totalReceiptsProcessed: 2,
        emailsExamined: 2,
        supportedReceiptsFound: 2,
        eligibleReceipts: 2,
        deduplicatedReceipts: 2,
        totalReceiptsImported: 2,
        totalAmount: 24,
      }),
      preferences: preferences(),
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });
    await expect(gmailApi.checkOngoingTracking()).resolves.toMatchObject(
      response,
    );
    expect(api.post).toHaveBeenCalledWith(
      "/gmail/tracking/check",
      {},
      { timeout: 300000 },
    );
  });

  it("loads preferences and records an export request", async () => {
    const response = preferences("declined", "requested");
    (api.get as jest.Mock).mockResolvedValue({ data: response });
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.getImportPreferences()).resolves.toEqual(response);
    await expect(gmailApi.markExportRequested("uber_eats")).resolves.toEqual(
      response,
    );

    expect(api.get).toHaveBeenCalledWith("/gmail/preferences");
    expect(api.post).toHaveBeenCalledWith(
      "/gmail/preferences/export-requested",
      {
        provider: "uber_eats",
      },
    );
  });

  it("checks whether Uber has delivered the requested export", async () => {
    const response = {
      detected: true,
      preferences: preferences("granted", "file_ready"),
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.checkExportReady()).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith(
      "/gmail/preferences/check-export-ready",
    );
  });

  it("requests an import-status reset when disconnecting for onboarding", async () => {
    const response = {
      success: true,
      message: "Gmail account disconnected successfully",
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(
      gmailApi.disconnect({ resetImportStatus: true }),
    ).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith("/gmail/disconnect", {
      resetImportStatus: true,
    });
  });

  it("rejects malformed lifecycle data at the service boundary", async () => {
    const valid = preferences();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        ...valid,
        export: {
          providers: {
            ...valid.export.providers,
            uberEats: { ...valid.export.providers.uberEats, status: "mystery" },
          },
        },
      },
    });

    await expect(gmailApi.getImportPreferences()).rejects.toThrow(
      "Invalid Gmail response: preferences.export.providers.uberEats.status",
    );
  });
});
