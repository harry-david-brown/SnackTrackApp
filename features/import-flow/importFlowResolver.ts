import type { StatusTone } from '@components/ui/StatusBadge';
import type { ImportTaskId } from '@components/upload/ImportTaskCard';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import type { ExportProvider, GmailConnectionStatus, ImportPreferencesResponse, OutlookConnectionStatus } from './contracts';
import { resolveTrackingEligibility, type TrackingEligibility } from './trackingEligibility';
import { resolveExportOpportunity, resolveImportCoverage, resolveImportSetupRecommendation, type ImportSetupRecommendation } from './importJourneyState';
import { resolveGmailBaselineState } from './gmailBaselineState';

export interface ImportTaskState {
  complete: boolean;
  label: string;
  tone: StatusTone;
}

export interface ImportFlowState {
  connectEmail: ImportTaskState;
  gmailImport: ImportTaskState;
  exportImport: ImportTaskState;
  initialOpenTask: ImportTaskId | null;
  hasConnectedEmail: boolean;
  needsReconnect: boolean;
  gmailTemporarilyUnavailable: boolean;
  canImportFromGmail: boolean;
  canImportFromOutlook: boolean;
  gmailConnected: boolean;
  outlookConnected: boolean;
  gmailEmail: string | null;
  outlookEmail: string | null;
  gmailNeedsReconnect: boolean;
  outlookNeedsReconnect: boolean;
  outlookTemporarilyUnavailable: boolean;
  hasImportedEmailData: boolean;
  showGmailImportSection: boolean;
  showOneTimeGmailImport: boolean;
  exportComplete: boolean;
  hasAnyExportData: boolean;
  gmailImportPresentation: {
    title: string;
    description: string;
    idleButtonLabel: string;
    disconnectedHelper: string;
    passive: boolean;
  };
  exportProviderProgress: {
    importedCount: 0 | 1 | 2;
    uberEats: { imported: boolean; receiptCount: number; status: string };
    doorDash: { imported: boolean; receiptCount: number; status: string };
  };
  exportFileReady: boolean;
  exportReadyProvider: ExportProvider | null;
  exportRequested: boolean;
  showDownloadGuide: boolean;
  trackingEligibility: TrackingEligibility;
  setupRecommendation: ImportSetupRecommendation;
}

interface ResolveImportFlowInput {
  preferences: ImportPreferencesResponse | null;
  gmailStatus: GmailConnectionStatus;
  outlookStatus?: OutlookConnectionStatus;
  downloadState: ExportDownloadHandoffState;
  gmailFeatureEnabled: boolean;
  focusExport: boolean;
  showExportTutorial: boolean;
}

export function resolveImportFlowState(input: ResolveImportFlowInput): ImportFlowState {
  const { preferences, gmailStatus } = input;
  const outlookStatus = input.outlookStatus ?? {
    provider: 'microsoft' as const,
    connected: false,
    email: null,
    canImport: false,
    needsReconnect: false,
    connectionMode: 'none' as const,
    scopes: [],
    hasRequiredScope: false,
    expiresAt: null,
    statusMessage: 'Connect Outlook to import receipts.',
    connectionHealth: 'disconnected' as const,
    lastValidatedAt: null,
  };
  const canImportFromGmail = gmailStatus.canImport !== false;
  const canImportFromOutlook = outlookStatus.canImport;
  const gmailNeedsReconnect = gmailStatus.connected && Boolean(
    gmailStatus.needsReconnect || gmailStatus.connectionHealth === 'reconnect_required'
  );
  const outlookNeedsReconnect = outlookStatus.connected && Boolean(
    outlookStatus.needsReconnect || outlookStatus.connectionHealth === 'reconnect_required'
  );
  const gmailTemporarilyUnavailable = gmailStatus.connected
    && gmailStatus.connectionHealth === 'unavailable';
  const outlookTemporarilyUnavailable = outlookStatus.connected
    && outlookStatus.connectionHealth === 'unavailable';
  const gmailUsable = gmailStatus.connected && canImportFromGmail && !gmailNeedsReconnect;
  const outlookUsable = outlookStatus.connected && canImportFromOutlook && !outlookNeedsReconnect;
  const hasConnectedEmail = gmailStatus.connected || outlookStatus.connected;
  const needsReconnect = hasConnectedEmail && !gmailUsable && !outlookUsable
    && (gmailNeedsReconnect || outlookNeedsReconnect);
  const gmailBaseline = resolveGmailBaselineState(preferences);
  const coverage = resolveImportCoverage(preferences);
  const outlookBaseline = preferences?.outlookBaseline;
  const hasImportedEmailData = gmailBaseline.hasCompleted
    || Boolean(outlookBaseline?.hasCompleted)
    || coverage.hasEmailCoverage;
  const lastGmailCheckFailed = gmailBaseline.latestAttempt.status === 'failed'
    || outlookBaseline?.latestAttempt.status === 'failed';
  const exportComplete = coverage.allProvidersImported;
  const showOneTimeGmailImport = !coverage.hasAnyExportData;
  const showGmailImportSection = hasImportedEmailData || showOneTimeGmailImport;
  const importedProviderCount = coverage.importedProviderCount;
  const uberEatsImported = coverage.providers.uberEats.imported;
  const doorDashImported = coverage.providers.doorDash.imported;
  const uberExportStatus = coverage.providers.uberEats.status;
  const doorDashExportStatus = coverage.providers.doorDash.status;
  const exportReadyProvider = uberExportStatus === 'file_ready'
    ? 'uber_eats'
    : doorDashExportStatus === 'file_ready'
      ? 'doordash'
      : null;
  const exportFileReady = exportReadyProvider !== null;
  const exportRequested = uberExportStatus === 'requested' || doorDashExportStatus === 'requested';
  const exportOpportunity = resolveExportOpportunity(coverage);
  const hasHistoricalExport = coverage.hasAnyExportData;
  const setupRecommendation = resolveImportSetupRecommendation({
    preferences,
    gmailFeatureEnabled: input.gmailFeatureEnabled,
    gmailConnected: hasConnectedEmail,
    gmailNeedsReconnect: needsReconnect,
  });

  const connectEmail: ImportTaskState = hasConnectedEmail && !needsReconnect
    ? { complete: true, label: 'Connected', tone: 'complete' }
    : needsReconnect
      ? { complete: false, label: 'Reconnect', tone: 'warning' }
      : { complete: false, label: hasHistoricalExport ? 'Optional' : 'Available', tone: 'optional' };

  const gmailImport: ImportTaskState = hasImportedEmailData
    ? lastGmailCheckFailed
      ? { complete: true, label: 'Retry available', tone: 'warning' }
      : { complete: true, label: 'Checked', tone: 'complete' }
    : needsReconnect
      ? { complete: false, label: 'Reconnect email first', tone: 'warning' }
      : gmailTemporarilyUnavailable
        ? { complete: false, label: 'Temporarily unavailable', tone: 'warning' }
      : hasConnectedEmail
        ? { complete: false, label: exportComplete ? 'Optional extra' : hasHistoricalExport ? 'Optional update' : 'Recommended', tone: hasHistoricalExport ? 'optional' : 'recommended' }
        : { complete: false, label: hasHistoricalExport ? 'Optional' : 'Available', tone: 'optional' };

  const emailReceiptCount = preferences?.coverage.emailReceiptCount
    ?? gmailBaseline.latestAttempt.importedCount
      + (outlookBaseline?.latestAttempt.importedCount ?? 0);
  const gmailImportPresentation = {
    title: hasImportedEmailData ? 'Email history checked' : 'Import delivery data',
    description: hasImportedEmailData
      ? lastGmailCheckFailed
        ? 'Your imported email history is safe, but the latest manual check failed. Try again when you’re ready.'
        : emailReceiptCount > 0
          ? `${emailReceiptCount} email order${emailReceiptCount === 1 ? '' : 's'} included in your stats.`
          : 'Your connected email history was checked. No supported delivery receipts were found.'
      : 'Pull delivery receipts from Gmail or Outlook.',
    idleButtonLabel: lastGmailCheckFailed ? 'Try checking again' : 'Import receipts',
    disconnectedHelper: 'Connect Gmail or Outlook first, then choose when to scan your delivery receipts.',
    passive: hasImportedEmailData
      && !lastGmailCheckFailed
      && (!gmailStatus.connected || gmailBaseline.hasCompleted)
      && (!outlookStatus.connected || Boolean(outlookBaseline?.hasCompleted)),
  };

  const providerLifecycleNeedsAttention = [uberExportStatus, doorDashExportStatus]
    .some((status) => ['requested', 'file_ready', 'import_processing', 'failed'].includes(status));
  const exportImport: ImportTaskState = exportFileReady
    ? { complete: false, label: input.downloadState === 'downloaded' ? 'Ready to upload' : 'Ready to download', tone: 'recommended' }
    : [uberExportStatus, doorDashExportStatus].includes('import_processing')
      ? { complete: false, label: 'Updating', tone: 'recommended' }
      : [uberExportStatus, doorDashExportStatus].includes('failed')
        ? { complete: false, label: 'Needs attention', tone: 'warning' }
        : [uberExportStatus, doorDashExportStatus].includes('requested')
          ? { complete: false, label: `${importedProviderCount} of 2 imported · update requested`, tone: 'optional' }
    : importedProviderCount === 2 && !providerLifecycleNeedsAttention
      ? { complete: true, label: '2 of 2 imported', tone: 'complete' }
    : importedProviderCount === 1
      ? { complete: false, label: '1 of 2 imported', tone: 'optional' }
      : exportRequested
        ? { complete: false, label: 'Requested', tone: 'optional' }
        : { complete: false, label: hasImportedEmailData ? 'Optional next step' : 'Optional', tone: 'optional' };

  let initialOpenTask: ImportTaskId | null = null;
  if (input.focusExport || input.showExportTutorial) initialOpenTask = 'uber_export';
  else if (exportFileReady || exportOpportunity?.status === 'failed' || exportOpportunity?.status === 'import_processing') initialOpenTask = 'uber_export';
  else if (lastGmailCheckFailed && showOneTimeGmailImport) initialOpenTask = 'gmail_import';
  else if (needsReconnect && !hasImportedEmailData && !hasHistoricalExport) initialOpenTask = 'connect_email';
  else if (setupRecommendation.kind === 'connect_email') initialOpenTask = 'connect_email';
  else if (setupRecommendation.kind === 'scan_email') initialOpenTask = 'gmail_import';
  else if (setupRecommendation.kind === 'provider') initialOpenTask = 'uber_export';

  return {
    connectEmail,
    gmailImport,
    exportImport,
    initialOpenTask,
    hasConnectedEmail,
    needsReconnect,
    gmailTemporarilyUnavailable,
    canImportFromGmail,
    canImportFromOutlook,
    gmailConnected: gmailStatus.connected,
    outlookConnected: outlookStatus.connected,
    gmailEmail: gmailStatus.email ?? null,
    outlookEmail: outlookStatus.email,
    gmailNeedsReconnect,
    outlookNeedsReconnect,
    outlookTemporarilyUnavailable,
    hasImportedEmailData,
    showGmailImportSection,
    showOneTimeGmailImport,
    exportComplete,
    hasAnyExportData: coverage.hasAnyExportData,
    gmailImportPresentation,
    exportProviderProgress: {
      importedCount: importedProviderCount,
      uberEats: {
        imported: uberEatsImported,
        receiptCount: preferences?.coverage.exportProviders.uberEats.receiptCount ?? 0,
        status: uberExportStatus ?? 'not_started',
      },
      doorDash: {
        imported: doorDashImported,
        receiptCount: preferences?.coverage.exportProviders.doorDash.receiptCount ?? 0,
        status: doorDashExportStatus ?? 'not_started',
      },
    },
    exportFileReady,
    exportReadyProvider,
    exportRequested,
    showDownloadGuide: Boolean(preferences && (
      uberExportStatus && !['not_started', 'completed'].includes(uberExportStatus)
      || doorDashExportStatus && !['not_started', 'completed'].includes(doorDashExportStatus)
    )),
    trackingEligibility: resolveTrackingEligibility(preferences),
    setupRecommendation,
  };
}
