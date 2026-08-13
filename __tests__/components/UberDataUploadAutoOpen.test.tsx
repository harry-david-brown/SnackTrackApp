import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { UberDataUpload } from '@components/upload/UberDataUpload';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { csvApi } from '@services/api';

jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@services/api', () => ({ csvApi: { importCsv: jest.fn() } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@utils/sentry', () => ({ captureException: jest.fn() }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn() }));

describe('UberDataUpload automatic picker handoff', () => {
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

  it('opens once after navigation and does not reopen for the same token', async () => {
    const onConsumed = jest.fn();
    const view = render(
      <UberDataUpload autoOpenToken="ready-v1" onAutoOpenConsumed={onConsumed} />
    );

    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(1));
    expect(onConsumed).toHaveBeenCalledTimes(1);

    view.rerender(
      <UberDataUpload autoOpenToken="ready-v1" onAutoOpenConsumed={onConsumed} />
    );
    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(1);
  });

  it('allows a later explicit picker request with a new token', async () => {
    const view = render(<UberDataUpload autoOpenToken="ready-v1" />);
    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(1));

    view.rerender(<UberDataUpload autoOpenToken="ready-v2" />);
    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(2));
  });

  it('hands a file-ready picker result through upload to the wrapped navigation boundary', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://uber-export.zip', name: 'uber-export.zip', size: 1024,
        mimeType: 'application/zip', lastModified: Date.now(),
      }],
    });
    (csvApi.importCsv as jest.Mock).mockResolvedValue({ importedCount: 12, message: 'Imported' });
    const onUploadSuccess = jest.fn();
    const view = render(
      <UberDataUpload autoOpenToken="ready-v3" onUploadSuccess={onUploadSuccess} />
    );

    await waitFor(() => expect(view.getByText('Upload')).toBeTruthy());
    fireEvent.press(view.getByText('Upload'));
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith(12));
  });
});
