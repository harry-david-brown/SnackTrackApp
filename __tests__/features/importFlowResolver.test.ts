import { resolveImportFlowState } from '@features/import-flow/importFlowResolver';
import { parseImportRouteParams } from '@features/import-flow/importRouteParams';
import type { ExportLifecycleStatus, ImportPreferencesResponse, MonitoringConsentState } from '@services/gmailApi';

function preferences(
  exportStatus: ExportLifecycleStatus = 'not_started',
  consentState: MonitoringConsentState = 'not_offered',
  overrides: {
    hasEmailData?: boolean;
    hasExportData?: boolean;
    hasUberEatsExportData?: boolean;
    hasDoorDashExportData?: boolean;
    hasImported?: boolean;
  } = {}
): ImportPreferencesResponse {
  const hasUberEatsExportData = overrides.hasUberEatsExportData ?? false;
  const hasDoorDashExportData = overrides.hasDoorDashExportData ?? false;
  const hasExportData = overrides.hasExportData ?? (hasUberEatsExportData || hasDoorDashExportData);
  const providerStatus = exportStatus === 'requested_monitoring_enabled'
    || exportStatus === 'requested_monitoring_disabled'
    ? 'requested'
    : exportStatus;
  return {
    monitoring: {
      consentState, consentVersion: null, consentedAt: null, revokedAt: null,
      effectiveState: consentState === 'granted' ? 'enabled' : consentState === 'revoked' ? 'disabled' : consentState,
      capability: { gmailConnected: true, durableAccess: true, canMonitor: true },
    },
    export: {
      status: exportStatus,
      requestedAt: null,
      updatedAt: null,
      providers: {
        uberEats: {
          provider: 'uber_eats', status: providerStatus,
          requestedAt: null, updatedAt: null, errorCode: null,
        },
        doorDash: {
          provider: 'doordash', status: hasDoorDashExportData ? 'completed' : 'not_started',
          requestedAt: null, updatedAt: null, errorCode: null,
        },
      },
    },
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
      exportReceiptCount: Number(hasUberEatsExportData) + Number(hasDoorDashExportData),
      hasEmailData: overrides.hasEmailData ?? false,
      hasExportData,
      exportProviders: {
        uberEats: { receiptCount: hasUberEatsExportData ? 1 : 0, hasData: hasUberEatsExportData },
        doorDash: { receiptCount: hasDoorDashExportData ? 1 : 0, hasData: hasDoorDashExportData },
      },
    },
  };
}

const baseInput = {
  gmailStatus: { connected: true, canImport: true },
  downloadState: 'not_downloaded' as const,
  gmailFeatureEnabled: true,
  focusExport: false,
  showExportTutorial: false,
};

describe('parseImportRouteParams', () => {
  it('normalizes arrays, flags, and unsupported focus values', () => {
    expect(parseImportRouteParams({
      showExportTutorial: 'true', focus: 'gmail', downloadedVersion: 'ready-1',
    })).toEqual({
      showExportTutorial: true,
      focus: null, downloadedVersion: 'ready-1',
      action: null, intentId: null,
      provider: null, gmailPurpose: null,
    });
  });

  it('accepts only supported one-shot import actions', () => {
    expect(parseImportRouteParams({
      action: 'connect_gmail', intentId: 'intent-1', provider: 'doordash', gmailPurpose: 'ongoing_tracking',
    })).toMatchObject({
      action: 'connect_gmail', intentId: 'intent-1', provider: 'doordash', gmailPurpose: 'ongoing_tracking',
    });
    expect(parseImportRouteParams({ action: 'delete_everything', intentId: 'intent-2' })).toMatchObject({
      action: null, intentId: 'intent-2',
    });
  });
});

describe('resolveImportFlowState', () => {
  it.each([
    ['disconnected', { connected: false }, 'Available', null],
    ['healthy', { connected: true, canImport: true }, 'Connected', 'gmail_import'],
    ['temporarily unavailable', { connected: true, canImport: false, connectionHealth: 'unavailable' as const }, 'Connected', 'gmail_import'],
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
      expect(result.exportComplete).toBe(false);
      expect(result.exportFileReady).toBe(status === 'file_ready');
    }
  });

  it('lets actual source coverage outrank stale lifecycle rows', () => {
    const result = resolveImportFlowState({
      ...baseInput,
      preferences: preferences('not_started', 'not_offered', {
        hasEmailData: true,
        hasUberEatsExportData: true,
        hasDoorDashExportData: true,
      }),
    });
    expect(result.gmailImport.complete).toBe(true);
    expect(result.exportImport.complete).toBe(true);
    expect(result.showOneTimeGmailImport).toBe(false);
    expect(result.initialOpenTask).toBeNull();
  });

  it('removes the separate Gmail history action after both exports cover history', () => {
    const result = resolveImportFlowState({
      ...baseInput,
      preferences: preferences('completed', 'not_offered', {
        hasUberEatsExportData: true,
        hasDoorDashExportData: true,
      }),
    });

    expect(result.exportComplete).toBe(true);
    expect(result.showOneTimeGmailImport).toBe(false);
    expect(result.setupRecommendation).toEqual({ kind: 'enable_tracking' });
    expect(result.initialOpenTask).toBeNull();
  });

  it('keeps the export task actionable after only one provider is imported', () => {
    const result = resolveImportFlowState({
      ...baseInput,
      preferences: preferences('completed', 'not_offered', {
        hasEmailData: true,
        hasImported: true,
        hasUberEatsExportData: true,
      }),
    });

    expect(result.exportImport).toEqual({
      complete: false,
      label: '1 of 2 imported',
      tone: 'optional',
    });
    expect(result.showOneTimeGmailImport).toBe(false);
    expect(result.showGmailImportSection).toBe(true);
    expect(result.gmailImportPresentation).toMatchObject({
      title: 'Email history checked',
      passive: true,
    });
    expect(result.exportProviderProgress).toMatchObject({
      importedCount: 1,
      uberEats: { imported: true },
      doorDash: { imported: false },
    });
    expect(result.initialOpenTask).toBeNull();
  });

  it('renders completed Gmail history as a passive status instead of another scan action', () => {
    const result = resolveImportFlowState({
      ...baseInput,
      preferences: preferences('not_started', 'not_offered', {
        hasEmailData: true,
        hasImported: true,
      }),
    });

    expect(result.gmailImport).toEqual({ complete: true, label: 'Checked', tone: 'complete' });
    expect(result.gmailImportPresentation).toMatchObject({
      title: 'Email history checked',
      passive: true,
    });
    expect(result.gmailImportPresentation.idleButtonLabel).not.toContain('Check Gmail now');
    expect(result.setupRecommendation).toEqual({ kind: 'enable_tracking' });
    expect(result.initialOpenTask).toBeNull();
  });

  it('focuses the export task for either export route intent', () => {
    expect(resolveImportFlowState({ ...baseInput, preferences: preferences(), focusExport: true }).initialOpenTask).toBe('uber_export');
    expect(resolveImportFlowState({ ...baseInput, preferences: preferences(), showExportTutorial: true }).initialOpenTask).toBe('uber_export');
  });
});
