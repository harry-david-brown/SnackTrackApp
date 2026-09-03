import { resolveDashboardTrackingState } from "@components/dashboard/dashboardTrackingState";
import type { ImportPreferencesResponse } from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

const preferences = createImportPreferencesFixture;

const completeGmailBaseline = (
  value: ImportPreferencesResponse,
  status: "completed" | "failed" = "completed",
) => {
  value.gmailBaseline = {
    hasCompleted: status === "completed",
    completedAt: status === "completed" ? "2026-08-01T00:00:00.000Z" : null,
    latestAttempt: {
      status,
      updatedAt: null,
      importedCount: 3,
      errorCode: null,
    },
  };
  value.ongoingTracking.baseline =
    status === "completed"
      ? { eligible: true, source: "gmail" }
      : { eligible: false, source: "none" };
};

describe("dashboard tracking state resolver", () => {
  const completeBothExports = (value: ImportPreferencesResponse) => {
    value.coverage.hasExportData = true;
    value.ongoingTracking.baseline = { eligible: true, source: "exports" };
    value.coverage.exportProviders.uberEats = {
      ...value.coverage.exportProviders.uberEats,
      hasData: true,
      receiptCount: 20,
    };
    value.coverage.exportProviders.doorDash = {
      ...value.coverage.exportProviders.doorDash,
      hasData: true,
      receiptCount: 20,
    };
  };

  it("starts with a source choice and advances to ongoing updates after Gmail", () => {
    const initial = preferences();
    expect(resolveDashboardTrackingState(initial, false).id).toBe(
      "choose_import_source",
    );
    expect(resolveDashboardTrackingState(initial, false).primaryAction).toBe(
      "open_import",
    );

    completeGmailBaseline(initial);
    initial.coverage = {
      ...initial.coverage,
      hasEmailData: true,
      emailReceiptCount: 3,
    };
    initial.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      needsReconnect: false,
      connectionHealth: "valid",
      lastValidatedAt: null,
    };
    expect(resolveDashboardTrackingState(initial, false).id).toBe(
      "enable_tracking",
    );
  });

  it.each([
    ["file_ready", "export_ready_uber_eats"],
    ["import_processing", "export_processing_uber_eats"],
    ["failed", "export_failed_uber_eats"],
  ] as const)("maps export status %s to %s", (status, expected) => {
    const value = preferences();
    value.export.providers.uberEats.status = status;
    expect(resolveDashboardTrackingState(value, false).id).toBe(expected);
  });

  it.each(["enabled", "disabled"] as const)(
    "keeps useful setup primary while a requested export and monitoring %s remain visible",
    (monitoringState) => {
      const value = preferences();
      value.export.providers.uberEats.status = "requested";
      value.monitoring.effectiveState = monitoringState;
      const result = resolveDashboardTrackingState(value, false);
      expect(result.id).toBe("choose_import_source");
      expect(result.progress?.id).toBe("uber_export_requested");
    },
  );

  it("asks for explicit tracking permission after both imports", () => {
    const value = preferences();
    completeGmailBaseline(value);
    completeBothExports(value);
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      needsReconnect: false,
      connectionHealth: "valid",
      lastValidatedAt: null,
    };
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "enable_tracking",
    );
  });

  it("moves email to ongoing setup after one provider is imported", () => {
    const value = preferences();
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = {
      ...value.coverage.exportProviders.uberEats,
      hasData: true,
      receiptCount: 20,
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe("history_complete_optional_freshness");
    expect(resolved.title).toBe("Uber Eats export is included");
    expect(resolved.primaryAction).toBe("connect_gmail");
    expect(resolved.primaryLabel).toBe("Connect email for updates");
    expect(resolved.primaryProvider).toBeUndefined();
  });

  it("names a failed provider without hiding the completed provider", () => {
    const value = preferences();
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = {
      ...value.coverage.exportProviders.uberEats,
      hasData: true,
      receiptCount: 20,
    };
    value.export.providers.doorDash.status = "failed";

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe("export_failed_doordash");
    expect(resolved.title).toContain("DoorDash");
    expect(resolved.primaryProvider).toBe("doordash");
  });

  it("offers ongoing updates directly when both exports and durable Gmail access exist", () => {
    const value = preferences();
    completeBothExports(value);
    value.coverage.exportReceiptCount = 942;
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      needsReconnect: false,
      connectionHealth: "valid",
      lastValidatedAt: null,
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe("history_complete_optional_freshness");
    expect(resolved.title).toBe("Uber Eats and DoorDash history are included");
    expect(resolved.primaryAction).toBe("enable_tracking");
    expect(resolved.primaryLabel).toBe("Enable ongoing updates");
  });

  it("shows a passive active state only when tracking is actually active", () => {
    const value = preferences();
    completeGmailBaseline(value);
    completeBothExports(value);
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      needsReconnect: false,
      connectionHealth: "valid",
      lastValidatedAt: null,
    };
    value.ongoingTracking.consentState = "granted";
    value.ongoingTracking.effectiveState = "active";
    value.ongoingTracking.status = "active";
    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe("tracking_active");
    expect(resolved.passive).toBe(true);
    expect(resolved.primaryAction).toBeUndefined();
  });

  it("prioritizes repair states over the completed experience", () => {
    const value = preferences();
    completeGmailBaseline(value);
    completeBothExports(value);
    value.ongoingTracking.consentState = "granted";
    value.ongoingTracking.effectiveState = "reconnect_required";
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "tracking_reconnect",
    );
  });

  it("turns an invalid email grant into an explicit reconnect action", () => {
    const value = preferences();
    completeBothExports(value);
    completeGmailBaseline(value, "failed");
    value.gmailBaseline.latestAttempt.errorCode = "GMAIL_RECONNECT_REQUIRED";

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.title).toBe("Reconnect email to continue");
    expect(resolved.primaryLabel).toBe("Reconnect email");
  });

  it("prioritizes proactively validated reconnect health over active tracking", () => {
    const value = preferences();
    completeGmailBaseline(value);
    completeBothExports(value);
    value.ongoingTracking = {
      ...value.ongoingTracking,
      consentState: "granted",
      status: "active",
      effectiveState: "active",
      capability: {
        gmailConnected: true,
        durableAccess: false,
        canTrack: false,
        needsReconnect: true,
        connectionHealth: "reconnect_required",
        lastValidatedAt: null,
      },
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe("gmail_connection_reconnect");
    expect(resolved.primaryAction).toBe("connect_gmail");
  });
});
