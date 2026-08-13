import type { StatusTone } from '@components/ui/StatusBadge';
import type { ImportTaskId } from '@components/upload/ImportTaskCard';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import type { GmailConnectionStatus, ImportPreferencesResponse } from '@services/gmailApi';

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
  exportFileReady: boolean;
  exportRequested: boolean;
  showDownloadGuide: boolean;
}

interface ResolveImportFlowInput {
  preferences: ImportPreferencesResponse | null;
  gmailStatus: GmailConnectionStatus;
  localExportComplete: boolean;
  gmailImportSucceeded: boolean;
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
    input.gmailImportSucceeded
    || preferences?.gmailImport.hasImported
    || preferences?.coverage.hasEmailData
  );
  const exportComplete = Boolean(
    input.localExportComplete
    || preferences?.export.status === 'completed'
    || preferences?.coverage.hasExportData
  );
  const exportFileReady = preferences?.export.status === 'file_ready';
  const exportRequested = preferences?.export.status === 'requested_monitoring_enabled'
    || preferences?.export.status === 'requested_monitoring_disabled';

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

  const exportImport: ImportTaskState = exportComplete
    ? { complete: true, label: 'Complete', tone: 'complete' }
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
    exportFileReady,
    exportRequested,
    showDownloadGuide: Boolean(preferences && !['not_started', 'completed'].includes(preferences.export.status)),
  };
}
