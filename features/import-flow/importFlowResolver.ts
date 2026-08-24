import type { StatusTone } from '@components/ui/StatusBadge';
import type { ImportTaskId } from '@components/upload/ImportTaskCard';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import type { GmailConnectionStatus, ImportPreferencesResponse } from '@services/gmailApi';
import { resolveTrackingEligibility, type TrackingEligibility } from './trackingEligibility';

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
  hasImportedEmailData: boolean;
  exportComplete: boolean;
  exportProviderProgress: {
    importedCount: 0 | 1 | 2;
    uberEats: { imported: boolean; receiptCount: number; status: string };
    doorDash: { imported: boolean; receiptCount: number; status: string };
  };
  exportFileReady: boolean;
  exportRequested: boolean;
  showDownloadGuide: boolean;
  trackingEligibility: TrackingEligibility;
}

interface ResolveImportFlowInput {
  preferences: ImportPreferencesResponse | null;
  gmailStatus: GmailConnectionStatus;
  localExportComplete: boolean;
  downloadState: ExportDownloadHandoffState;
  gmailFeatureEnabled: boolean;
  focusExport: boolean;
  showExportTutorial: boolean;
}

export function resolveImportFlowState(input: ResolveImportFlowInput): ImportFlowState {
  const { preferences, gmailStatus } = input;
  const hasConnectedEmail = gmailStatus.connected;
  const canImportFromGmail = gmailStatus.canImport !== false;
  const needsReconnect = hasConnectedEmail && Boolean(
    gmailStatus.needsReconnect || gmailStatus.connectionHealth === 'reconnect_required'
  );
  const gmailTemporarilyUnavailable = hasConnectedEmail
    && gmailStatus.connectionHealth === 'unavailable';
  const hasImportedEmailData = Boolean(
    preferences?.gmailImport.hasImported
    || preferences?.coverage.hasEmailData
  );
  const exportComplete = Boolean(
    input.localExportComplete
    || preferences?.export.status === 'completed'
    || preferences?.coverage.hasExportData
  );
  const uberEatsImported = preferences?.coverage.exportProviders.uberEats.hasData ?? false;
  const doorDashImported = preferences?.coverage.exportProviders.doorDash.hasData ?? false;
  const importedProviderCount = (
    Number(uberEatsImported) + Number(doorDashImported)
  ) as 0 | 1 | 2;
  const uberExportStatus = preferences?.export.providers?.uberEats.status;
  const doorDashExportStatus = preferences?.export.providers?.doorDash.status;
  const exportFileReady = uberExportStatus === 'file_ready';
  const exportRequested = uberExportStatus === 'requested' || doorDashExportStatus === 'requested';

  const connectEmail: ImportTaskState = hasConnectedEmail && !needsReconnect
    ? { complete: true, label: 'Complete', tone: 'complete' }
    : needsReconnect
      ? { complete: false, label: 'Reconnect', tone: 'warning' }
      : { complete: false, label: 'Recommended', tone: 'recommended' };

  const gmailImport: ImportTaskState = hasImportedEmailData
    ? { complete: true, label: 'Complete', tone: 'complete' }
    : needsReconnect
      ? { complete: false, label: 'Reconnect email first', tone: 'warning' }
      : gmailTemporarilyUnavailable
        ? { complete: false, label: 'Temporarily unavailable', tone: 'warning' }
      : hasConnectedEmail
        ? { complete: false, label: 'Recommended', tone: 'recommended' }
        : { complete: false, label: 'Connect email first', tone: 'recommended' };

  const exportImport: ImportTaskState = importedProviderCount === 2
    ? { complete: true, label: '2 of 2 imported', tone: 'complete' }
    : importedProviderCount === 1
      ? { complete: false, label: '1 of 2 imported', tone: 'optional' }
    : exportFileReady
      ? {
          complete: false,
          label: input.downloadState === 'downloaded' ? 'Ready to upload' : 'Ready to download',
          tone: 'recommended',
        }
      : exportRequested
        ? { complete: false, label: 'Requested', tone: 'optional' }
        : { complete: false, label: hasImportedEmailData ? 'Optional next step' : 'Optional', tone: 'optional' };

  let initialOpenTask: ImportTaskId | null = null;
  if (input.focusExport || input.showExportTutorial) initialOpenTask = 'uber_export';
  else if (!input.gmailFeatureEnabled) initialOpenTask = exportComplete ? null : 'uber_export';
  else if (!hasConnectedEmail || needsReconnect) initialOpenTask = 'connect_email';
  else if (!hasImportedEmailData) initialOpenTask = 'gmail_import';
  else if (!exportComplete) initialOpenTask = 'uber_export';

  return {
    connectEmail,
    gmailImport,
    exportImport,
    initialOpenTask,
    hasConnectedEmail,
    needsReconnect,
    gmailTemporarilyUnavailable,
    canImportFromGmail,
    hasImportedEmailData,
    exportComplete,
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
    exportRequested,
    showDownloadGuide: Boolean(preferences && (
      uberExportStatus && !['not_started', 'completed'].includes(uberExportStatus)
      || doorDashExportStatus && !['not_started', 'completed'].includes(doorDashExportStatus)
    )),
    trackingEligibility: resolveTrackingEligibility(preferences),
  };
}
