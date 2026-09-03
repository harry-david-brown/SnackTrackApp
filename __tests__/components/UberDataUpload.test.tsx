import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { UberDataUpload } from '@components/upload/UberDataUpload';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { showAlert } from '@utils/platformAlert';

const mockImportFile = jest.fn();

jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@hooks/useExportImport', () => ({
  useExportImport: () => ({
    importFile: mockImportFile,
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn() }));
jest.mock('@utils/sentry', () => ({ captureException: jest.fn() }));

const validArchive = {
  canceled: false as const,
  assets: [{
    uri: 'file://delivery-history.zip',
    name: 'delivery-history.zip',
    size: 1024,
    mimeType: 'application/zip',
    lastModified: Date.now(),
  }],
};

describe('UberDataUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ state: { user: { id: 'user-1' } } });
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });
  });

  it('uploads a valid archive immediately after it is chosen', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(validArchive);
    const result = {
      importedCount: 15,
      totalAmount: 20,
      message: 'Success',
      fileType: 'zip',
      provider: 'uber_eats',
    };
    mockImportFile.mockResolvedValue(result);
    const onUploadSuccess = jest.fn();
    const view = render(<UberDataUpload onUploadSuccess={onUploadSuccess} />);

    fireEvent.press(view.getByText('Choose downloaded ZIP'));

    await waitFor(() => expect(mockImportFile).toHaveBeenCalledWith({
      userId: 'user-1',
      file: {
        uri: 'file://delivery-history.zip',
        type: 'application/zip',
        name: 'delivery-history.zip',
      },
    }));
    expect(onUploadSuccess).toHaveBeenCalledWith(result);
  });

  it('keeps a failed archive available for a one-tap retry', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(validArchive);
    mockImportFile.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network Error' });
    mockImportFile.mockResolvedValueOnce({
      importedCount: 2,
      totalAmount: 10,
      message: 'Success',
      fileType: 'zip',
      provider: 'uber_eats',
    });
    const view = render(<UberDataUpload />);

    fireEvent.press(view.getByText('Choose downloaded ZIP'));
    await waitFor(() => expect(view.getByText('Try this file again')).toBeTruthy());
    fireEvent.press(view.getByText('Try this file again'));

    await waitFor(() => expect(mockImportFile).toHaveBeenCalledTimes(2));
  });

  it('explains invalid file types without entering the upload flow', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ ...validArchive.assets[0], name: 'notes.txt', mimeType: 'text/plain' }],
    });
    const view = render(<UberDataUpload />);

    fireEvent.press(view.getByText('Choose downloaded ZIP'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Choose a delivery history file',
      'Choose the original ZIP or CSV file from Uber Eats or DoorDash.',
    ));
    expect(mockImportFile).not.toHaveBeenCalled();
  });

  it('disables file selection while offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
    const view = render(<UberDataUpload />);

    expect(view.getByText('Reconnect to the internet before choosing the file.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Choose downloaded ZIP' }).props.accessibilityState)
      .toMatchObject({ disabled: true });
  });

  it('gives specific recovery when an archive contains no supported orders', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(validArchive);
    mockImportFile.mockRejectedValue({
      code: 'NO_VALID_EXPORT_ORDERS',
      message: 'No orders found',
    });
    const view = render(<UberDataUpload />);

    fireEvent.press(view.getByText('Choose downloaded ZIP'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'No supported orders found',
      expect.stringContaining('request a newer archive'),
    ));
  });
});
