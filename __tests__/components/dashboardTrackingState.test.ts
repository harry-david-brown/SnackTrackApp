import { resolveDashboardTrackingState } from '@components/dashboard/dashboardTrackingState';
import type { ImportPreferencesResponse } from '@services/gmailApi';

const preferences = (): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canMonitor: false },
  },
  export: {
    status: 'not_started', requestedAt: null, updatedAt: null,
    providers: {
      uberEats: { provider: 'uber_eats', status: 'not_started', requestedAt: null, updatedAt: null, errorCode: null },
      doorDash: { provider: 'doordash', status: 'not_started', requestedAt: null, updatedAt: null, errorCode: null },
    },
  },
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
    exportProviders: {
      uberEats: { receiptCount: 0, hasData: false },
      doorDash: { receiptCount: 0, hasData: false },
    },
  },
});

describe('dashboard tracking state resolver', () => {
  const completeBothExports = (value: ImportPreferencesResponse) => {
    value.export.status = 'completed';
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = { hasData: true, receiptCount: 20 };
    value.coverage.exportProviders.doorDash = { hasData: true, receiptCount: 20 };
  };

  it('starts with a source choice and advances to ongoing updates after Gmail', () => {
    const initial = preferences();
    expect(resolveDashboardTrackingState(initial, false).id).toBe('choose_import_source');
    expect(resolveDashboardTrackingState(initial, false).primaryAction).toBe('open_import');

    initial.gmailImport = { ...initial.gmailImport, status: 'completed', hasImported: true, receiptCount: 3 };
    initial.coverage = { ...initial.coverage, hasEmailData: true, emailReceiptCount: 3 };
    initial.ongoingTracking.capability = { gmailConnected: true, durableAccess: true, canTrack: true };
    expect(resolveDashboardTrackingState(initial, false).id).toBe('enable_tracking');
  });

  it.each([
    ['file_ready', 'export_ready_uber_eats'],
    ['import_processing', 'export_processing_uber_eats'],
    ['failed', 'export_failed_uber_eats'],
  ] as const)('maps export status %s to %s', (status, expected) => {
    const value = preferences();
    value.export.status = status;
    value.export.providers!.uberEats.status = status;
    expect(resolveDashboardTrackingState(value, false).id).toBe(expected);
  });

  it.each(['requested_monitoring_enabled', 'requested_monitoring_disabled'] as const)(
    'keeps useful setup primary while export status %s remains visible',
    (status) => {
      const value = preferences();
      value.export.status = status;
      value.export.providers!.uberEats.status = 'requested';
      if (status === 'requested_monitoring_enabled') value.monitoring.effectiveState = 'enabled';
      const result = resolveDashboardTrackingState(value, false);
      expect(result.id).toBe('choose_import_source');
      expect(result.progress?.id).toBe('uber_export_requested');
    },
  );

  it('asks for explicit tracking permission after both imports', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    completeBothExports(value);
    value.ongoingTracking.capability = { gmailConnected: true, durableAccess: true, canTrack: true };
    expect(resolveDashboardTrackingState(value, false).id).toBe('enable_tracking');
  });

  it('moves email to ongoing setup after one provider is imported', () => {
    const value = preferences();
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = { hasData: true, receiptCount: 20 };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe('history_complete_optional_freshness');
    expect(resolved.title).toBe('Uber Eats export is included');
    expect(resolved.primaryAction).toBe('connect_gmail');
    expect(resolved.primaryLabel).toBe('Connect Gmail for updates');
    expect(resolved.primaryProvider).toBeUndefined();
  });

  it('names a failed provider without hiding the completed provider', () => {
    const value = preferences();
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = { hasData: true, receiptCount: 20 };
    value.export.providers!.doorDash.status = 'failed';

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe('export_failed_doordash');
    expect(resolved.title).toContain('DoorDash');
    expect(resolved.primaryProvider).toBe('doordash');
  });

  it('offers ongoing updates directly when both exports and durable Gmail access exist', () => {
    const value = preferences();
    completeBothExports(value);
    value.coverage.exportReceiptCount = 942;
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe('history_complete_optional_freshness');
    expect(resolved.title).toBe('Both provider exports are included');
    expect(resolved.primaryAction).toBe('enable_tracking');
    expect(resolved.primaryLabel).toBe('Enable ongoing updates');
  });

  it('shows a passive active state only when tracking is actually active', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    completeBothExports(value);
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
    completeBothExports(value);
    value.ongoingTracking.consentState = 'granted';
    value.ongoingTracking.effectiveState = 'reconnect_required';
    expect(resolveDashboardTrackingState(value, false).id).toBe('tracking_reconnect');
  });

  it('turns an invalid Gmail grant into an explicit reconnect action', () => {
    const value = preferences();
    completeBothExports(value);
    value.gmailImport = {
      ...value.gmailImport,
      status: 'failed',
      errorCode: 'GMAIL_RECONNECT_REQUIRED',
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.title).toBe('Reconnect Gmail to continue');
    expect(resolved.primaryLabel).toBe('Reconnect Gmail');
  });

  it('prioritizes proactively validated reconnect health over active tracking', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true };
    completeBothExports(value);
    value.ongoingTracking = {
      ...value.ongoingTracking,
      consentState: 'granted',
      status: 'active',
      effectiveState: 'active',
      capability: {
        gmailConnected: true,
        durableAccess: false,
        canTrack: false,
        needsReconnect: true,
        connectionHealth: 'reconnect_required',
      },
    };

    const resolved = resolveDashboardTrackingState(value, false);
    expect(resolved.id).toBe('gmail_connection_reconnect');
    expect(resolved.primaryAction).toBe('connect_gmail');
  });
});
