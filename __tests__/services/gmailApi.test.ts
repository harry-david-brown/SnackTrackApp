import {
  gmailApi,
  MONITORING_CONSENT_VERSION,
  ONGOING_TRACKING_CONSENT_VERSION,
} from '@services/gmailApi';
import api from '@services/api';
import type { ImportPreferencesResponse } from '@services/gmailApi';

jest.mock('@services/api');

const preferences = (
  monitoringState: ImportPreferencesResponse['monitoring']['consentState'] = 'not_offered',
  exportStatus: ImportPreferencesResponse['export']['status'] = 'not_started',
): ImportPreferencesResponse => ({
  monitoring: {
    consentState: monitoringState,
    consentVersion: monitoringState === 'granted' ? MONITORING_CONSENT_VERSION : null,
    consentedAt: null,
    revokedAt: null,
    effectiveState: monitoringState === 'granted' ? 'enabled' : monitoringState === 'declined' ? 'declined' : 'not_offered',
    capability: { gmailConnected: true, durableAccess: true, canMonitor: true },
  },
  export: { status: exportStatus, requestedAt: null, updatedAt: null },
  gmailImport: {
    status: 'never_started', updatedAt: null, importedCount: 0, errorCode: null,
    receiptCount: 0, hasImported: false,
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
    emailReceiptCount: 0, exportReceiptCount: 0, hasEmailData: false, hasExportData: false,
    exportProviders: {
      uberEats: { receiptCount: 0, hasData: false },
      doorDash: { receiptCount: 0, hasData: false },
    },
  },
});

describe('gmailApi.importReceipts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves duplicate-action prevention to the flow controller and API lock', async () => {
    const response = {
      data: {
        success: true,
        totalEmailsFound: 5,
        totalReceiptsProcessed: 4,
        totalReceiptsImported: 4,
        totalAmount: 42.5,
        errors: [],
      },
    };
    (api.post as jest.Mock).mockResolvedValue(response);

    await expect(gmailApi.importReceipts()).resolves.toEqual(response.data);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/gmail/import', {}, { timeout: 300000 });
  });

  it('allows a new import after the previous one completes', async () => {
    (api.post as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          totalEmailsFound: 1,
          totalReceiptsProcessed: 1,
          totalReceiptsImported: 1,
          totalAmount: 12,
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          totalEmailsFound: 2,
          totalReceiptsProcessed: 2,
          totalReceiptsImported: 2,
          totalAmount: 24,
          errors: [],
        },
      });

    await gmailApi.importReceipts();
    await gmailApi.importReceipts();

    expect(api.post).toHaveBeenCalledTimes(2);
  });
});

describe('gmailApi import preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records versioned monitoring consent', async () => {
    const response = preferences('granted');
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.setMonitoringConsent('granted')).resolves.toEqual(response);
    expect(api.put).toHaveBeenCalledWith('/gmail/preferences/monitoring-consent', {
      decision: 'granted',
      consentVersion: MONITORING_CONSENT_VERSION,
    });
  });

  it('does not attach a consent version to decline or revocation', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: preferences('declined') });

    await gmailApi.setMonitoringConsent('declined');
    await gmailApi.setMonitoringConsent('revoked');

    expect(api.put).toHaveBeenNthCalledWith(1, '/gmail/preferences/monitoring-consent', {
      decision: 'declined',
      consentVersion: undefined,
    });
    expect(api.put).toHaveBeenNthCalledWith(2, '/gmail/preferences/monitoring-consent', {
      decision: 'revoked',
      consentVersion: undefined,
    });
  });

  it('records separate versioned consent for ongoing receipt tracking', async () => {
    const response = preferences();
    response.ongoingTracking.consentState = 'granted';
    response.ongoingTracking.effectiveState = 'active';
    response.ongoingTracking.status = 'active';
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.setOngoingTrackingConsent('granted')).resolves.toEqual(response);
    expect(api.put).toHaveBeenCalledWith('/gmail/preferences/ongoing-tracking-consent', {
      decision: 'granted',
      consentVersion: ONGOING_TRACKING_CONSENT_VERSION,
    });
  });

  it('can request an authenticated ongoing receipt check', async () => {
    const response = {
      success: true, newOrders: 2, totalEmailsFound: 2, totalReceiptsProcessed: 2,
      totalReceiptsImported: 2, totalAmount: 24, errors: [], preferences: preferences(),
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });
    await expect(gmailApi.checkOngoingTracking()).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/gmail/tracking/check', {}, { timeout: 300000 });
  });

  it('loads preferences and records an export request', async () => {
    const response = preferences('declined', 'requested_monitoring_disabled');
    (api.get as jest.Mock).mockResolvedValue({ data: response });
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.getImportPreferences()).resolves.toEqual(response);
    await expect(gmailApi.markExportRequested('uber_eats')).resolves.toEqual(response);

    expect(api.get).toHaveBeenCalledWith('/gmail/preferences');
    expect(api.post).toHaveBeenCalledWith('/gmail/preferences/export-requested', {
      provider: 'uber_eats',
    });
  });

  it('checks whether Uber has delivered the requested export', async () => {
    const response = {
      detected: true,
      preferences: preferences('granted', 'file_ready'),
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.checkExportReady()).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/gmail/preferences/check-export-ready');
  });

  it('requests an import-status reset when disconnecting for onboarding', async () => {
    const response = { success: true, message: 'Gmail account disconnected successfully' };
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.disconnect({ resetImportStatus: true })).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/gmail/disconnect', { resetImportStatus: true });
  });

  it('rejects malformed lifecycle data at the service boundary', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { ...preferences(), export: { status: 'mystery' } } });

    await expect(gmailApi.getImportPreferences()).rejects.toThrow(
      'Invalid Gmail response: preferences.export.status',
    );
  });
});
