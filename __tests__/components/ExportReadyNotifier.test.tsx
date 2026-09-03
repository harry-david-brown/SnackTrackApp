import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import ExportReadyNotifier from '@components/upload/ExportReadyNotifier';
import { useUser } from '@contexts/UserContext';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { showAlert } from '@utils/platformAlert';
import { router } from 'expo-router';

jest.mock('@contexts/UserContext', () => ({
  useUser: jest.fn(),
}));
jest.mock('@hooks/useImportPreferences', () => ({
  useImportPreferences: jest.fn(),
}));
jest.mock('@utils/platformAlert', () => ({
  showAlert: jest.fn(),
}));

describe('ExportReadyNotifier', () => {
  const checkExportReady = jest.fn();
  const readyPreferences = () => ({
    monitoring: {
      consentState: 'granted',
      capability: { canMonitor: true },
    },
    export: {
      providers: {
        uberEats: {
          provider: 'uber_eats',
          status: 'file_ready',
          requestedAt: '2026-08-01T12:00:00.000Z',
          updatedAt: '2026-08-04T12:00:00.000Z',
          errorCode: null,
          readySource: 'detected_email',
        },
      },
    },
  });
  const requestedPreferences = () => ({
    monitoring: {
      consentState: 'granted',
      capability: { canMonitor: true },
    },
    export: {
      providers: {
        uberEats: {
          provider: 'uber_eats',
          status: 'requested',
          requestedAt: '2026-08-01T12:00:00.000Z',
          updatedAt: '2026-08-01T12:00:00.000Z',
          errorCode: null,
          readySource: null,
        },
      },
    },
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({
      state: { user: { id: 'user-1' } },
    });
    (useImportPreferences as jest.Mock).mockReturnValue({
      preferences: readyPreferences(),
      checkExportReady,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows the standard in-app alert when an Uber export becomes ready', async () => {
    checkExportReady.mockResolvedValue({
      detected: true,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Your Uber data is ready',
      expect.stringContaining('Your Uber data is ready for download'),
      expect.any(Array)
    ));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'export-ready-notified:user-1:uber_eats',
      '2026-08-04T12:00:00.000Z'
    );
    expect(checkExportReady).not.toHaveBeenCalled();
  }, 10000);

  it('checks the server only while a consented Uber export is awaiting detection', async () => {
    (useImportPreferences as jest.Mock).mockReturnValue({
      preferences: requestedPreferences(),
      checkExportReady,
    });
    checkExportReady.mockResolvedValue({
      detected: true,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(checkExportReady).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(showAlert).toHaveBeenCalled());
  });

  it('does not check the server without export-alert consent', () => {
    const preferences = requestedPreferences();
    preferences.monitoring.consentState = 'not_offered';
    (useImportPreferences as jest.Mock).mockReturnValue({
      preferences,
      checkExportReady,
    });

    render(<ExportReadyNotifier />);

    expect(checkExportReady).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('does not repeat an alert for the same ready-state update', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('2026-08-04T12:00:00.000Z');
    checkExportReady.mockResolvedValue({
      detected: false,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      'export-download-handoff:user-1:uber_eats'
    ));
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('routes directly to the uploader when the user already downloaded the file', async () => {
    checkExportReady.mockResolvedValue({
      detected: true,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);
    await waitFor(() => expect(showAlert).toHaveBeenCalled());

    const buttons = (showAlert as jest.Mock).mock.calls[0][2];
    const downloadedButton = buttons.find((button: { text: string }) => (
      button.text === 'Already Downloaded'
    ));
    downloadedButton.onPress();

    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'export-download-handoff:user-1:uber_eats',
      JSON.stringify({
        readyVersion: '2026-08-04T12:00:00.000Z',
        state: 'downloaded',
      })
    ));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining('downloadedVersion='));
  });

  it('asks whether the download worked after returning from the download page', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      readyVersion: '2026-08-04T12:00:00.000Z',
      state: 'checking_email',
    }));
    checkExportReady.mockResolvedValue({
      detected: false,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Did you save the Uber ZIP?',
      expect.stringContaining('Go to Download Page'),
      expect.any(Array)
    ));
  });

  it('runs the download follow-up on an actual app background-to-active transition', async () => {
    let listener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, nextListener) => {
      listener = nextListener as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    let handoffReads = 0;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'export-download-handoff:user-1:uber_eats') {
        handoffReads += 1;
        return Promise.resolve(JSON.stringify({
          readyVersion: '2026-08-04T12:00:00.000Z',
          state: handoffReads === 1 ? 'not_downloaded' : 'checking_email',
        }));
      }
      return Promise.resolve('2026-08-04T12:00:00.000Z');
    });
    checkExportReady.mockResolvedValue({
      detected: false,
      preferences: readyPreferences(),
    });

    render(<ExportReadyNotifier />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      'export-download-handoff:user-1:uber_eats'
    ));
    expect(showAlert).not.toHaveBeenCalled();
    act(() => listener?.('active'));
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Did you save the Uber ZIP?',
      expect.stringContaining('Go to Download Page'),
      expect.any(Array)
    ));
  });
});
