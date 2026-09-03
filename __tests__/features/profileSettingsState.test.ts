import { resolveProfileSettingsState } from "@features/profile/profileSettingsState";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

const preferences = createImportPreferencesFixture;

describe("resolveProfileSettingsState", () => {
  it("keeps loading labels stable while preferences load", () => {
    expect(resolveProfileSettingsState(null, true)).toEqual({
      mailboxConnectionsLabel: "Checking...",
      exportAlertsLabel: "Checking...",
      ongoingTrackingLabel: "Checking...",
      providerExportLabel: "Checking...",
      tutorialMode: "request",
      tutorialPlatform: "uber",
      tutorialEntryJob: "request",
      tutorialProviderStatuses: {
        uber: "not_started",
        doordash: "not_started",
      },
    });
  });

  it("summarizes connected mailbox providers", () => {
    const value = preferences();
    value.gmailConnection.connected = true;
    expect(resolveProfileSettingsState(value, false).mailboxConnectionsLabel).toBe("Gmail");
    value.outlookConnection.connected = true;
    expect(resolveProfileSettingsState(value, false).mailboxConnectionsLabel).toBe("Gmail + Outlook");
    value.outlookConnection.needsReconnect = true;
    expect(resolveProfileSettingsState(value, false).mailboxConnectionsLabel).toBe("Needs attention");
  });

  it.each([
    ["enabled", "On"],
    ["reconnect_required", "Reconnect"],
    ["declined", "Off"],
    ["disabled", "Off"],
    ["not_offered", "Not set"],
  ] as const)("maps monitoring %s to %s", (effectiveState, label) => {
    const value = preferences();
    value.monitoring.effectiveState = effectiveState;
    expect(resolveProfileSettingsState(value, false).exportAlertsLabel).toBe(
      label,
    );
  });

  it.each([
    ["active", "On"],
    ["reconnect_required", "Reconnect"],
    ["error", "Needs attention"],
    ["paused", "Off"],
    ["declined", "Off"],
    ["not_offered", "Not set"],
  ] as const)("maps tracking %s to %s", (effectiveState, label) => {
    const value = preferences();
    value.ongoingTracking.effectiveState = effectiveState;
    expect(resolveProfileSettingsState(value, false).ongoingTrackingLabel).toBe(
      label,
    );
  });

  it("opens the download tutorial only for an export in progress", () => {
    const value = preferences();
    value.export.providers = {
      uberEats: {
        provider: "uber_eats",
        status: "file_ready",
        requestedAt: null,
        updatedAt: null,
        errorCode: null,
        relevance: "unknown",
      },
      doorDash: {
        provider: "doordash",
        status: "not_started",
        requestedAt: null,
        updatedAt: null,
        errorCode: null,
        relevance: "unknown",
      },
    };
    expect(resolveProfileSettingsState(value, false).tutorialMode).toBe(
      "download",
    );
    expect(resolveProfileSettingsState(value, false).tutorialPlatform).toBe(
      "uber",
    );
    value.export.providers.uberEats.status = "completed";
    expect(resolveProfileSettingsState(value, false).tutorialMode).toBe(
      "request",
    );
  });
});
