import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetExportUpsellForUser, useExportUpsell } from '@hooks/useExportUpsell';

const mockRefreshPreferences = jest.fn();

jest.mock('@hooks/useImportPreferences', () => ({
  useImportPreferences: () => ({
    preferences: {
      export: { status: 'completed' },
      coverage: { hasExportData: true },
    },
    isLoading: false,
    refresh: mockRefreshPreferences,
  }),
}));

describe('useExportUpsell server ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      wrappedSeenAt: '2026-07-29T12:00:00.000Z',
      dashboardSeenAt: null,
      clickedAt: null,
      lastDismissedAt: null,
      dismissCount: 0,
      completedAt: 'legacy-device-marker',
    }));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockRefreshPreferences.mockResolvedValue(undefined);
  });

  it('derives completion from server coverage and ignores a legacy device marker', async () => {
    const userId = 'user-1';
    const { result } = renderHook(() => useExportUpsell(userId));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasCompletedExport).toBe(true);
    expect(result.current.upsellState).not.toHaveProperty('completedAt');

    await act(async () => resetExportUpsellForUser(userId));
    expect(result.current.hasCompletedExport).toBe(true);
  });

  it('refreshes canonical preferences after an upload completes', async () => {
    const { result } = renderHook(() => useExportUpsell('user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.markCompleted());
    expect(mockRefreshPreferences).toHaveBeenCalledTimes(1);
  });
});
