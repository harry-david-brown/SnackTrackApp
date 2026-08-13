import { resolveImportFlowState } from '../../features/import-flow/importFlowResolver';
import { parseImportRouteParams } from '../../features/import-flow/importRouteParams';
import type { ExportLifecycleStatus, ImportPreferencesResponse, MonitoringConsentState } from '../../services/gmailApi';

function preferences(
  exportStatus: ExportLifecycleStatus = 'not_started',
  consentState: MonitoringConsentState = 'not_offered',
  overrides: { hasEmailData?: boolean; hasExportData?: boolean; hasImported?: boolean } = {}
): ImportPreferencesResponse {
  return {
    monitoring: {
      consentState, consentVersion: null, consentedAt: null, revokedAt: null,
      effectiveState: consentState === 'granted' ? 'enabled' : consentState === 'revoked' ? 'disabled' : consentState,
      capability: { gmailConnected: true, durableAccess: true, canMonitor: true },
    },
    export: { status: exportStatus, requestedAt: null, updatedAt: null },
    gmailImport: {
      status: overrides.hasImported ? 'completed' : 'never_started', updatedAt: null,
      importedCount: 0, errorCode: null, receiptCount: 0, hasImported: overrides.hasImported ?? false,
    },
    ongoingTracking: {
      consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
      status: 'inactive', effectiveState: 'not_offered',
      capability: { gmailConnected: true, durableAccess: true, canTrack: true },
      activity: {
        lastCheckAttemptAt: null, lastSuccessfulCheckAt: null, lastStatsUpdatedAt: null,
        lastNewOrderAt: null, ordersAddedThisWeek: 0, lastErrorAt: null, lastErrorCode: null,
      },
    },
    coverage: {
      emailReceiptCount: overrides.hasEmailData ? 1 : 0,
      exportReceiptCount: overrides.hasExportData ? 1 : 0,
      hasEmailData: overrides.hasEmailData ?? false,
      hasExportData: overrides.hasExportData ?? false,
    },
  };
}

const baseInput = {
  gmailStatus: { connected: true, canImport: true },
  localExportComplete: false,
  gmailImportSucceeded: false,
  downloadState: 'not_downloaded' as const,
  gmailFeatureEnabled: true,
  focusExport: false,
  showExportTutorial: false,
};

describe('parseImportRouteParams', () => {
  it('normalizes arrays, flags, and unsupported focus values', () => {
    expect(parseImportRouteParams({
      autoImportGmail: ['true'], autoImportFlowId: ['flow-1', 'ignored'],
      showExportTutorial: 'true', focus: 'gmail', downloadedVersion: 'ready-1',
    })).toEqual({
      autoImportGmail: true, autoImportFlowId: 'flow-1', showExportTutorial: true,
      focus: null, downloadedVersion: 'ready-1',
    });
  });
});

describe('resolveImportFlowState', () => {
  it.each([
    ['disconnected', { connected: false }, 'Recommended', 'connect_email'],
    ['healthy', { connected: true, canImport: true }, 'Complete', 'gmail_import'],
    ['temporarily unavailable', { connected: true, canImport: false, connectionHealth: 'unavailable' as const }, 'Complete', 'gmail_import'],
    ['reconnect required', { connected: true, canImport: false, connectionHealth: 'reconnect_required' as const }, 'Reconnect', 'connect_email'],
  ])('handles %s Gmail state', (_name, gmailStatus, label, openTask) => {
    const result = resolveImportFlowState({ ...baseInput, gmailStatus, preferences: preferences() });
    expect(result.connectEmail.label).toBe(label);
    expect(result.initialOpenTask).toBe(openTask);
  });

  it.each([
    'not_started', 'requested_monitoring_enabled', 'requested_monitoring_disabled',
    'file_ready', 'import_processing', 'completed', 'failed',
  ] as ExportLifecycleStatus[])('resolves export lifecycle %s for every consent choice', (status) => {
    for (const consent of ['not_offered', 'declined', 'granted', 'revoked'] as MonitoringConsentState[]) {
      const result = resolveImportFlowState({ ...baseInput, preferences: preferences(status, consent) });
      expect(result.exportComplete).toBe(status === 'completed');
      expect(result.exportFileReady).toBe(status === 'file_ready');
    }
  });

  it('lets actual source coverage outrank stale lifecycle rows', () => {
    const result = resolveImportFlowState({
      ...baseInput,
      preferences: preferences('not_started', 'not_offered', { hasEmailData: true, hasExportData: true }),
    });
    expect(result.gmailImport.complete).toBe(true);
    expect(result.exportImport.complete).toBe(true);
    expect(result.initialOpenTask).toBeNull();
  });

  it('focuses the export task for either export route intent', () => {
    expect(resolveImportFlowState({ ...baseInput, preferences: preferences(), focusExport: true }).initialOpenTask).toBe('uber_export');
    expect(resolveImportFlowState({ ...baseInput, preferences: preferences(), showExportTutorial: true }).initialOpenTask).toBe('uber_export');
  });
});
