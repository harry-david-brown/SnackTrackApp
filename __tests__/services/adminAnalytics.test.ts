import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@services/api/client';
import { getUserId } from '@utils/tokenManager';
import {
  adminAnalyticsQueueKeyForTests,
  flushAdminEvents,
  trackAdminEvent,
} from '@services/adminAnalytics';

jest.mock('@services/api/client', () => ({ api: { post: jest.fn() } }));
jest.mock('@utils/tokenManager', () => ({ getUserId: jest.fn() }));

const userId = '5f586923-18d5-4bc8-b5eb-ea52ae35284c';

describe('admin analytics delivery queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (getUserId as jest.Mock).mockResolvedValue(userId);
    (api.post as jest.Mock).mockResolvedValue({ data: { accepted: 50, duplicates: 0, rejected: 0 } });
  });

  it('bounds a user queue to the newest 200 events', async () => {
    for (let index = 0; index < 205; index += 1) await trackAdminEvent('dashboard_viewed');
    const stored = JSON.parse((await AsyncStorage.getItem(adminAnalyticsQueueKeyForTests(userId)))!);
    expect(stored).toHaveLength(200);
  });

  it('flushes in batches of at most 50 events until the queue is empty', async () => {
    for (let index = 0; index < 55; index += 1) await trackAdminEvent('history_viewed');
    await flushAdminEvents(userId);
    expect(api.post).toHaveBeenCalledTimes(2);
    expect((api.post as jest.Mock).mock.calls[0][1].events).toHaveLength(50);
    expect((api.post as jest.Mock).mock.calls[1][1].events).toHaveLength(5);
    const stored = JSON.parse((await AsyncStorage.getItem(adminAnalyticsQueueKeyForTests(userId)))!);
    expect(stored).toHaveLength(0);
  });

  it('keeps queued events when delivery fails', async () => {
    await trackAdminEvent('wrapped_started');
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(flushAdminEvents(userId)).rejects.toThrow('offline');
    const stored = JSON.parse((await AsyncStorage.getItem(adminAnalyticsQueueKeyForTests(userId)))!);
    expect(stored).toHaveLength(1);
  });
});
