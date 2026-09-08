import { parseImportReturnTo, type ImportReturnTo } from './importNavigation';
import type { ExportProvider } from './contracts';
import { parseGmailConnectionPurpose, type GmailConnectionPurpose } from './gmailConnectionPurpose';

export interface ImportRouteParams {
  mailbox?: 'gmail' | 'outlook' | null;
  journeyContext?: 'onboarding' | 'post_onboarding';
  returnTo?: ImportReturnTo;
  sourcePicker: boolean;
  showExportTutorial: boolean;
  focus: 'export' | null;
  downloadedVersion: string | null;
  action: 'connect_gmail' | 'import_gmail' | 'request_export' | 'continue_export' | null;
  intentId: string | null;
  provider: ExportProvider | null;
  gmailPurpose: GmailConnectionPurpose | null;
}

type RawRouteValue = string | string[] | undefined;

const firstValue = (value: RawRouteValue): string | undefined => Array.isArray(value) ? value[0] : value;

/** The only boundary where Expo's untyped route values enter the import domain. */
export function parseImportRouteParams(raw: Record<string, RawRouteValue>): ImportRouteParams {
  const downloadedVersion = firstValue(raw.downloadedVersion);
  const rawAction = firstValue(raw.action);
  const rawProvider = firstValue(raw.provider);
  const action = rawAction === 'connect_gmail' || rawAction === 'import_gmail'
    || rawAction === 'request_export' || rawAction === 'continue_export'
    ? rawAction
    : null;
  return {
    mailbox: firstValue(raw.mailbox) === 'outlook' || firstValue(raw.outlook) ? 'outlook' : firstValue(raw.mailbox) === 'gmail' || firstValue(raw.gmail) ? 'gmail' : null,
    journeyContext: firstValue(raw.journeyContext) === 'onboarding' ? 'onboarding' : undefined,
    returnTo: parseImportReturnTo(raw.returnTo),
    sourcePicker: firstValue(raw.sourcePicker) === 'true',
    showExportTutorial: firstValue(raw.showExportTutorial) === 'true',
    focus: firstValue(raw.focus) === 'export' ? 'export' : null,
    downloadedVersion: downloadedVersion || null,
    action,
    intentId: firstValue(raw.intentId) || null,
    provider: rawProvider === 'uber_eats' || rawProvider === 'doordash' ? rawProvider : null,
    gmailPurpose: parseGmailConnectionPurpose(firstValue(raw.gmailPurpose)),
  };
}
