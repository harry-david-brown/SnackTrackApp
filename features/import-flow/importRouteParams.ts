export interface ImportRouteParams {
  showExportTutorial: boolean;
  focus: 'export' | null;
  downloadedVersion: string | null;
  action: 'connect_gmail' | 'import_gmail' | 'request_export' | 'continue_export' | null;
  intentId: string | null;
}

type RawRouteValue = string | string[] | undefined;

const firstValue = (value: RawRouteValue): string | undefined => Array.isArray(value) ? value[0] : value;

/** The only boundary where Expo's untyped route values enter the import domain. */
export function parseImportRouteParams(raw: Record<string, RawRouteValue>): ImportRouteParams {
  const downloadedVersion = firstValue(raw.downloadedVersion);
  const rawAction = firstValue(raw.action);
  const action = rawAction === 'connect_gmail' || rawAction === 'import_gmail'
    || rawAction === 'request_export' || rawAction === 'continue_export'
    ? rawAction
    : null;
  return {
    showExportTutorial: firstValue(raw.showExportTutorial) === 'true',
    focus: firstValue(raw.focus) === 'export' ? 'export' : null,
    downloadedVersion: downloadedVersion || null,
    action,
    intentId: firstValue(raw.intentId) || null,
  };
}
