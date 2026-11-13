import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ExportDataUpload } from '@components/upload/UberDataUpload';

const mockImport = jest.fn();
const mockReset = jest.fn();
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'test-user' } } }) }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ type: 'wifi', isConnected: true, isInternetReachable: true }) }));
jest.mock('@hooks/useExportImport', () => ({ useExportImport: () => ({ importUberEatsFile: mockImport, importDoorDashFile: mockImport, isPending: false, error: null, reset: mockReset, uploadProgress: 0 }) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }) }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn(), showSimpleAlert: jest.fn() }));
jest.mock('@utils/sentry', () => ({ captureException: jest.fn() }));
const firstFile = { lastModified: 0, name: 'uber.zip', size: 1024, uri: 'file:///uber.zip' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [firstFile] });
  mockImport.mockResolvedValue({ id: 'operation-1' });
});
it('uploads immediately after file selection', async () => {
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose downloaded file'));
  await waitFor(() => expect(mockImport).toHaveBeenCalledWith(expect.objectContaining({ file: expect.objectContaining({ name: 'uber.zip' }), journeyContext: 'post_onboarding' })));
});
it('keeps the selected file when the user cancels choosing a replacement', async () => {
  mockImport.mockRejectedValueOnce(new Error('Connection interrupted'));
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose downloaded file'));
  await waitFor(() => expect(screen.getByText('uber.zip')).toBeTruthy());
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
  fireEvent.press(screen.getByText('Choose another file'));
  await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(2));
  expect(screen.getByText('uber.zip')).toBeTruthy();
  expect(mockImport).toHaveBeenCalledTimes(1);
});
it('clears the retry association when a replacement file is accepted', async () => {
  mockImport.mockRejectedValueOnce(new Error('Connection interrupted'));
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose downloaded file'));
  await waitFor(() => expect(screen.getByText('uber.zip')).toBeTruthy());
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ ...firstFile, name: 'newer.zip', uri: 'file:///newer.zip' }] });
  fireEvent.press(screen.getByText('Choose another file'));
  await waitFor(() => expect(mockImport).toHaveBeenLastCalledWith(expect.objectContaining({ file: expect.objectContaining({ name: 'newer.zip' }) })));
  expect(mockReset).toHaveBeenCalledTimes(2);
  expect(mockImport).toHaveBeenCalledTimes(2);
});
it('starts immediately during onboarding too', async () => {
  const screen = render(<ExportDataUpload journeyContext="onboarding" />);
  fireEvent.press(screen.getByText('Choose downloaded file'));
  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
});

it('accepts the CSV type reported by Android Downloads and submits the raw file', async () => {
  const asset = { ...firstFile, name: 'user_orders-0.csv', mimeType: 'text/comma-separated-values' };
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose downloaded file'));
  await waitFor(() => expect(mockImport).toHaveBeenCalledWith(expect.objectContaining({
    file: expect.objectContaining({ name: asset.name, type: 'text/csv' }),
  })));
  expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(expect.objectContaining({
    type: expect.arrayContaining([asset.mimeType]),
  }));
});
