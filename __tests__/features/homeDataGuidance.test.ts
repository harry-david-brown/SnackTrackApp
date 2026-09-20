import { resolveHomeDataGuidance, resolveHomePrioritySurface } from "@components/dashboard/dashboardTrackingState";
import type { ImportOperation } from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

describe("resolveHomeDataGuidance", () => {
  const declineTracking = (preferences: ReturnType<typeof createImportPreferencesFixture>) => {
    preferences.ongoingTracking.consentState = "declined";
    preferences.ongoingTracking.effectiveState = "declined";
  };

  it("hides the Uber exception when Gmail or Outlook has found one Uber receipt", () => {
    const preferences = createImportPreferencesFixture();
    declineTracking(preferences);
    preferences.coverage.emailReceiptCount = 1;
    preferences.coverage.hasEmailData = true;
    preferences.coverage.emailProviders.uberEats = {
      receiptCount: 1,
      hasData: true,
      earliestOrderDate: "2020-01-01T00:00:00.000Z",
      latestOrderDate: "2020-01-01T00:00:00.000Z",
    };
    const result = resolveHomeDataGuidance(preferences, false);
    expect(result.id).toBe("missing_uber_history");
    expect(result.canMarkUberNotUsed).toBe(false);
  });

  it("does not treat a stale completed lifecycle as Uber file coverage", () => {
    const preferences = createImportPreferencesFixture();
    declineTracking(preferences);
    preferences.coverage.emailReceiptCount = 1;
    preferences.coverage.hasEmailData = true;
    preferences.coverage.emailProviders.doorDash.hasData = true;
    preferences.export.providers.uberEats.status = "completed";
    expect(resolveHomeDataGuidance(preferences, false).id).toBe("uber_no_usable_orders");
  });

  it("puts receipt-backed Uber completion near the bottom", () => {
    const preferences = createImportPreferencesFixture();
    declineTracking(preferences);
    preferences.coverage.exportReceiptCount = 1;
    preferences.coverage.hasExportData = true;
    preferences.coverage.exportProviders.uberEats.hasData = true;
    preferences.coverage.exportProviders.uberEats.receiptCount = 1;
    expect(resolveHomeDataGuidance(preferences, false).placement).toBe("footer");
  });

  it("keeps file-ready recovery above healthy coverage", () => {
    const preferences = createImportPreferencesFixture();
    preferences.coverage.exportProviders.uberEats.hasData = true;
    preferences.export.providers.doorDash.status = "file_ready";
    expect(resolveHomeDataGuidance(preferences, false).id).toBe("file_ready_doordash");
  });

  it("promotes ongoing updates above optional history expansion when tracking has not been offered", () => {
    const preferences = createImportPreferencesFixture();
    preferences.coverage.emailReceiptCount = 1;
    preferences.coverage.hasEmailData = true;
    preferences.gmailBaseline.hasCompleted = true;
    preferences.ongoingTracking.baseline = { eligible: true, source: "gmail" };
    preferences.ongoingTracking.capability = {
      ...preferences.ongoingTracking.capability,
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      connectionHealth: "valid",
    };

    expect(resolveHomeDataGuidance(preferences, false)).toMatchObject({
      id: "tracking_recommended",
      placement: "priority",
      display: "compact",
      primaryAction: "enable_tracking",
      primaryLabel: "Turn on automatic updates",
    });
  });

  it("promotes email connection when downloaded history can seed tracking", () => {
    const preferences = createImportPreferencesFixture();
    preferences.coverage.exportReceiptCount = 4;
    preferences.coverage.hasExportData = true;
    preferences.coverage.exportProviders.uberEats.hasData = true;
    preferences.ongoingTracking.baseline = { eligible: true, source: "exports" };

    expect(resolveHomeDataGuidance(preferences, false)).toMatchObject({
      id: "tracking_connect_email",
      placement: "priority",
      display: "compact",
      primaryAction: "open_import",
      gmailPurpose: "ongoing_tracking",
    });
  });

  it("shows setup progress before returning tracking to the footer", () => {
    const preferences = createImportPreferencesFixture();
    preferences.coverage.exportReceiptCount = 4;
    preferences.coverage.hasExportData = true;
    preferences.coverage.exportProviders.uberEats.hasData = true;
    preferences.ongoingTracking.consentState = "granted";
    preferences.ongoingTracking.status = "setting_up";
    preferences.ongoingTracking.effectiveState = "setting_up";

    expect(resolveHomeDataGuidance(preferences, false)).toMatchObject({
      id: "tracking_setting_up",
      placement: "priority",
      passive: true,
      busy: true,
    });
  });

  it("keeps declined and active tracking in the footer when no higher-priority guidance remains", () => {
    for (const effectiveState of ["declined", "active"] as const) {
      const preferences = createImportPreferencesFixture();
      preferences.coverage.exportReceiptCount = 4;
      preferences.coverage.hasExportData = true;
      preferences.coverage.exportProviders.uberEats.hasData = true;
      preferences.ongoingTracking.effectiveState = effectiveState;
      expect(resolveHomeDataGuidance(preferences, false)).toMatchObject({
        id: "data_healthy",
        placement: "footer",
      });
    }
  });

  it("keeps reconnect and tracking errors above the recommendation", () => {
    const reconnect = createImportPreferencesFixture();
    reconnect.coverage.emailReceiptCount = 3;
    reconnect.ongoingTracking.effectiveState = "reconnect_required";
    expect(resolveHomeDataGuidance(reconnect, false).id).toBe("reconnect_required");

    const failed = createImportPreferencesFixture();
    failed.coverage.emailReceiptCount = 3;
    failed.ongoingTracking.effectiveState = "error";
    expect(resolveHomeDataGuidance(failed, false).id).toBe("email_import_failed");
  });

  it("keeps missing history and unavailable preferences above tracking guidance", () => {
    expect(resolveHomeDataGuidance(createImportPreferencesFixture(), false).id).toBe("no_history");
    expect(resolveHomeDataGuidance(null, false, true).id).toBe("preferences_unavailable");
  });

  it("lets an active import replace the tracking recommendation", () => {
    const preferences = createImportPreferencesFixture();
    preferences.coverage.emailReceiptCount = 1;
    preferences.gmailBaseline.hasCompleted = true;
    preferences.ongoingTracking.baseline = { eligible: true, source: "gmail" };
    preferences.ongoingTracking.capability = {
      ...preferences.ongoingTracking.capability,
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      connectionHealth: "valid",
    };
    const guidance = resolveHomeDataGuidance(preferences, false);
    const operation = { id: "operation-1", status: "running" } as ImportOperation;
    expect(resolveHomePrioritySurface(operation, guidance)).toMatchObject({
      kind: "active_import",
      operation: { id: "operation-1" },
    });
  });
});
