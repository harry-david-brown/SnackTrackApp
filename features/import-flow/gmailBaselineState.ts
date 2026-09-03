import type {
  GmailImportLifecycleStatus,
  ImportPreferencesResponse,
} from "./contracts";

export interface GmailBaselineState {
  hasCompleted: boolean;
  completedAt: string | null;
  latestAttempt: {
    status: GmailImportLifecycleStatus;
    updatedAt: string | null;
    importedCount: number;
    errorCode: string | null;
  };
}

/** Empty query state plus the canonical server-owned Gmail baseline. */
export function resolveGmailBaselineState(
  preferences: ImportPreferencesResponse | null,
): GmailBaselineState {
  if (preferences?.gmailBaseline) return preferences.gmailBaseline;
  return {
    hasCompleted: false,
    completedAt: null,
    latestAttempt: {
      status: "never_started",
      updatedAt: null,
      importedCount: 0,
      errorCode: null,
    },
  };
}
