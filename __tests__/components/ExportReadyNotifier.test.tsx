import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import ExportReadyNotifier from '../../components/upload/ExportReadyNotifier';
import { useUser } from '../../contexts/UserContext';
import { useImportPreferences } from '../../hooks/useImportPreferences';
import { showAlert } from '../../utils/platformAlert';
import { router } from 'expo-router';

jest.mock('../../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));
jest.mock('../../hooks/useImportPreferences', () => ({
  useImportPreferences: jest.fn(),
}));
jest.mock('../../utils/platformAlert', () => ({
  showAlert: jest.fn(),
}));

describe('ExportReadyNotifier', () => {
  const checkExportReady = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({
      state: { user: { id: 'user-1' } },
    });
    (useImportPreferences as jest.Mock).mockReturnValue({ checkExportReady });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows the standard in-app alert when an Uber export becomes ready', async () => {
    checkExportReady.mockResolvedValue({
      detected: true,
      preferences: {
        export: {
          status: 'file_ready',
          updatedAt: '2026-08-04T12:00:00.000Z',
        },
      },
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Your Uber data is ready',
      expect.stringContaining('Your Uber data is ready for download'),
      expect.any(Array)
    ));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'uber-export-ready-notified:user-1',
      '2026-08-04T12:00:00.000Z'
    );
  }, 10000);

  it('does not repeat an alert for the same ready-state update', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('2026-08-04T12:00:00.000Z');
    checkExportReady.mockResolvedValue({
      detected: false,
      preferences: {
        export: {
          status: 'file_ready',
          updatedAt: '2026-08-04T12:00:00.000Z',
        },
      },
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(checkExportReady).toHaveBeenCalledTimes(1));
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('routes directly to the uploader when the user already downloaded the file', async () => {
    checkExportReady.mockResolvedValue({
      detected: true,
      preferences: {
        export: {
          status: 'file_ready',
          updatedAt: '2026-08-04T12:00:00.000Z',
        },
      },
    });

    render(<ExportReadyNotifier />);
    await waitFor(() => expect(showAlert).toHaveBeenCalled());

    const buttons = (showAlert as jest.Mock).mock.calls[0][2];
    const downloadedButton = buttons.find((button: { text: string }) => (
      button.text === 'Already Downloaded'
    ));
    downloadedButton.onPress();

    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'uber-export-download-handoff:user-1',
      JSON.stringify({
        readyVersion: '2026-08-04T12:00:00.000Z',
        state: 'downloaded',
      })
    ));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining('downloadedVersion='));
  });

  it('asks whether the download worked after returning from Gmail', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      readyVersion: '2026-08-04T12:00:00.000Z',
      state: 'checking_email',
    }));
    checkExportReady.mockResolvedValue({
      detected: false,
      preferences: {
        export: {
          status: 'file_ready',
          updatedAt: '2026-08-04T12:00:00.000Z',
        },
      },
    });

    render(<ExportReadyNotifier />);

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Did you save the Uber ZIP?',
      expect.stringContaining('Go to Download Page'),
      expect.any(Array)
    ));
  });
});
