import type {
  ExportProvider,
  ImportPreferencesResponse,
  ProviderExportLifecycleStatus,
} from './contracts';
import type { GmailConnectionPurpose } from './gmailConnectionPurpose';
import { resolveTrackingEligibility } from './trackingEligibility';
import { resolveGmailBaselineState } from './gmailBaselineState';

export interface ProviderJourneyState {
  provider: ExportProvider;
  name: 'Uber Eats' | 'DoorDash';
  imported: boolean;
  optionalSourceUnused?: boolean;
  receiptCount: number;
  status: ProviderExportLifecycleStatus;
}

export interface ImportCoverageState {
  hasEmailCoverage: boolean;
  hasAnyExportData: boolean;
  allProvidersImported: boolean;
  uberEatsImported: boolean;
  doorDashImported: boolean;
  importedProviderCount: 0 | 1 | 2;
  missingProviders: ExportProvider[];
  providers: {
    uberEats: ProviderJourneyState;
    doorDash: ProviderJourneyState;
  };
}

export type ImportSetupRecommendation =
  | { kind: 'choose_source' }
  | { kind: 'connect_email'; purpose: GmailConnectionPurpose }
  | { kind: 'scan_email'; mode: 'initial' | 'catch_up' }
  | { kind: 'email_optional'; connected: boolean }
  | { kind: 'provider'; provider: ProviderJourneyState; action: 'request' | 'continue' | 'processing' | 'recover' }
  | { kind: 'enable_tracking' }
  | { kind: 'none' };

const providerState = (
  provider: ExportProvider,
  name: ProviderJourneyState['name'],
  status: ProviderExportLifecycleStatus | undefined,
  coverage: { hasData: boolean; receiptCount: number } | undefined,
): ProviderJourneyState => ({
  provider,
  name,
  imported: coverage?.hasData ?? false,
  receiptCount: coverage?.receiptCount ?? 0,
  status: coverage?.hasData
    ? status && ['requested', 'file_ready', 'import_processing', 'failed'].includes(status)
      ? status
      : 'completed'
    : status === 'completed'
      ? 'not_started'
      : status ?? 'not_started',
});

/** Canonical receipt-derived provider coverage used by every import surface. */
export function resolveImportCoverage(
  preferences: ImportPreferencesResponse | null,
): ImportCoverageState {
  const uberEats = providerState(
    'uber_eats',
    'Uber Eats',
    preferences?.export.providers.uberEats.status,
    preferences?.coverage.exportProviders.uberEats,
  );
  const doorDash = providerState(
    'doordash',
    'DoorDash',
    preferences?.export.providers.doorDash.status,
    preferences?.coverage.exportProviders.doorDash,
  );
  uberEats.optionalSourceUnused = preferences?.export.providers.uberEats.relevance === 'not_used';
  doorDash.optionalSourceUnused = preferences?.export.providers.doorDash.relevance === 'not_used';
  const importedProviderCount = (
    Number(uberEats.imported) + Number(doorDash.imported)
  ) as 0 | 1 | 2;
  const missingProviders = [uberEats, doorDash]
    .filter((provider) => !provider.imported)
    .map((provider) => provider.provider);

  return {
    hasEmailCoverage: preferences?.coverage.hasEmailData ?? false,
    hasAnyExportData: importedProviderCount > 0,
    allProvidersImported: importedProviderCount === 2,
    uberEatsImported: uberEats.imported,
    doorDashImported: doorDash.imported,
    importedProviderCount,
    missingProviders,
    providers: { uberEats, doorDash },
  };
}

export const getProviderJourneyState = (
  coverage: ImportCoverageState,
  provider: ExportProvider,
): ProviderJourneyState => provider === 'uber_eats'
  ? coverage.providers.uberEats
  : coverage.providers.doorDash;

const ACTIONABLE_STATUS_PRIORITY: ProviderExportLifecycleStatus[] = [
  'file_ready',
  'failed',
  'import_processing',
  'requested',
  'not_started',
];

/** Selects the provider whose incomplete workflow is most useful to surface. */
export function resolveExportOpportunity(
  coverage: ImportCoverageState,
): ProviderJourneyState | null {
  const incomplete = [coverage.providers.uberEats, coverage.providers.doorDash]
    .filter((provider) => (!provider.imported && !provider.optionalSourceUnused) || ['requested', 'file_ready', 'import_processing', 'failed'].includes(provider.status));

  for (const status of ACTIONABLE_STATUS_PRIORITY) {
    const match = incomplete.find((provider) => provider.status === status);
    if (match) return match;
  }

  return incomplete[0] ?? null;
}

export function resolveImportSetupRecommendation({
  preferences,
  gmailFeatureEnabled,
  gmailConnected,
  gmailNeedsReconnect,
}: {
  preferences: ImportPreferencesResponse | null;
  gmailFeatureEnabled: boolean;
  gmailConnected: boolean;
  gmailNeedsReconnect: boolean;
}): ImportSetupRecommendation {
  const coverage = resolveImportCoverage(preferences);
  const requestableProvider = [coverage.providers.uberEats, coverage.providers.doorDash]
    .find((provider) => !provider.imported && !provider.optionalSourceUnused && provider.status === 'not_started');
  const actionableProvider = resolveExportOpportunity(coverage);
  const gmailHasRun = resolveGmailBaselineState(preferences).hasCompleted || Boolean(preferences?.outlookBaseline.hasCompleted);
  const trackingState = preferences?.ongoingTracking.effectiveState ?? 'not_offered';
  const shouldRecommendTracking = resolveTrackingEligibility(preferences).eligible
    && trackingState === 'not_offered' && preferences?.ongoingTracking.consentState === 'not_offered';
  const emailFeatureInUse = preferences?.monitoring.consentState === 'granted'
    || preferences?.ongoingTracking.consentState === 'granted';
  if (actionableProvider?.status === 'file_ready') {
    return { kind: 'provider', provider: actionableProvider, action: 'continue' };
  }
  if (actionableProvider?.status === 'failed') {
    return { kind: 'provider', provider: actionableProvider, action: 'recover' };
  }
  if (actionableProvider?.status === 'import_processing') {
    return { kind: 'provider', provider: actionableProvider, action: 'processing' };
  }
  if (actionableProvider?.status === 'requested') {
    return { kind: 'provider', provider: actionableProvider, action: 'continue' };
  }
  if (!gmailFeatureEnabled) {
    return requestableProvider ? { kind: 'provider', provider: requestableProvider, action: 'request' } : { kind: 'none' };
  }
  if (gmailNeedsReconnect && emailFeatureInUse) {
    const purpose: GmailConnectionPurpose = preferences?.monitoring.consentState === 'granted'
      && coverage.providers.uberEats.status === 'requested'
      ? 'export_ready_alerts'
      : preferences?.ongoingTracking.consentState === 'granted'
        ? 'ongoing_tracking'
        : 'connection_recovery';
    return { kind: 'connect_email', purpose };
  }
  if (coverage.hasAnyExportData && !gmailHasRun) {
    if (gmailNeedsReconnect || !gmailConnected) {
      return { kind: 'connect_email', purpose: 'ongoing_tracking' };
    }
    if (shouldRecommendTracking) {
      return { kind: 'enable_tracking' };
    }
    return { kind: 'email_optional', connected: true };
  }
  if (gmailConnected && !gmailHasRun) {
    return { kind: 'scan_email', mode: coverage.hasAnyExportData ? 'catch_up' : 'initial' };
  }
  if (gmailHasRun && shouldRecommendTracking) return { kind: 'enable_tracking' };
  if (gmailHasRun && requestableProvider) return { kind: 'provider', provider: requestableProvider, action: 'request' };
  if (coverage.importedProviderCount === 1 && requestableProvider) {
    return { kind: 'provider', provider: requestableProvider, action: 'request' };
  }
  if (!gmailHasRun && !coverage.hasAnyExportData) return { kind: 'choose_source' };
  if (!gmailHasRun && coverage.hasAnyExportData) return { kind: 'email_optional', connected: gmailConnected };
  if (shouldRecommendTracking) {
    return { kind: 'enable_tracking' };
  }
  return { kind: 'none' };
}

export const toDataPlatform = (provider: ExportProvider): 'uber' | 'doordash' =>
  provider === 'uber_eats' ? 'uber' : 'doordash';
