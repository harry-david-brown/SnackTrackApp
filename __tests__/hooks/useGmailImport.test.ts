import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGmailImport } from '../../hooks/useGmailImport';
import { gmailApi } from '../../services/gmailApi';
import * as WebBrowser from 'expo-web-browser';

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'snacktrack://oauth-callback'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../../services/gmailApi', () => ({
  gmailApi: {
    getAuthUrl: jest.fn(),
    getStatus: jest.fn(),
    importReceipts: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('../../contexts/UserContext', () => ({
  useUser: jest.fn(() => ({
    state: { user: null },
    setAnalytics: jest.fn(),
  })),
}));

jest.mock('../../services/analyticsApi', () => ({
  analyticsApi: {
    getUserSummary: jest.fn(),
  },
}));

jest.mock('../../utils/platformAlert', () => ({
  showAlert: jest.fn(),
  showSimpleAlert: jest.fn(),
}));

describe('useGmailImport', () => {
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

    const { result } = renderHook(() => useGmailImport());

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

  it('returns to idle after a failed resumed auto-import', async () => {
    (gmailApi.getStatus as jest.Mock)
      .mockResolvedValueOnce({ connected: false })
      .mockResolvedValueOnce({ connected: true, canImport: true });
    (gmailApi.importReceipts as jest.Mock).mockRejectedValue(new Error('Import failed'));

    const { result } = renderHook(() => useGmailImport());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    let resumePromise!: Promise<boolean>;

    await act(async () => {
      resumePromise = result.current.resumeAutoImport('flow-failure-test');
    });

    await act(async () => {
      await resumePromise;
    });

    await waitFor(() => {
      expect(gmailApi.importReceipts).toHaveBeenCalled();
      expect(result.current.primaryFlowState).toBe('idle');
      expect(result.current.isPrimaryActionInProgress).toBe(false);
    });
  });
});
