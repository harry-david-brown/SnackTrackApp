import { render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { UberDataUpload } from '../../components/upload/UberDataUpload';
import { useUser } from '../../contexts/UserContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

jest.mock('../../contexts/UserContext', () => ({ useUser: jest.fn() }));
jest.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('../../services/api', () => ({ csvApi: { importCsv: jest.fn() } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../utils/sentry', () => ({ captureException: jest.fn() }));
jest.mock('../../utils/alerts', () => ({ showAlert: jest.fn() }));

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
});
