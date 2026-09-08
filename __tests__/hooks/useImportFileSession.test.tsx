import { act, renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { ImportOperation } from '@features/import-flow/contracts';
import { useImportFileSession } from '@hooks/useImportFileSession';
const mockReset = jest.fn();
const mockImport = jest.fn();
let mockRetryId: string | undefined;
let mockUserId = 'user-1';
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: mockUserId } } }) }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isConnected: true, type: 'wifi' }) }));
jest.mock('@hooks/useExportImport', () => ({ useExportImport: () => ({ importUberEatsFile: mockImport, importDoorDashFile: mockImport, reset: mockReset, retryOperationId: mockRetryId, isPending: false, error: null, uploadProgress: 0 }) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 2048 }) }));
jest.mock('@utils/platformAlert', () => ({ showSimpleAlert: jest.fn() }));
const file = { uri: 'file:///history.zip', name: 'history.zip', lastModified: 0, size: 2048 };
beforeEach(() => { jest.clearAllMocks(); mockRetryId = undefined; mockUserId = 'user-1'; jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [file] }); });
it('retains the retry association when the same file is selected again', async () => {
  const { result } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  await act(async () => { await result.current.choose(); });
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockImport).not.toHaveBeenCalled();
});
it('clears file and retry identity when the provider changes', async () => {
  const { result, rerender } = renderHook(({ provider }: { provider: 'uber_eats' | 'doordash' }) => useImportFileSession(provider, 'post_onboarding'), { initialProps: { provider: 'uber_eats' as 'uber_eats' | 'doordash' } });
  await act(async () => { await result.current.choose(); });
  rerender({ provider: 'doordash' });
  expect(result.current.file).toBeNull();
  expect(mockReset).toHaveBeenCalledTimes(2);
});
it('does not carry selected files into another signed-in user session', async () => {
  const { result, rerender } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  mockUserId = 'user-2'; rerender({});
  expect(result.current.file).toBeNull();
});
it('resolves a lost submission response from the matching accepted operation', async () => {
  let activeOperation: ImportOperation | null = null;
  const { result, rerender } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding', false, activeOperation));
  await act(async () => { await result.current.choose(); });
  mockRetryId = 'accepted'; activeOperation = { id: 'accepted', status: 'queued' } as ImportOperation;
  rerender({});
  expect(result.current.operation?.id).toBe('accepted');
  expect(result.current.file).toBeNull();
  expect(mockImport).not.toHaveBeenCalled();
});
it('does not adopt another file’s operation or persist files across closing', async () => {
  const { result, unmount, rerender } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding', true, { id: 'other', status: 'queued' } as ImportOperation));
  await act(async () => { await result.current.choose(); });
  mockRetryId = 'mine'; rerender({});
  expect(result.current.operation).toBeNull();
  unmount();
  const reopened = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  expect(reopened.result.current.file).toBeNull();
});
