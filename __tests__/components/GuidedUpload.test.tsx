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
it('does not upload on selection; submits only after explicit review confirmation', async () => {
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose history file'));
  await waitFor(() => expect(screen.getByText('Import this file')).toBeTruthy());
  expect(mockImport).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Import this file'));
  await waitFor(() => expect(mockImport).toHaveBeenCalledWith(expect.objectContaining({ file: expect.objectContaining({ name: 'uber.zip' }), journeyContext: 'post_onboarding' })));
});
it('keeps the selected file when the user cancels choosing a replacement', async () => {
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose history file'));
  await waitFor(() => expect(screen.getByText('uber.zip')).toBeTruthy());
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
  fireEvent.press(screen.getByText('Choose another file'));
  await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(2));
  expect(screen.getByText('uber.zip')).toBeTruthy();
  expect(mockImport).not.toHaveBeenCalled();
});
it('clears the retry association when a replacement file is accepted', async () => {
  const screen = render(<ExportDataUpload journeyContext="post_onboarding" />);
  fireEvent.press(screen.getByText('Choose history file'));
  await waitFor(() => expect(screen.getByText('uber.zip')).toBeTruthy());
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ ...firstFile, name: 'newer.zip', uri: 'file:///newer.zip' }] });
  fireEvent.press(screen.getByText('Choose another file'));
  await waitFor(() => expect(screen.getByText('newer.zip')).toBeTruthy());
  expect(mockReset).toHaveBeenCalledTimes(2);
  expect(mockImport).not.toHaveBeenCalled();
});
it('requires review confirmation during onboarding too', async () => {
  const screen = render(<ExportDataUpload journeyContext="onboarding" />);
  fireEvent.press(screen.getByText('Choose history file'));
  await waitFor(() => expect(screen.getByText('uber.zip')).toBeTruthy());
  expect(mockImport).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Import this file'));
  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
});
