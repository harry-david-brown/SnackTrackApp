import { parseImportNotification } from "./importNotification";

describe("import notification boundary", () => {
  it.each(["uber_eats", "doordash"] as const)(
    "preserves the %s request identity",
    (provider) => {
      expect(
        parseImportNotification({
          type: "export_ready",
          provider,
          requestId: "request-2",
        }),
      ).toEqual({ type: "export_ready", provider, requestId: "request-2" });
    },
  );
  it.each([
    { type: "export_ready", provider: "gmail", requestId: "request-2" },
    { type: "export_ready", provider: "uber_eats" },
    { type: "export_ready", provider: "doordash", requestId: "" },
    { type: "import_operation", operationId: 1 },
    { type: "other" },
  ])("rejects invalid payloads", (data) =>
    expect(parseImportNotification(data)).toBeNull(),
  );
  it("retains legacy import-completion notifications", () => {
    expect(
      parseImportNotification({
        type: "import_operation",
        operationId: "job-1",
      }),
    ).toEqual({ type: "import_operation", operationId: "job-1" });
  });
});
