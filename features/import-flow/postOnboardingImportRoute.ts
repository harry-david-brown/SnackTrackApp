import { parseImportReturnTo, type ImportReturnTo } from './importNavigation';
import type { ExportProvider } from './contracts';
import { parseGmailConnectionPurpose, type GmailConnectionPurpose } from './gmailConnectionPurpose';

export type PostOnboardingImportIntent = 'choose' | 'email' | 'provider' | 'reconnect' | 'resume_export';

export interface PostOnboardingImportRoute {
  readonly journeyContext?: 'onboarding' | 'post_onboarding';
  readonly confirmRequest?: boolean;
  readonly returnTo?: ImportReturnTo;
  readonly intent: PostOnboardingImportIntent;
  readonly provider: ExportProvider | null;
  readonly operationId: string | null;
  readonly downloadedVersion: string | null;
  readonly mailbox?: 'gmail' | 'outlook' | null;
  readonly connectionSucceeded?: boolean;
  readonly connectionFailed?: boolean;
  readonly showDownloadSteps?: boolean;
  readonly requestNew?: boolean;
  readonly gmailPurpose?: GmailConnectionPurpose | null;
}

type RawValue = string | string[] | undefined;
const first = (value: RawValue): string | undefined => Array.isArray(value) ? value[0] : value;

export function parsePostOnboardingImportRoute(raw: Record<string, RawValue>): PostOnboardingImportRoute {
  const rawIntent = first(raw.intent);
  const legacyAction = first(raw.action);
  const providerValue = first(raw.provider);
  const intent: PostOnboardingImportIntent =
    rawIntent === 'email' || rawIntent === 'provider' || rawIntent === 'reconnect' || rawIntent === 'resume_export'
      ? rawIntent
      : legacyAction === 'connect_gmail'
        ? 'reconnect'
        : legacyAction === 'import_gmail'
          ? 'email'
          : legacyAction === 'continue_export' ? 'resume_export' : legacyAction === 'request_export' || first(raw.focus) === 'export' || first(raw.sourcePicker) === 'true'
            ? 'provider'
            : 'choose';
  return {
    intent,
    journeyContext: first(raw.journeyContext) === 'onboarding' ? 'onboarding' : 'post_onboarding',
    confirmRequest: first(raw.confirmRequest) === 'true',
    returnTo: parseImportReturnTo(raw.returnTo),
    requestNew: first(raw.requestNew) === 'true',
    showDownloadSteps: first(raw.showDownloadSteps) === 'true',
    provider: providerValue === 'uber_eats' || providerValue === 'doordash' ? providerValue : null,
    operationId: first(raw.operationId) ?? null,
    connectionSucceeded: first(raw.gmail) === 'success' || first(raw.outlook) === 'success',
    connectionFailed: Boolean(first(raw.error)) || first(raw.gmail) === 'error' || first(raw.outlook) === 'error',
    mailbox: first(raw.mailbox) === 'gmail' || first(raw.gmail) || legacyAction === 'connect_gmail' || legacyAction === 'import_gmail' ? 'gmail' : first(raw.mailbox) === 'outlook' || first(raw.outlook) ? 'outlook' : null,
    downloadedVersion: first(raw.downloadedVersion) ?? null,
    gmailPurpose: parseGmailConnectionPurpose(first(raw.gmailPurpose) ?? first(raw.outlookPurpose)),
  };
}

export const buildAddHistoryDestination = (
  intent: PostOnboardingImportIntent = 'choose',
  provider?: ExportProvider | null,
  returnTo: ImportReturnTo = 'home',
) => ({
  pathname: '/add-history' as const,
  params: {
    intent,
    returnTo,
    ...(provider ? { provider } : {}),
  },
});
