import { resolveDashboardTrackingState } from "@components/dashboard/dashboardTrackingState";
import { resolvePostWrappedExperience } from "@components/wrapped/postWrappedState";
import { resolveImportFlowState } from "@features/import-flow/importFlowResolver";
import type {
  GmailConnectionStatus,
  ImportPreferencesResponse,
} from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

const preferences = createImportPreferencesFixture;

const resolveUpload = (
  value: ImportPreferencesResponse,
  gmailStatus: GmailConnectionStatus,
  downloadState: "not_downloaded" | "downloaded" = "not_downloaded",
) =>
  resolveImportFlowState({
    preferences: value,
    gmailStatus,
    downloadState,
    gmailFeatureEnabled: true,
    focusExport: false,
    showExportTutorial: false,
  });

describe("canonical import journey", () => {
  it("moves from Gmail connection through sparse import and export-ready upload", () => {
    const value = preferences();
    expect(
      resolveUpload(value, { connected: false }).initialOpenTask,
    ).toBeNull();

    value.monitoring.capability.gmailConnected = true;
    value.ongoingTracking.capability.gmailConnected = true;
    value.ongoingTracking.capability.durableAccess = true;
    value.ongoingTracking.capability.canTrack = true;
    const healthyGmail = {
      connected: true,
      canImport: true,
      connectionHealth: "valid" as const,
    };
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBe(
      "gmail_import",
    );

    value.gmailBaseline = {
      hasCompleted: true,
      completedAt: "2026-08-01T00:00:00.000Z",
      latestAttempt: {
        status: "completed",
        updatedAt: null,
        importedCount: 3,
        errorCode: null,
      },
    };
    value.ongoingTracking.baseline = { eligible: true, source: "gmail" };
    value.coverage = {
      ...value.coverage,
      hasEmailData: true,
      emailReceiptCount: 3,
    };
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBeNull();
    expect(
      resolveUpload(value, healthyGmail).gmailImportPresentation.passive,
    ).toBe(true);
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "enable_tracking",
    );
    expect(
      resolvePostWrappedExperience({
        isExportStateLoading: false,
        hasCompletedAllExports: false,
        coverage: {
          orderCount: 3,
          earliestOrderDate: null,
          latestOrderDate: null,
          dataSources: ["email"],
          hasExportData: false,
        },
      }),
    ).toEqual({ exportEligibility: "show", coverageAssessment: "sparse" });

    value.monitoring.consentState = "granted";
    value.monitoring.effectiveState = "enabled";
    value.monitoring.capability.canMonitor = true;
    value.export.providers.uberEats.status = "requested";
    expect(resolveDashboardTrackingState(value, false).progress?.id).toBe(
      "uber_export_requested",
    );

    value.export.providers.uberEats.status = "file_ready";
    expect(resolveUpload(value, healthyGmail).exportImport.label).toBe(
      "Ready to download",
    );
    expect(
      resolveUpload(value, healthyGmail, "downloaded").exportImport.label,
    ).toBe("Ready to upload");
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "export_ready_uber_eats",
    );

    value.export.providers.uberEats.status = "completed";
    value.coverage = {
      ...value.coverage,
      hasExportData: true,
      exportReceiptCount: 40,
    };
    value.coverage.exportProviders.uberEats = {
      hasData: true,
      receiptCount: 40,
      earliestOrderDate: null,
      latestOrderDate: null,
    };
    value.ongoingTracking = {
      ...value.ongoingTracking,
      consentState: "granted",
      status: "active",
      effectiveState: "active",
    };
    expect(resolveUpload(value, healthyGmail).exportImport.label).toBe(
      "1 of 2 imported",
    );
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBe(
      "uber_export",
    );

    value.coverage.exportReceiptCount = 52;
    value.coverage.exportProviders.doorDash = {
      hasData: true,
      receiptCount: 12,
      earliestOrderDate: null,
      latestOrderDate: null,
    };
    expect(resolveUpload(value, healthyGmail).exportImport.label).toBe(
      "2 of 2 imported",
    );
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBeNull();
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "tracking_active",
    );
  });

  it("preserves completed data while expired Gmail credentials recover", () => {
    const value = preferences();
    value.gmailBaseline = {
      hasCompleted: true,
      completedAt: "2026-08-01T00:00:00.000Z",
      latestAttempt: {
        status: "completed",
        updatedAt: null,
        importedCount: 4,
        errorCode: null,
      },
    };
    value.ongoingTracking.baseline = { eligible: true, source: "gmail" };
    value.coverage = {
      ...value.coverage,
      hasEmailData: true,
      emailReceiptCount: 4,
    };
    value.monitoring.capability = {
      gmailConnected: true,
      durableAccess: false,
      canMonitor: false,
      needsReconnect: true,
      connectionHealth: "reconnect_required",
      lastValidatedAt: null,
    };
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: false,
      canTrack: false,
      needsReconnect: true,
      connectionHealth: "reconnect_required",
      lastValidatedAt: null,
    };
    const expired = {
      connected: true,
      canImport: false,
      needsReconnect: true,
      connectionHealth: "reconnect_required" as const,
    };
    expect(resolveUpload(value, expired).gmailImport.complete).toBe(true);
    expect(resolveUpload(value, expired).initialOpenTask).toBe("uber_export");
    expect(resolveDashboardTrackingState(value, false).id).toBe(
      "gmail_connection_reconnect",
    );
  });
});
