import {
  resolveExportOpportunity,
  resolveImportCoverage,
  resolveImportSetupRecommendation,
} from "@features/import-flow/importJourneyState";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

const preferences = createImportPreferencesFixture;

describe("import journey provider coverage", () => {
  it("distinguishes one provider from complete export coverage", () => {
    const value = preferences();
    value.export.providers.uberEats.status = "not_started";
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = {
      ...value.coverage.exportProviders.uberEats,
      hasData: true,
      receiptCount: 42,
    };

    const result = resolveImportCoverage(value);
    expect(result.importedProviderCount).toBe(1);
    expect(result.hasAnyExportData).toBe(true);
    expect(result.allProvidersImported).toBe(false);
    expect(result.providers.uberEats.status).toBe("completed");
    expect(result.missingProviders).toEqual(["doordash"]);
  });

  it("uses receipt coverage to complete stale provider lifecycle state", () => {
    const value = preferences();
    value.coverage.exportProviders.doorDash = {
      ...value.coverage.exportProviders.doorDash,
      hasData: true,
      receiptCount: 8,
    };

    expect(resolveImportCoverage(value).providers.doorDash).toMatchObject({
      imported: true,
      status: "completed",
    });
  });

  it("surfaces a ready or failed provider before an unstarted provider", () => {
    const value = preferences();
    value.export.providers.uberEats.status = "not_started";
    value.export.providers.doorDash.status = "failed";
    expect(
      resolveExportOpportunity(resolveImportCoverage(value))?.provider,
    ).toBe("doordash");

    value.export.providers.uberEats.status = "file_ready";
    expect(
      resolveExportOpportunity(resolveImportCoverage(value))?.provider,
    ).toBe("uber_eats");
  });

  it("selects the next setup action without imposing Gmail first", () => {
    const empty = preferences();
    expect(
      resolveImportSetupRecommendation({
        preferences: empty,
        gmailFeatureEnabled: true,
        gmailConnected: false,
        gmailNeedsReconnect: false,
      }),
    ).toEqual({ kind: "choose_source" });

    empty.coverage.exportProviders.uberEats = {
      ...empty.coverage.exportProviders.uberEats,
      hasData: true,
      receiptCount: 10,
    };
    empty.coverage.hasExportData = true;
    empty.ongoingTracking.baseline = { eligible: true, source: "exports" };
    expect(
      resolveImportSetupRecommendation({
        preferences: empty,
        gmailFeatureEnabled: true,
        gmailConnected: false,
        gmailNeedsReconnect: false,
      }),
    ).toEqual({ kind: "connect_email", purpose: "ongoing_tracking" });

    empty.coverage.exportProviders.doorDash = {
      ...empty.coverage.exportProviders.doorDash,
      hasData: true,
      receiptCount: 8,
    };
    expect(
      resolveImportSetupRecommendation({
        preferences: empty,
        gmailFeatureEnabled: true,
        gmailConnected: false,
        gmailNeedsReconnect: false,
      }),
    ).toEqual({ kind: "connect_email", purpose: "ongoing_tracking" });

    empty.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      connectionHealth: "valid",
      needsReconnect: false,
      lastValidatedAt: null,
    };
    expect(
      resolveImportSetupRecommendation({
        preferences: empty,
        gmailFeatureEnabled: true,
        gmailConnected: true,
        gmailNeedsReconnect: false,
      }),
    ).toEqual({ kind: "enable_tracking" });
  });

  it("recommends ongoing updates before an optional export after Gmail history completes", () => {
    const value = preferences();
    value.gmailBaseline = {
      hasCompleted: true,
      completedAt: "2026-08-01T00:00:00.000Z",
      latestAttempt: {
        status: "completed",
        updatedAt: null,
        importedCount: 24,
        errorCode: null,
      },
    };
    value.ongoingTracking.baseline = { eligible: true, source: "gmail" };
    value.coverage = {
      ...value.coverage,
      hasEmailData: true,
      emailReceiptCount: 24,
    };
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      connectionHealth: "valid",
      needsReconnect: false,
      lastValidatedAt: null,
    };

    expect(
      resolveImportSetupRecommendation({
        preferences: value,
        gmailFeatureEnabled: true,
        gmailConnected: true,
        gmailNeedsReconnect: false,
      }),
    ).toEqual({ kind: "enable_tracking" });

    value.ongoingTracking.consentState = "declined";
    value.ongoingTracking.effectiveState = "declined";
    expect(
      resolveImportSetupRecommendation({
        preferences: value,
        gmailFeatureEnabled: true,
        gmailConnected: true,
        gmailNeedsReconnect: false,
      }),
    ).toMatchObject({ kind: "provider", provider: { provider: "uber_eats" } });
  });
});
