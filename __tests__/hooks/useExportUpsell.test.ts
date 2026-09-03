import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  resetExportUpsellForUser,
  useExportUpsell,
} from "@hooks/useExportUpsell";
import { createImportPreferencesFixture } from "@/__tests__/fixtures/importPreferences";
import type { ImportPreferencesResponse } from "@features/import-flow/contracts";

const mockRefreshPreferences = jest.fn();
const completedPreferences = (): ImportPreferencesResponse => {
  const value = createImportPreferencesFixture();
  value.coverage.hasExportData = true;
  value.coverage.exportReceiptCount = 2;
  value.coverage.exportProviders.uberEats = {
    ...value.coverage.exportProviders.uberEats,
    hasData: true,
    receiptCount: 1,
  };
  value.coverage.exportProviders.doorDash = {
    ...value.coverage.exportProviders.doorDash,
    hasData: true,
    receiptCount: 1,
  };
  return value;
};
let mockPreferences = completedPreferences();

jest.mock("@hooks/useImportPreferences", () => ({
  useImportPreferences: () => ({
    preferences: mockPreferences,
    isLoading: false,
    refresh: mockRefreshPreferences,
  }),
}));

describe("useExportUpsell server ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        wrappedSeenAt: "2026-07-29T12:00:00.000Z",
        dashboardSeenAt: null,
        clickedAt: null,
        lastDismissedAt: null,
        dismissCount: 0,
        completedAt: "legacy-device-marker",
      }),
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockRefreshPreferences.mockResolvedValue(undefined);
    mockPreferences = completedPreferences();
  });

  it("derives completion from server coverage and ignores a legacy device marker", async () => {
    const userId = "user-1";
    const { result } = renderHook(() => useExportUpsell(userId));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasCompletedAllExports).toBe(true);
    expect(result.current.upsellState).not.toHaveProperty("completedAt");

    await act(async () => resetExportUpsellForUser(userId));
    expect(result.current.hasCompletedAllExports).toBe(true);
  });

  it("keeps the missing provider opportunity after only one export", async () => {
    mockPreferences.coverage.exportProviders.doorDash = {
      ...mockPreferences.coverage.exportProviders.doorDash,
      hasData: false,
      receiptCount: 0,
    };
    const { result } = renderHook(() => useExportUpsell("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasCompletedAllExports).toBe(false);
    expect(result.current.exportCoverage.missingProviders).toEqual([
      "doordash",
    ]);
  });

  it("refreshes canonical preferences after an upload completes", async () => {
    const { result } = renderHook(() => useExportUpsell("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.markCompleted());
    expect(mockRefreshPreferences).toHaveBeenCalledTimes(1);
  });
});
