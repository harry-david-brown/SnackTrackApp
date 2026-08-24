import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGmailImport } from '@hooks/useGmailImport';
import { gmailApi } from '@services/gmailApi';
import * as WebBrowser from 'expo-web-browser';
import { showSimpleAlert } from '@utils/platformAlert';
import { createQueryTestWrapper } from '@/__tests__/utils/queryTestUtils';

const mockInvalidateReceiptDerivedData = jest.fn();

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'snacktrack://oauth-callback'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('@services/gmailApi', () => ({
  gmailApi: {
    getAuthUrl: jest.fn(),
    getStatus: jest.fn(),
    importReceipts: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('@contexts/UserContext', () => ({
  useUser: jest.fn(() => ({
    state: { user: { id: 'user-123' } },
  })),
}));

jest.mock('@services/analyticsApi', () => ({
  analyticsApi: {
    getUserSummary: jest.fn(),
  },
}));

jest.mock('@utils/platformAlert', () => ({
  showAlert: jest.fn(),
  showSimpleAlert: jest.fn(),
}));

jest.mock('@lib/queryInvalidation', () => ({
  invalidateImportState: jest.fn(),
  invalidateReceiptDerivedData: (...args: unknown[]) => mockInvalidateReceiptDerivedData(...args),
}));

describe('useGmailImport', () => {
  const renderGmailHook = () => {
    const { Wrapper } = createQueryTestWrapper();
    return renderHook(() => useGmailImport(), { wrapper: Wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (gmailApi.getStatus as jest.Mock).mockResolvedValue({ connected: false });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });
  });

  it('reports the primary action as in progress while Gmail connection is loading', async () => {
    let resolveAuthUrl!: (value: { authUrl: string }) => void;

    (gmailApi.getAuthUrl as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAuthUrl = resolve;
        })
    );

    const { result } = renderGmailHook();

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    let connectPromise!: Promise<boolean>;

    await act(async () => {
      connectPromise = result.current.connectGmail();
    });

    await waitFor(() => {
      expect(gmailApi.getAuthUrl).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.primaryFlowState).toBe('connecting');
      expect(result.current.isPrimaryActionInProgress).toBe(true);
    });

    resolveAuthUrl({ authUrl: 'https://example.com/auth' });

    await act(async () => {
      await connectPromise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.primaryFlowState).toBe('idle');
      expect(result.current.isPrimaryActionInProgress).toBe(false);
    });
  });

  it('connects the upload checklist without starting an automatic Gmail import', async () => {
    (gmailApi.getAuthUrl as jest.Mock).mockResolvedValue({ authUrl: 'https://example.com/auth' });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'snacktrack://oauth-callback?gmail=success',
    });
    (gmailApi.getStatus as jest.Mock)
      .mockResolvedValueOnce({ connected: false })
      .mockResolvedValueOnce({ connected: true, canImport: true });

    const { result } = renderGmailHook();
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => {
      await result.current.connectGmail();
    });

    expect(gmailApi.getAuthUrl).toHaveBeenCalledWith('snacktrack://oauth-callback');
    expect(gmailApi.importReceipts).not.toHaveBeenCalled();
  });

  it('returns to idle after a failed explicit import', async () => {
    (gmailApi.getStatus as jest.Mock).mockResolvedValue({ connected: true, canImport: true });
    (gmailApi.importReceipts as jest.Mock).mockRejectedValue(new Error('Import failed'));

    const { result } = renderGmailHook();

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    await act(async () => {
      await result.current.importReceipts();
    });

    await waitFor(() => {
      expect(gmailApi.importReceipts).toHaveBeenCalled();
      expect(result.current.primaryFlowState).toBe('idle');
      expect(result.current.isPrimaryActionInProgress).toBe(false);
    });
  });

  it('refreshes connection state and asks for reconnection after invalid_grant', async () => {
    (gmailApi.getStatus as jest.Mock)
      .mockResolvedValueOnce({ connected: true, canImport: true })
      .mockResolvedValueOnce({ connected: true, canImport: false, needsReconnect: true });
    (gmailApi.importReceipts as jest.Mock).mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'GMAIL_RECONNECT_REQUIRED',
          message: 'Reconnect Gmail to continue.',
        },
      },
    });

    const { result } = renderGmailHook();
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => {
      await result.current.importReceipts();
    });

    expect(showSimpleAlert).toHaveBeenCalledWith('Reconnect Gmail', 'Reconnect Gmail to continue.');
    expect(gmailApi.getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.connectionStatus.needsReconnect).toBe(true);
  });

  it('refreshes receipts and analytics after a historical Gmail import', async () => {
    (gmailApi.getStatus as jest.Mock).mockResolvedValue({ connected: true, canImport: true });
    (gmailApi.importReceipts as jest.Mock).mockResolvedValue({
      success: true,
      totalEmailsFound: 4,
      totalReceiptsProcessed: 3,
      totalReceiptsImported: 3,
      totalAmount: 45,
      errors: [],
    });
    mockInvalidateReceiptDerivedData.mockResolvedValue(undefined);
    const onImportSuccess = jest.fn();
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(() => useGmailImport({ onImportSuccess }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    await act(async () => { await result.current.importReceipts(); });

    expect(mockInvalidateReceiptDerivedData).toHaveBeenCalledTimes(1);
    expect(onImportSuccess).toHaveBeenCalledWith(expect.objectContaining({ success: true, totalReceiptsImported: 3 }));
  });
});
