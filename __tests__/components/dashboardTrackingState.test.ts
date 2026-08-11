import { resolveDashboardTrackingState } from '../../components/dashboard/dashboardTrackingState';
import type { ImportPreferencesResponse } from '../../services/gmailApi';

const preferences = (): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canMonitor: false },
  },
  export: { status: 'not_started', requestedAt: null, updatedAt: null },
  gmailImport: {
    status: 'never_started', updatedAt: null, importedCount: 0, errorCode: null,
    receiptCount: 0, hasImported: false,
  },
  ongoingTracking: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    status: 'inactive', effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canTrack: false },
    activity: {
      lastCheckAttemptAt: null, lastSuccessfulCheckAt: null, lastStatsUpdatedAt: null,
      lastNewOrderAt: null, ordersAddedThisWeek: 0, lastErrorAt: null, lastErrorCode: null,
    },
  },
  coverage: {
    emailReceiptCount: 0, exportReceiptCount: 0, hasEmailData: false, hasExportData: false,
  },
});

describe('dashboard tracking state resolver', () => {
  it('starts with Gmail and advances to the export path', () => {
    const initial = preferences();
    expect(resolveDashboardTrackingState(initial, false).id).toBe('connect_gmail');

    initial.gmailImport = { ...initial.gmailImport, status: 'completed', hasImported: true, receiptCount: 3 };
    initial.coverage = { ...initial.coverage, hasEmailData: true, emailReceiptCount: 3 };
    expect(resolveDashboardTrackingState(initial, false).id).toBe('sparse_export');
  });

  it.each([
    ['requested_monitoring_enabled', 'requested_monitoring_enabled'],
    ['requested_monitoring_disabled', 'requested_monitoring_disabled'],
    ['file_ready', 'export_ready'],
    ['import_processing', 'export_processing'],
    ['failed', 'export_failed'],
  ] as const)('maps export status %s to %s', (status, expected) => {
    const value = preferences();
    value.export.status = status;
    expect(resolveDashboardTrackingState(value, false).id).toBe(expected);
  });

  it('asks for explicit tracking permission after both imports', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    value.export.status = 'completed';
    value.coverage.hasExportData = true;
    value.ongoingTracking.capability = { gmailConnected: true, durableAccess: true, canTrack: true };
    expect(resolveDashboardTrackingState(value, false).id).toBe('enable_tracking');
  });

  it('shows a passive active state only when tracking is actually active', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    value.export.status = 'completed';
    value.coverage.hasExportData = true;
    value.ongoingTracking.capability = { gmailConnected: true, durableAccess: true, canTrack: true };
    value.ongoingTracking.consentState = 'granted';
    value.ongoingTracking.effectiveState = 'active';
    value.ongoingTracking.status = 'active';
    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe('tracking_active');
    expect(resolved.passive).toBe(true);
    expect(resolved.primaryAction).toBeUndefined();
  });

  it('prioritizes repair states over the completed experience', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    value.export.status = 'completed';
    value.coverage.hasExportData = true;
    value.ongoingTracking.consentState = 'granted';
    value.ongoingTracking.effectiveState = 'reconnect_required';
    expect(resolveDashboardTrackingState(value, false).id).toBe('tracking_reconnect');
  });
});
