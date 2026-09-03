import { resolveInitialDataEntry } from "@features/import-flow/initialDataEntry";

describe("resolveInitialDataEntry", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("keeps a fresh account on Home before the server deferral expires", () => {
    expect(resolveInitialDataEntry({
      isAuthenticated: true,
      hasUser: true,
      totalReceipts: 0,
      guidance: { initialSetupDeferredUntil: "2026-09-08T12:00:00.000Z" },
      isLoading: false,
      hasError: false,
      now,
    }).id).toBe("home");
  });

  it("reopens setup at the exact deferral boundary", () => {
    expect(resolveInitialDataEntry({
      isAuthenticated: true,
      hasUser: true,
      totalReceipts: 0,
      guidance: { initialSetupDeferredUntil: now.toISOString() },
      isLoading: false,
      hasError: false,
      now,
    }).id).toBe("guided_setup");
  });

  it("does not reopen setup when useful history exists", () => {
    expect(resolveInitialDataEntry({
      isAuthenticated: true,
      hasUser: true,
      totalReceipts: 1,
      guidance: { initialSetupDeferredUntil: null },
      isLoading: false,
      hasError: false,
      now,
    }).id).toBe("home");
  });
});
