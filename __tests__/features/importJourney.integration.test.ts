import { resolveDashboardTrackingState } from '@components/dashboard/dashboardTrackingState';
import { resolvePostWrappedExperience } from '@components/wrapped/postWrappedState';
import { resolveImportFlowState } from '@features/import-flow/importFlowResolver';
import type { GmailConnectionStatus, ImportPreferencesResponse } from '@services/gmailApi';

const preferences = (): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    effectiveState: 'not_offered', capability: { gmailConnected: false, durableAccess: false, canMonitor: false },
  },
  export: { status: 'not_started', requestedAt: null, updatedAt: null },
  gmailImport: { status: 'never_started', updatedAt: null, importedCount: 0, errorCode: null, receiptCount: 0, hasImported: false },
  ongoingTracking: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    status: 'inactive', effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canTrack: false },
    activity: {
      lastCheckAttemptAt: null, lastSuccessfulCheckAt: null, lastStatsUpdatedAt: null,
      lastNewOrderAt: null, ordersAddedThisWeek: 0, lastErrorAt: null, lastErrorCode: null,
    },
  },
  coverage: { emailReceiptCount: 0, exportReceiptCount: 0, hasEmailData: false, hasExportData: false },
});

const resolveUpload = (value: ImportPreferencesResponse, gmailStatus: GmailConnectionStatus, downloadState: 'not_downloaded' | 'downloaded' = 'not_downloaded') =>
  resolveImportFlowState({
    preferences: value,
    gmailStatus,
    localExportComplete: false,
    gmailImportSucceeded: false,
    downloadState,
    gmailFeatureEnabled: true,
    focusExport: false,
    showExportTutorial: false,
  });

describe('canonical import journey', () => {
  it('moves from Gmail connection through sparse import and export-ready upload', () => {
    const value = preferences();
    expect(resolveUpload(value, { connected: false }).initialOpenTask).toBe('connect_email');

    value.monitoring.capability.gmailConnected = true;
    value.ongoingTracking.capability.gmailConnected = true;
    value.ongoingTracking.capability.durableAccess = true;
    value.ongoingTracking.capability.canTrack = true;
    const healthyGmail = { connected: true, canImport: true, connectionHealth: 'valid' as const };
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBe('gmail_import');

    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true, receiptCount: 3, importedCount: 3 };
    value.coverage = { ...value.coverage, hasEmailData: true, emailReceiptCount: 3 };
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBe('uber_export');
    expect(resolveDashboardTrackingState(value, false).id).toBe('sparse_export');
    expect(resolvePostWrappedExperience({
      isExportStateLoading: false,
      hasCompletedExport: false,
      coverage: { orderCount: 3, earliestOrderDate: null, latestOrderDate: null, dataSources: ['email'], hasExportData: false },
    })).toEqual({ exportEligibility: 'show', coverageAssessment: 'sparse' });

    value.monitoring.consentState = 'granted';
    value.monitoring.effectiveState = 'enabled';
    value.monitoring.capability.canMonitor = true;
    value.export.status = 'requested_monitoring_enabled';
    expect(resolveDashboardTrackingState(value, false).id).toBe('requested_monitoring_enabled');

    value.export.status = 'file_ready';
    expect(resolveUpload(value, healthyGmail).exportImport.label).toBe('Ready to download');
    expect(resolveUpload(value, healthyGmail, 'downloaded').exportImport.label).toBe('Ready to upload');
    expect(resolveDashboardTrackingState(value, false).id).toBe('export_ready');

    value.export.status = 'completed';
    value.coverage = { ...value.coverage, hasExportData: true, exportReceiptCount: 40 };
    value.ongoingTracking = { ...value.ongoingTracking, consentState: 'granted', status: 'active', effectiveState: 'active' };
    expect(resolveUpload(value, healthyGmail).initialOpenTask).toBeNull();
    expect(resolveDashboardTrackingState(value, false).id).toBe('tracking_active');
  });

  it('preserves completed data while expired Gmail credentials recover', () => {
    const value = preferences();
    value.gmailImport = { ...value.gmailImport, status: 'completed', hasImported: true, receiptCount: 4, importedCount: 4 };
    value.coverage = { ...value.coverage, hasEmailData: true, emailReceiptCount: 4 };
    value.monitoring.capability = { gmailConnected: true, durableAccess: false, canMonitor: false, needsReconnect: true, connectionHealth: 'reconnect_required' };
    value.ongoingTracking.capability = { gmailConnected: true, durableAccess: false, canTrack: false, needsReconnect: true, connectionHealth: 'reconnect_required' };
    const expired = { connected: true, canImport: false, needsReconnect: true, connectionHealth: 'reconnect_required' as const };
    expect(resolveUpload(value, expired).gmailImport.complete).toBe(true);
    expect(resolveUpload(value, expired).initialOpenTask).toBe('connect_email');
    expect(resolveDashboardTrackingState(value, false).id).toBe('gmail_connection_reconnect');
  });
});
