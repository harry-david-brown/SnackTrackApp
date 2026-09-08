import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { UberDataUpload } from '@components/upload/UberDataUpload';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

const mockImportFile = jest.fn();

jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@hooks/useExportImport', () => ({
  useExportImport: () => ({
    importUberEatsFile: mockImportFile,
    importDoorDashFile: mockImportFile,
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}));
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@utils/sentry', () => ({ captureException: jest.fn() }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn(), showSimpleAlert: jest.fn() }));

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

  it('reviews an automatically opened file before submission and completion', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://uber-export.zip', name: 'uber-export.zip', size: 1024,
        mimeType: 'application/zip', lastModified: Date.now(),
      }],
    });
    mockImportFile.mockResolvedValue({
      importedCount: 12,
      totalAmount: 42,
      message: 'Imported',
      fileType: 'zip',
      provider: 'uber_eats',
    });
    const onUploadSuccess = jest.fn();
    const view = render(
      <UberDataUpload autoOpenToken="ready-v3" onUploadSuccess={onUploadSuccess} />
    );

    await waitFor(() => expect(view.getByText('Import this file')).toBeTruthy());
    expect(mockImportFile).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Import this file'));
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith({
      importedCount: 12,
      totalAmount: 42,
      message: 'Imported',
      fileType: 'zip',
      provider: 'uber_eats',
    }));
  });
});
