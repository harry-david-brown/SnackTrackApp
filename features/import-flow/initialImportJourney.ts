import type { ImportFlowState } from './importFlowResolver';

export type ImportSetupPath = 'email' | 'gmail' | 'outlook' | 'alternative' | null;
export type MailboxOAuthReturnState = {
  readonly provider: 'gmail' | 'outlook';
  readonly status: 'confirming' | 'failed';
};

export type InitialImportJourneyState =
  | { kind: 'complete' }
  | { kind: 'provider_resume' }
  | { kind: 'choose_method' }
  | { kind: 'choose_email_provider' }
  | { kind: 'choose_provider' }
  | { kind: 'oauth_returning' | 'oauth_return_failed'; provider: 'gmail' | 'outlook'; providerName: 'Gmail' | 'Outlook' }
  | {
      kind: 'review_email_scan';
      provider: 'gmail' | 'outlook';
      providerName: 'Gmail' | 'Outlook';
      email: string | null;
      canImport: boolean;
      needsReconnect: boolean;
      temporarilyUnavailable: boolean;
    };

type JourneyInput = Pick<
  ImportFlowState,
  | 'hasImportedEmailData'
  | 'hasAnyExportData'
  | 'gmailConnected'
  | 'outlookConnected'
  | 'gmailEmail'
  | 'outlookEmail'
  | 'canImportFromGmail'
  | 'canImportFromOutlook'
  | 'gmailNeedsReconnect'
  | 'outlookNeedsReconnect'
  | 'gmailTemporarilyUnavailable'
  | 'outlookTemporarilyUnavailable'
  | 'exportProviderProgress'
>;

const providerJourneyStarted = (flow: JourneyInput): boolean =>
  flow.exportProviderProgress.uberEats.status !== 'not_started'
  || flow.exportProviderProgress.doorDash.status !== 'not_started';

/** Resolves the single active job for a user's first import journey. */
export function resolveInitialImportJourney(
  flow: JourneyInput,
  selectedPath: ImportSetupPath,
  oauthReturn: MailboxOAuthReturnState | null = null,
): InitialImportJourneyState {
  if (oauthReturn) {
    return {
      kind: oauthReturn.status === 'confirming' ? 'oauth_returning' : 'oauth_return_failed',
      provider: oauthReturn.provider,
      providerName: oauthReturn.provider === 'gmail' ? 'Gmail' : 'Outlook',
    };
  }
  if (selectedPath === 'alternative') return { kind: 'choose_provider' };
  if (flow.hasImportedEmailData || flow.hasAnyExportData) return { kind: 'complete' };
  if (providerJourneyStarted(flow)) return { kind: 'provider_resume' };
  if (selectedPath === 'email') return { kind: 'choose_email_provider' };

  const inferredProvider = selectedPath
    ?? (flow.gmailConnected && !flow.outlookConnected
      ? 'gmail'
      : flow.outlookConnected && !flow.gmailConnected
        ? 'outlook'
        : null);

  if (inferredProvider === 'gmail' && flow.gmailConnected) {
    return {
      kind: 'review_email_scan',
      provider: 'gmail',
      providerName: 'Gmail',
      email: flow.gmailEmail,
      canImport: flow.canImportFromGmail,
      needsReconnect: flow.gmailNeedsReconnect,
      temporarilyUnavailable: flow.gmailTemporarilyUnavailable,
    };
  }
  if (inferredProvider === 'outlook' && flow.outlookConnected) {
    return {
      kind: 'review_email_scan',
      provider: 'outlook',
      providerName: 'Outlook',
      email: flow.outlookEmail,
      canImport: flow.canImportFromOutlook,
      needsReconnect: flow.outlookNeedsReconnect,
      temporarilyUnavailable: flow.outlookTemporarilyUnavailable,
    };
  }
  return { kind: 'choose_method' };
}
