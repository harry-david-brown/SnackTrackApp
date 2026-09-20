import { hasMailboxBaseline } from './emailImportPresentation';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import type { ExportProvider, ImportOperation, ImportPreferencesResponse, MailboxProvider } from './contracts';
import { resolveImportCoverage, type ProviderJourneyState } from './importJourneyState';
import type { PostOnboardingImportIntent } from './postOnboardingImportRoute';
import type { GmailConnectionPurpose } from './gmailConnectionPurpose';

export type GuidedImportStep = 'goal' | 'email_suitability' | 'email_choice' | 'request' | 'resume' | 'ready' | 'upload' | 'confirm_request' | 'file_help' | null;
export interface GuidedImportSelection {
  intent: PostOnboardingImportIntent;
  provider: ExportProvider | null;
  mailbox: MailboxProvider | null;
  step: GuidedImportStep;
}
export const rememberImportSelection = (history: readonly GuidedImportSelection[], current: GuidedImportSelection): GuidedImportSelection[] => [...history, { ...current }];
export const DOWNLOAD_QUESTION_PRIMARY = { label: 'No / I’m not sure', recommendation: 'Recommended' } as const;
export type PostOnboardingImportJourneyState =
  | { kind: 'loading' | 'temporary_outage' | 'missing_operation' | 'email_settings' | 'email_choice' }
  | { kind: 'operation'; operation: ImportOperation }
  | { kind: 'choose_method'; providers: ProviderJourneyState[] }
  | { kind: 'provider_intro' | 'request' | 'resume' | 'provider_waiting' | 'provider_failed' | 'provider_processing' | 'confirm_request' | 'file_help'; provider: ProviderJourneyState }
  | { kind: 'download_ready'; provider: ProviderJourneyState; downloaded: boolean }
  | { kind: 'email_review'; provider: MailboxProvider; email: string | null; connected: boolean; reconnect: boolean; temporarilyUnavailable: boolean };
export interface ResolvePostOnboardingImportJourneyInput {
  readonly preferences: ImportPreferencesResponse | null;
  readonly preferencesLoading: boolean;
  readonly preferencesUnavailable: boolean;
  readonly operation: ImportOperation | null;
  readonly operationRequested: boolean;
  readonly operationLoading: boolean;
  readonly operationUnavailable?: boolean;
  readonly intent: PostOnboardingImportIntent;
  readonly selectedProvider: ExportProvider | null;
  readonly selectedMailbox?: MailboxProvider | null;
  readonly step?: GuidedImportStep;
  readonly downloadState: ExportDownloadHandoffState;
  readonly gmailPurpose?: GmailConnectionPurpose | null;
}
export function resolvePostOnboardingImportJourney(input: ResolvePostOnboardingImportJourneyInput): PostOnboardingImportJourneyState {
  if (input.operationRequested) {
    if (input.operationLoading) return { kind: 'loading' };
    if (input.operationUnavailable) return { kind: 'temporary_outage' };
    return input.operation ? { kind: 'operation', operation: input.operation } : { kind: 'missing_operation' };
  }
  if (input.preferencesLoading) return { kind: 'loading' };
  if (input.preferencesUnavailable) return { kind: 'temporary_outage' };
  if (!input.preferences) return { kind: 'loading' };
  const coverage = resolveImportCoverage(input.preferences);
  const providers = [coverage.providers.uberEats, coverage.providers.doorDash];
  const selected = providers.find(p => p.provider === input.selectedProvider);
  // Legacy guidance destinations now lead directly to the provider request.
  if (input.step === 'goal' || input.step === 'email_suitability') return selected ? { kind: 'request', provider: selected } : { kind: 'choose_method', providers };
  if (input.intent === 'email' || input.intent === 'reconnect' || input.step === 'email_choice') {
    if (!input.selectedMailbox) return { kind: 'email_choice' };
    if (input.gmailPurpose !== 'ongoing_tracking'
      && input.intent !== 'reconnect'
      && hasMailboxBaseline(input.preferences, input.selectedMailbox)) return { kind: 'email_settings' };
    const connection = input.selectedMailbox === 'gmail' ? input.preferences.gmailConnection : input.preferences.outlookConnection;
    return { kind: 'email_review', provider: input.selectedMailbox, email: connection.email ?? null, connected: connection.connected, reconnect: input.intent === 'reconnect' || connection.connectionHealth === 'reconnect_required', temporarilyUnavailable: connection.connectionHealth === 'unavailable' || (connection.connected && connection.connectionHealth !== 'reconnect_required' && connection.canImport === false) };
  }
  if (!selected) return { kind: 'choose_method', providers };
  if (input.step === 'upload' || (input.downloadState === 'downloaded' && !input.step)) return { kind: 'download_ready', provider: selected, downloaded: true };
  if (input.step === 'ready') return { kind: 'download_ready', provider: selected, downloaded: false };
  if (input.step === 'request' || input.step === 'resume' || input.step === 'confirm_request' || input.step === 'file_help') return { kind: input.step, provider: selected };
  if (input.intent === 'resume_export') {
    if (selected.status === 'file_ready') return { kind: 'download_ready', provider: selected, downloaded: false };
    if (selected.status === 'requested') return { kind: 'provider_waiting', provider: selected };
    if (selected.status === 'failed') return { kind: 'provider_failed', provider: selected };
    if (selected.status === 'import_processing') return { kind: 'provider_processing', provider: selected };
    return { kind: 'resume', provider: selected };
  }
  return { kind: 'provider_intro', provider: selected };
}
