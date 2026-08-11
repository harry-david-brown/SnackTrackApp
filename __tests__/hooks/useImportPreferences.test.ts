import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  resetCachedImportExportState,
  useImportPreferences,
} from '../../hooks/useImportPreferences';
import { gmailApi, type ImportPreferencesResponse } from '../../services/gmailApi';

jest.mock('../../services/gmailApi', () => ({
  gmailApi: {
    getImportPreferences: jest.fn(),
    setMonitoringConsent: jest.fn(),
    setOngoingTrackingConsent: jest.fn(),
    checkOngoingTracking: jest.fn(),
    markExportRequested: jest.fn(),
  },
}));

const preferences = (
  overrides: Partial<ImportPreferencesResponse> = {}
): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered',
    consentVersion: null,
    consentedAt: null,
    revokedAt: null,
    effectiveState: 'not_offered',
    capability: {
      gmailConnected: true,
      durableAccess: true,
      canMonitor: true,
    },
  },
  export: {
    status: 'not_started',
    requestedAt: null,
    updatedAt: null,
  },
  gmailImport: {
    status: 'never_started', updatedAt: null, importedCount: 0,
    errorCode: null, receiptCount: 0, hasImported: false,
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
  },
  ...overrides,
});

describe('useImportPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(preferences());
  });

  it('loads durable import preferences', async () => {
    const { result } = renderHook(() => useImportPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences?.monitoring.effectiveState).toBe('not_offered');
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(1);
  });

  it('stores the server response after granting consent', async () => {
    const enabledPreferences = preferences({
      monitoring: {
        ...preferences().monitoring,
        consentState: 'granted',
        consentVersion: '2026-07-29.v1',
        consentedAt: '2026-07-29T12:00:00.000Z',
        effectiveState: 'enabled',
      },
    });
    (gmailApi.setMonitoringConsent as jest.Mock).mockResolvedValue(enabledPreferences);

    const { result } = renderHook(() => useImportPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setMonitoringConsent('granted');
    });

    expect(gmailApi.setMonitoringConsent).toHaveBeenCalledWith('granted');
    expect(result.current.preferences?.monitoring.effectiveState).toBe('enabled');
  });

  it('records export-request lifecycle state', async () => {
    const requestedPreferences = preferences({
      export: {
        status: 'requested_monitoring_disabled',
        requestedAt: '2026-07-29T12:00:00.000Z',
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
    });
    (gmailApi.markExportRequested as jest.Mock).mockResolvedValue(requestedPreferences);

    const { result } = renderHook(() => useImportPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markExportRequested();
    });

    expect(result.current.preferences?.export.status).toBe('requested_monitoring_disabled');
  });

  it('stores ongoing tracking consent independently from export alerts', async () => {
    const activePreferences = preferences();
    activePreferences.ongoingTracking = {
      ...activePreferences.ongoingTracking,
      consentState: 'granted',
      effectiveState: 'active',
      status: 'active',
    };
    (gmailApi.setOngoingTrackingConsent as jest.Mock).mockResolvedValue(activePreferences);
    const { result } = renderHook(() => useImportPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setOngoingTrackingConsent('granted');
    });

    expect(gmailApi.setOngoingTrackingConsent).toHaveBeenCalledWith('granted');
    expect(result.current.preferences?.ongoingTracking.effectiveState).toBe('active');
  });

  it('resets mounted export state after receipts are cleared', async () => {
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(preferences({
      export: {
        status: 'completed',
        requestedAt: '2026-07-29T12:00:00.000Z',
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
    }));
    const { result } = renderHook(() => useImportPreferences());
    await waitFor(() => expect(result.current.preferences?.export.status).toBe('completed'));

    act(() => resetCachedImportExportState());

    expect(result.current.preferences?.export.status).toBe('not_started');
    expect(result.current.preferences?.export.requestedAt).toBeNull();
  });

  it('does not load when disabled', async () => {
    const { result } = renderHook(() => useImportPreferences(false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(gmailApi.getImportPreferences).not.toHaveBeenCalled();
    expect(result.current.preferences).toBeNull();
  });
});
