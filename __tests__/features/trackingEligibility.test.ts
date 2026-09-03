import {
  resolveOngoingUpdatesPresentation,
  resolveTrackingEligibility,
} from "@features/import-flow/trackingEligibility";
import type { ImportPreferencesResponse } from "@features/import-flow/contracts";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

const preferences = (
  overrides: {
    baseline?: boolean;
    canTrack?: boolean;
    health?: "valid" | "reconnect_required" | "unavailable";
    bothExports?: boolean;
    oneExport?: boolean;
  } = {},
): ImportPreferencesResponse => {
  const value = createImportPreferencesFixture();
  const baseline = overrides.baseline ?? true;
  value.gmailBaseline = {
    hasCompleted: baseline,
    completedAt: baseline ? "2026-08-24T00:00:00.000Z" : null,
    latestAttempt: {
      status: baseline ? "completed" : "never_started",
      updatedAt: null,
      importedCount: 0,
      errorCode: null,
    },
  };
  value.ongoingTracking.baseline = {
    eligible: baseline,
    source: baseline ? "gmail" : "none",
  };
  value.ongoingTracking.capability = {
    ...value.ongoingTracking.capability,
    canTrack: overrides.canTrack ?? true,
    connectionHealth: overrides.health ?? "valid",
  };
  const uberHasData = overrides.bothExports || overrides.oneExport || false;
  value.coverage.exportProviders.uberEats = {
    ...value.coverage.exportProviders.uberEats,
    hasData: uberHasData,
    receiptCount: uberHasData ? 10 : 0,
  };
  value.coverage.exportProviders.doorDash = {
    ...value.coverage.exportProviders.doorDash,
    hasData: overrides.bothExports ?? false,
    receiptCount: overrides.bothExports ? 10 : 0,
  };
  if (uberHasData || overrides.bothExports) {
    value.ongoingTracking.baseline = { eligible: true, source: "exports" };
  }
  return value;
};

describe("resolveTrackingEligibility", () => {
  it("uses sticky baseline completion instead of the latest attempt status", () => {
    const value = preferences();
    value.gmailBaseline.latestAttempt.status = "failed";
    expect(resolveTrackingEligibility(value)).toEqual({
      eligible: true,
      reason: "eligible",
    });
  });

  it("distinguishes baseline, temporary availability, and reconnect recovery", () => {
    expect(
      resolveTrackingEligibility(preferences({ baseline: false })),
    ).toEqual({ eligible: false, reason: "historical_baseline_required" });
    expect(
      resolveTrackingEligibility(preferences({ health: "unavailable" })),
    ).toEqual({ eligible: false, reason: "gmail_temporarily_unavailable" });
    expect(
      resolveTrackingEligibility(
        preferences({ canTrack: false, health: "reconnect_required" }),
      ),
    ).toEqual({ eligible: false, reason: "gmail_reconnect_required" });
  });

  it("accepts downloaded history from both providers without completing an email scan", () => {
    expect(
      resolveTrackingEligibility(
        preferences({ baseline: false, bothExports: true }),
      ),
    ).toEqual({ eligible: true, reason: "eligible" });
  });

  it("accepts one provider’s downloaded history and leaves provider completeness separate", () => {
    expect(
      resolveTrackingEligibility(
        preferences({ baseline: false, oneExport: true }),
      ),
    ).toEqual({ eligible: true, reason: "eligible" });
  });

  it("presents future updates as the recommended next step after history exists", () => {
    const value = preferences();
    expect(resolveOngoingUpdatesPresentation(value, true)).toMatchObject({
      visible: true,
      statusLabel: "Recommended",
      tone: "recommended",
      actionLabel: "Enable Ongoing Updates",
      actionVariant: "primary",
    });
  });

  it("uses a provider-neutral reconnect action when completed history exists but email access is unhealthy", () => {
    expect(
      resolveOngoingUpdatesPresentation(
        preferences({
          canTrack: false,
          health: "reconnect_required",
        }),
        true,
      ),
    ).toMatchObject({
      statusLabel: "Reconnect",
      actionLabel: "Manage email connections",
      tone: "warning",
    });
  });
});
