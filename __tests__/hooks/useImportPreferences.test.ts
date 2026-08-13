import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { gmailApi, type ImportPreferencesResponse } from '@services/gmailApi';
import { createQueryTestWrapper } from '@/__tests__/utils/queryTestUtils';

jest.mock('@contexts/UserContext', () => ({
  useUser: () => ({ state: { user: { id: 'user-123' } } }),
}));

jest.mock('@services/gmailApi', () => ({
  gmailApi: {
    getImportPreferences: jest.fn(),
    setMonitoringConsent: jest.fn(),
    setOngoingTrackingConsent: jest.fn(),
    checkOngoingTracking: jest.fn(),
    importReceipts: jest.fn(),
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
  const renderPreferencesHook = (enabled = true) => {
    const { Wrapper } = createQueryTestWrapper();
    return renderHook(() => useImportPreferences(enabled), { wrapper: Wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (gmailApi.getImportPreferences as jest.Mock).mockResolvedValue(preferences());
  });

  it('loads durable import preferences', async () => {
    const { result } = renderPreferencesHook();

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

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setMonitoringConsent('granted');
    });

    expect(gmailApi.setMonitoringConsent).toHaveBeenCalledWith('granted');
    await waitFor(() => expect(result.current.preferences?.monitoring.effectiveState).toBe('enabled'));
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

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markExportRequested();
    });

    await waitFor(() => expect(result.current.preferences?.export.status).toBe('requested_monitoring_disabled'));
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
    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setOngoingTrackingConsent('granted');
    });

    expect(gmailApi.setOngoingTrackingConsent).toHaveBeenCalledWith('granted');
    await waitFor(() => expect(result.current.preferences?.ongoingTracking.effectiveState).toBe('active'));
  });

  it('marks an automatic Gmail scan as importing and refreshes its completion state', async () => {
    let finishImport!: (value: { success: boolean }) => void;
    (gmailApi.importReceipts as jest.Mock).mockImplementation(() => new Promise((resolve) => {
      finishImport = resolve;
    }));
    const completed = preferences();
    completed.gmailImport = {
      ...completed.gmailImport,
      status: 'completed',
      hasImported: true,
    };
    (gmailApi.getImportPreferences as jest.Mock)
      .mockResolvedValueOnce(preferences())
      .mockResolvedValueOnce(completed);

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let importPromise!: Promise<unknown>;
    act(() => {
      importPromise = result.current.importGmailReceipts();
    });
    await waitFor(() => expect(result.current.preferences?.gmailImport.status).toBe('importing'));

    await act(async () => {
      finishImport({ success: true });
      await importPromise;
    });

    await waitFor(() => expect(result.current.preferences?.gmailImport.hasImported).toBe(true));
  });

  it('refreshes authoritative preferences when a tracking check fails', async () => {
    const failedPreferences = preferences();
    failedPreferences.ongoingTracking = {
      ...failedPreferences.ongoingTracking,
      status: 'error',
      effectiveState: 'error',
      activity: {
        ...failedPreferences.ongoingTracking.activity,
        lastErrorCode: 'GMAIL_RECONNECT_REQUIRED',
      },
    };
    (gmailApi.getImportPreferences as jest.Mock)
      .mockResolvedValueOnce(preferences())
      .mockResolvedValueOnce(failedPreferences);
    (gmailApi.checkOngoingTracking as jest.Mock).mockRejectedValueOnce(new Error('Tracking failed'));

    const { result } = renderPreferencesHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.checkOngoingTracking()).rejects.toThrow('Tracking failed');
    });

    await waitFor(() => expect(result.current.preferences?.ongoingTracking.effectiveState).toBe('error'));
    expect(gmailApi.getImportPreferences).toHaveBeenCalledTimes(2);
  });

  it('does not load when disabled', async () => {
    const { result } = renderPreferencesHook(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(gmailApi.getImportPreferences).not.toHaveBeenCalled();
    expect(result.current.preferences).toBeNull();
  });
});
