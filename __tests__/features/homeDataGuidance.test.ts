import { resolveDashboardExportRecommendation, resolveHomeDataGuidance, resolveHomePrioritySurface } from "@components/dashboard/dashboardTrackingState";
import type { ImportOperation } from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

describe("resolveHomeDataGuidance", () => {
  const declineTracking = (preferences: ReturnType<typeof createImportPreferencesFixture>) => {
    preferences.ongoingTracking.consentState = "declined";
    preferences.ongoingTracking.effectiveState = "declined";
  };

  it("promotes a neutral invitation for a small email history", () => {
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
    expect(result.id).toBe("export_invitation_neutral");
    expect(result.placement).toBe("priority");
    expect(result.primaryAction).toEqual({ kind: "choose", source: "export", returnTo: "home" });
  });

  it("does not treat a stale completed lifecycle as Uber file coverage", () => {
    const preferences = createImportPreferencesFixture();
    declineTracking(preferences);
    preferences.coverage.emailReceiptCount = 1;
    preferences.coverage.hasEmailData = true;
    preferences.coverage.emailProviders.doorDash.hasData = true;
    preferences.export.providers.uberEats.status = "completed";
    expect(resolveHomeDataGuidance(preferences, false).id).toBe("export_invitation_neutral");
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

  it("promotes history expansion before an unseen optional updates offer", () => {
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
      id: "export_invitation_neutral",
      placement: "priority",
      display: "compact",
      primaryAction: { kind: "choose", source: "export", returnTo: "home" },
      primaryLabel: "Add orders from a delivery app",
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
      primaryAction: { kind: "choose", source: "email", purpose: "ongoing_tracking", returnTo: "home" },
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

const emailHistory = (uber: number, doorDash: number) => {
  const preferences = createImportPreferencesFixture();
  preferences.gmailBaseline.hasCompleted = true;
  preferences.coverage.emailReceiptCount = uber + doorDash;
  preferences.coverage.hasEmailData = uber + doorDash > 0;
  preferences.coverage.emailProviders.uberEats.receiptCount = uber;
  preferences.coverage.emailProviders.uberEats.hasData = uber > 0;
  preferences.coverage.emailProviders.doorDash.receiptCount = doorDash;
  preferences.coverage.emailProviders.doorDash.hasData = doorDash > 0;
  return preferences;
};

describe('adaptive export invitation', () => {
  it.each([
    [0, 0, 'neutral'], [5, 0, 'neutral'], [0, 5, 'neutral'],
    [6, 0, 'uber_eats'], [0, 6, 'doordash'], [8, 2, 'uber_eats'],
    [2, 8, 'doordash'], [4, 4, 'neutral'],
  ] as const)('selects %s Uber / %s DoorDash as %s', (uber, doorDash, expected) => {
    const preferences = emailHistory(uber, doorDash);
    expect(resolveDashboardExportRecommendation(preferences)).toBe(expected);
    const guidance = resolveHomeDataGuidance(preferences, false);
    expect(guidance).toMatchObject({ placement: 'priority', display: 'compact', exportRecommendation: expected });
    expect(resolveHomePrioritySurface(null, guidance)).toEqual({ kind: 'guidance', guidance });
  });

  it('uses a neutral invitation when provider counts are inconclusive', () => {
    const preferences = emailHistory(0, 0);
    preferences.coverage.emailReceiptCount = 10;
    expect(resolveDashboardExportRecommendation(preferences)).toBe('neutral');
  });

  it.each(['gmailBaseline', 'outlookBaseline'] as const)('recognizes a successful empty %s scan', baseline => {
    const preferences = createImportPreferencesFixture();
    preferences[baseline].latestAttempt.status = 'completed';
    expect(resolveHomeDataGuidance(preferences, false).exportRecommendation).toBe('neutral');
    preferences[baseline].latestAttempt.status = 'failed';
    expect(resolveHomeDataGuidance(preferences, false).id).toBe('email_import_failed');
    preferences[baseline].latestAttempt.status = 'never_started';
    expect(resolveHomeDataGuidance(preferences, false).id).toBe('no_history');
  });

  it('excludes unused services and never guesses an unobserved second service after an export', () => {
    const preferences = emailHistory(20, 0);
    preferences.coverage.exportProviders.uberEats.hasData = true;
    expect(resolveDashboardExportRecommendation(preferences)).toBeNull();
    preferences.coverage.emailProviders.doorDash.receiptCount = 2;
    expect(resolveDashboardExportRecommendation(preferences)).toBe('doordash');
    preferences.export.providers.doorDash.relevance = 'not_used';
    expect(resolveDashboardExportRecommendation(preferences)).toBeNull();
  });

  it('selects an eligible minority service instead of a service marked unused', () => {
    const preferences = emailHistory(20, 2);
    preferences.export.providers.uberEats.relevance = 'not_used';
    expect(resolveDashboardExportRecommendation(preferences)).toBe('doordash');
    preferences.export.providers.doorDash.relevance = 'not_used';
    expect(resolveDashboardExportRecommendation(preferences)).toBeNull();
  });

  it('uses receipt-backed completion instead of stale lifecycle completion', () => {
    const preferences = emailHistory(8, 2);
    preferences.export.providers.uberEats.status = 'completed';
    expect(resolveDashboardExportRecommendation(preferences)).toBe('uber_eats');
    preferences.coverage.exportProviders.uberEats.hasData = true;
    expect(resolveDashboardExportRecommendation(preferences)).toBe('doordash');
    preferences.coverage.exportProviders.doorDash.hasData = true;
    expect(resolveDashboardExportRecommendation(preferences)).toBeNull();
  });

  it.each(['not_offered', 'declined', 'active'] as const)('prioritizes exports with updates %s, whether seen or unseen', status => {
    for (const seen of [null, '2026-09-26T00:00:00Z']) {
      const preferences = emailHistory(8, 2);
      preferences.automaticUpdatesOfferSeenAt = seen;
      preferences.ongoingTracking.effectiveState = status;
      expect(resolveHomeDataGuidance(preferences, false).exportRecommendation).toBe('uber_eats');
    }
  });

  it.each([
    ['requested', 'request_waiting_doordash'], ['file_ready', 'file_ready_doordash'],
    ['failed', 'import_failed_doordash'], ['import_processing', 'processing_doordash'],
  ] as const)('keeps %s work ahead of invitations even after relevance changes', (status, id) => {
    const preferences = emailHistory(10, 0);
    preferences.export.providers.doorDash.status = status;
    preferences.export.providers.doorDash.relevance = 'not_used';
    expect(resolveHomeDataGuidance(preferences, false)).toMatchObject({ id, placement: 'priority' });
    expect(resolveHomeDataGuidance(preferences, false).exportRecommendation).toBeUndefined();
  });

  it.each(['setting_up', 'reconnect_required', 'error'] as const)('keeps operational tracking state %s ahead of invitations', status => {
    const preferences = emailHistory(10, 0);
    preferences.ongoingTracking.effectiveState = status;
    expect(resolveHomeDataGuidance(preferences, false).exportRecommendation).toBeUndefined();
  });

  it('replaces a promoted invitation with an active operation', () => {
    const guidance = resolveHomeDataGuidance(emailHistory(10, 0), false);
    const operation = { id: 'active', status: 'queued' } as ImportOperation;
    expect(resolveHomePrioritySurface(operation, guidance)).toEqual({ kind: 'active_import', operation });
  });
});
