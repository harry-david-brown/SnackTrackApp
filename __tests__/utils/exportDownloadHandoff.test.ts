import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import {
  clearPendingExportRequest,
  getPendingExportRequest,
  setPendingExportRequest,
  getExportDownloadHandoffState,
  openUberExportEmail,
  resetExportDownloadStateForUser,
  setExportDownloadHandoffState,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_GMAIL_SEARCH_URL,
} from '@utils/exportDownloadHandoff';

describe('exportDownloadHandoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses local download state only for the matching ready event', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await setExportDownloadHandoffState('user-1', 'uber_eats', 'ready-v1', 'downloaded');

    const storedValue = JSON.stringify({ readyVersion: 'ready-v1', state: 'downloaded' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedValue);

    await expect(getExportDownloadHandoffState('user-1', 'uber_eats', 'ready-v1')).resolves.toBe('downloaded');
    await expect(getExportDownloadHandoffState('user-1', 'uber_eats', 'ready-v2')).resolves.toBe('not_downloaded');
  });

  it('scopes simultaneous handoffs by provider', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await setExportDownloadHandoffState('user-1', 'uber_eats', 'uber-v1', 'downloaded');
    await setExportDownloadHandoffState('user-1', 'doordash', 'door-v1', 'checking_email');

    expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(
      1,
      'export-download-handoff:user-1:uber_eats',
      JSON.stringify({ readyVersion: 'uber-v1', state: 'downloaded' }),
    );
    expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(
      2,
      'export-download-handoff:user-1:doordash',
      JSON.stringify({ readyVersion: 'door-v1', state: 'checking_email' }),
    );
  });

  it('opens the Gmail app when its URL scheme succeeds', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined as never);

    await expect(openUberExportEmail()).resolves.toBe('gmail_app');
    expect(openUrl).toHaveBeenCalledWith('googlegmail://');
  });

  it('falls back to a focused Gmail web search', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('Gmail is not installed'))
      .mockResolvedValueOnce(undefined as never);

    await expect(openUberExportEmail()).resolves.toBe('gmail_web');
    expect(UBER_EXPORT_EMAIL_SEARCH_QUERY).toBe(
      'from:noreply@uber.com subject:"Your Uber data is ready for download"'
    );
    expect(openUrl).toHaveBeenNthCalledWith(2, UBER_EXPORT_GMAIL_SEARCH_URL);
  });

  it('clears local export progress for a fresh onboarding state', async () => {
    await resetExportDownloadStateForUser('user-1');

    expect(AsyncStorage.removeItem).toHaveBeenNthCalledWith(
      1,
      'export-download-handoff:user-1:uber_eats'
    );
    expect(AsyncStorage.removeItem).toHaveBeenNthCalledWith(
      2,
      'export-download-handoff:user-1:doordash'
    );
  });
});

describe('interrupted external requests', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async key => store.get(key) ?? null);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { store.set(key, value); });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => { store.delete(key); });
  });
  it('stores only a per-user/provider confirmation hint and origin', async () => {
    await setPendingExportRequest('user-1', 'uber_eats', 'history');
    expect(await getPendingExportRequest('user-1', 'uber_eats')).toMatchObject({ returnTo: 'history' });
    expect(await getPendingExportRequest('user-1', 'doordash')).toBeNull();
    expect(await getPendingExportRequest('user-2', 'uber_eats')).toBeNull();
    expect([...store.values()][0]).not.toMatch(/requested|fileUri|bytes|uploadIntent/);
  });
  it('clears a hint when server progress is newer, after resolution, or on data reset', async () => {
    await setPendingExportRequest('user-1', 'uber_eats', 'home');
    expect(await getPendingExportRequest('user-1', 'uber_eats', new Date(Date.now() + 1000).toISOString())).toBeNull();
    await setPendingExportRequest('user-1', 'uber_eats', 'home');
    await clearPendingExportRequest('user-1', 'uber_eats');
    expect(await getPendingExportRequest('user-1', 'uber_eats')).toBeNull();
    await setPendingExportRequest('user-1', 'uber_eats', 'home');
    await resetExportDownloadStateForUser('user-1');
    expect(await getPendingExportRequest('user-1', 'uber_eats')).toBeNull();
  });
});
