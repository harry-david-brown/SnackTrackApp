import {
  gmailApi,
  MONITORING_CONSENT_VERSION,
  ONGOING_TRACKING_CONSENT_VERSION,
} from '../../services/gmailApi';
import api from '../../services/api';

jest.mock('../../services/api');

describe('gmailApi.importReceipts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates concurrent import requests', async () => {
    let resolveRequest!: (value: any) => void;

    (api.post as jest.Mock).mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const promise1 = gmailApi.importReceipts();
    const promise2 = gmailApi.importReceipts();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/gmail/import', {}, { timeout: 300000 });

    resolveRequest({
      data: {
        success: true,
        totalEmailsFound: 5,
        totalReceiptsProcessed: 4,
        totalReceiptsImported: 4,
        totalAmount: 42.5,
        errors: [],
      },
    });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toEqual(result2);
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
    const response = {
      monitoring: {
        consentState: 'granted',
        consentVersion: MONITORING_CONSENT_VERSION,
        effectiveState: 'enabled',
      },
      export: { status: 'not_started' },
    };
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.setMonitoringConsent('granted')).resolves.toBe(response);
    expect(api.put).toHaveBeenCalledWith('/gmail/preferences/monitoring-consent', {
      decision: 'granted',
      consentVersion: MONITORING_CONSENT_VERSION,
    });
  });

  it('does not attach a consent version to decline or revocation', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: {} });

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
    const response = { ongoingTracking: { effectiveState: 'active' } };
    (api.put as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.setOngoingTrackingConsent('granted')).resolves.toBe(response);
    expect(api.put).toHaveBeenCalledWith('/gmail/preferences/ongoing-tracking-consent', {
      decision: 'granted',
      consentVersion: ONGOING_TRACKING_CONSENT_VERSION,
    });
  });

  it('can request an authenticated ongoing receipt check', async () => {
    const response = { success: true, newOrders: 2 };
    (api.post as jest.Mock).mockResolvedValue({ data: response });
    await expect(gmailApi.checkOngoingTracking()).resolves.toBe(response);
    expect(api.post).toHaveBeenCalledWith('/gmail/tracking/check', {}, { timeout: 300000 });
  });

  it('loads preferences and records an export request', async () => {
    const response = {
      monitoring: { consentState: 'declined' },
      export: { status: 'requested_monitoring_disabled' },
    };
    (api.get as jest.Mock).mockResolvedValue({ data: response });
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.getImportPreferences()).resolves.toBe(response);
    await expect(gmailApi.markExportRequested()).resolves.toBe(response);

    expect(api.get).toHaveBeenCalledWith('/gmail/preferences');
    expect(api.post).toHaveBeenCalledWith('/gmail/preferences/export-requested');
  });

  it('checks whether Uber has delivered the requested export', async () => {
    const response = {
      detected: true,
      preferences: {
        monitoring: { consentState: 'granted' },
        export: { status: 'file_ready' },
      },
    };
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(gmailApi.checkExportReady()).resolves.toBe(response);
    expect(api.post).toHaveBeenCalledWith('/gmail/preferences/check-export-ready');
  });
});
