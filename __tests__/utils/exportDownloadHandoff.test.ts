import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import {
  getExportDownloadHandoffState,
  openUberExportEmail,
  resetExportDownloadStateForUser,
  setExportDownloadHandoffState,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_GMAIL_SEARCH_URL,
} from '@utils/exportDownloadHandoff';

describe('exportDownloadHandoff', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
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
