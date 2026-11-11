import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import type { ExportProvider, ImportOperation, ImportPreferencesResponse, MailboxProvider } from './contracts';
import { resolveExportOpportunity, resolveImportCoverage, type ProviderJourneyState } from './importJourneyState';
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
    return input.operation && input.operation.kind !== 'export_ready_check' ? { kind: 'operation', operation: input.operation } : { kind: 'missing_operation' };
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
    const connection = input.selectedMailbox === 'gmail' ? input.preferences.gmailConnection : input.preferences.outlookConnection;
    return { kind: 'email_review', provider: input.selectedMailbox, email: connection.email ?? null, connected: connection.connected, reconnect: input.intent === 'reconnect' || connection.connectionHealth === 'reconnect_required', temporarilyUnavailable: connection.connectionHealth === 'unavailable' || (connection.connected && connection.connectionHealth !== 'reconnect_required' && connection.canImport === false) };
  }
  if (!selected) {
    // Resume-export is an explicit export intent, not the global next-action policy.
    // An unrelated inbox failure or operation must not swallow a saved export request.
    const opportunity = input.intent === 'resume_export' ? resolveExportOpportunity(coverage) : null;
    if (opportunity && opportunity.status !== 'not_started' && opportunity.status !== 'completed') {
      return resolveProviderEntry(opportunity);
    }
    return { kind: 'choose_method', providers };
  }
  if (input.step === 'upload' || (input.downloadState === 'downloaded' && !input.step)) return { kind: 'download_ready', provider: selected, downloaded: true };
  if (input.step === 'ready') return { kind: 'download_ready', provider: selected, downloaded: false };
  if (input.step === 'request' || input.step === 'resume' || input.step === 'confirm_request' || input.step === 'file_help') return { kind: input.step, provider: selected };
  return input.intent === 'resume_export' || input.intent === 'provider'
    ? resolveProviderEntry(selected) : { kind: 'request', provider: selected };
}

/** Both an explicit provider and a source-less resume use the same current stage. */
function resolveProviderEntry(provider: ProviderJourneyState): PostOnboardingImportJourneyState {
  switch (provider.status) {
    case 'file_ready': return { kind: 'download_ready', provider, downloaded: false };
    case 'requested': return { kind: 'provider_waiting', provider };
    case 'failed': return { kind: 'provider_failed', provider };
    case 'import_processing': return { kind: 'provider_processing', provider };
    default: return { kind: 'request', provider };
  }
}
