export interface ImportRouteParams {
  autoImportGmail: boolean;
  autoImportFlowId: string | null;
  showExportTutorial: boolean;
  focus: 'export' | null;
  downloadedVersion: string | null;
}

type RawRouteValue = string | string[] | undefined;

const firstValue = (value: RawRouteValue): string | undefined => Array.isArray(value) ? value[0] : value;

/** The only boundary where Expo's untyped route values enter the import domain. */
export function parseImportRouteParams(raw: Record<string, RawRouteValue>): ImportRouteParams {
  const autoImportFlowId = firstValue(raw.autoImportFlowId);
  const downloadedVersion = firstValue(raw.downloadedVersion);
  return {
    autoImportGmail: firstValue(raw.autoImportGmail) === 'true',
    autoImportFlowId: autoImportFlowId || null,
    showExportTutorial: firstValue(raw.showExportTutorial) === 'true',
    focus: firstValue(raw.focus) === 'export' ? 'export' : null,
    downloadedVersion: downloadedVersion || null,
  };
}
