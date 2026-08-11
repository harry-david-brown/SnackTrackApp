import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resetExportUpsellForUser,
  useExportUpsell,
} from '../../hooks/useExportUpsell';

jest.mock('../../services/api/receiptApi', () => ({
  receiptApi: {
    getReceipts: jest.fn(),
  },
}));

describe('useExportUpsell reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      wrappedSeenAt: '2026-07-29T12:00:00.000Z',
      dashboardSeenAt: null,
      clickedAt: null,
      lastDismissedAt: null,
      dismissCount: 0,
      completedAt: '2026-07-29T12:00:00.000Z',
    }));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('clears stored completion and synchronizes mounted consumers', async () => {
    const userId = 'user-1';
    const { result } = renderHook(() => useExportUpsell(userId));
    await waitFor(() => expect(result.current.hasCompletedExport).toBe(true));

    await act(async () => resetExportUpsellForUser(userId));

    expect(result.current.hasCompletedExport).toBe(false);
    expect(result.current.upsellState.completedAt).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `@snacktrack_export_upsell_${userId}`,
      expect.stringContaining('"completedAt":null')
    );
  });
});
