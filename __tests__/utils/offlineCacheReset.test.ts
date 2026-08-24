import AsyncStorage from '@react-native-async-storage/async-storage';
import { removePendingOperationsForUser } from '@utils/offlineCache';

describe('offline queue reset cleanup', () => {
  it('removes only operations owned by the reset account', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([
      { id: 'same', type: 'csv_upload', data: { userId: 'user-1' }, timestamp: 1, retryCount: 0 },
      { id: 'other', type: 'csv_upload', data: { userId: 'user-2' }, timestamp: 2, retryCount: 0 },
    ]));

    await removePendingOperationsForUser('user-1');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@snacktrack_pending_operations',
      JSON.stringify([{ id: 'other', type: 'csv_upload', data: { userId: 'user-2' }, timestamp: 2, retryCount: 0 }])
    );
  });
});
