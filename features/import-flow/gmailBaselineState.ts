import type { GmailImportLifecycleStatus, ImportPreferencesResponse } from '@services/gmailApi';

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

/** Compatibility fallback for cached/test data created before gmailBaseline. */
export function resolveGmailBaselineState(
  preferences: ImportPreferencesResponse | null,
): GmailBaselineState {
  if (preferences?.gmailBaseline) return preferences.gmailBaseline;
  return {
    hasCompleted: preferences?.gmailImport.hasImported ?? false,
    completedAt: preferences?.gmailImport.hasImported
      ? preferences.gmailImport.updatedAt
      : null,
    latestAttempt: {
      status: preferences?.gmailImport.status ?? 'never_started',
      updatedAt: preferences?.gmailImport.updatedAt ?? null,
      importedCount: preferences?.gmailImport.importedCount ?? 0,
      errorCode: preferences?.gmailImport.errorCode ?? null,
    },
  };
}
