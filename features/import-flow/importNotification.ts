import type { ExportProvider } from "./contracts";

export type ImportNotification =
  | { type: "import_operation"; operationId: string }
  | { type: "export_ready"; provider: ExportProvider; requestId: string };

/** Notification data is untrusted; server state is checked again before navigation. */
export function parseImportNotification(
  data: Record<string, unknown>,
): ImportNotification | null {
  if (
    data.type === "import_operation" &&
    typeof data.operationId === "string" &&
    data.operationId.length > 0
  ) {
    return { type: data.type, operationId: data.operationId };
  }
  if (
    data.type === "export_ready" &&
    (data.provider === "uber_eats" || data.provider === "doordash") &&
    typeof data.requestId === "string" &&
    data.requestId.length > 0
  ) {
    return {
      type: data.type,
      provider: data.provider,
      requestId: data.requestId,
    };
  }
  return null;
}
