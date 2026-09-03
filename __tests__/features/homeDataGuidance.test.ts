import { resolveHomeDataGuidance } from "@components/dashboard/dashboardTrackingState";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";

describe("resolveHomeDataGuidance", () => {
  it("hides the Uber exception when Gmail or Outlook has found one Uber receipt", () => {
    const preferences = createImportPreferencesFixture();
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
    preferences.coverage.emailReceiptCount = 1;
    preferences.coverage.hasEmailData = true;
    preferences.coverage.emailProviders.doorDash.hasData = true;
    preferences.export.providers.uberEats.status = "completed";
    expect(resolveHomeDataGuidance(preferences, false).id).toBe("uber_no_usable_orders");
  });

  it("puts receipt-backed Uber completion near the bottom", () => {
    const preferences = createImportPreferencesFixture();
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
});
