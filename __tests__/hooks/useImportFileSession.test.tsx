import { act, renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 2048 }), readDirectoryAsync: jest.fn().mockResolvedValue([]), deleteAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@utils/platformAlert', () => ({ showSimpleAlert: jest.fn() }));
const file = { uri: 'file:///cache/DocumentPicker/history.zip', name: 'history.zip', lastModified: 0, size: 2048 };
beforeEach(() => { jest.clearAllMocks(); mockRetryId = undefined; mockUserId = 'user-1'; mockImport.mockResolvedValue({ id: 'accepted' }); jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [file] }); });
it('reviews a validated picker result before explicit submission', async () => {
  const { result } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  expect(mockImport).not.toHaveBeenCalled();
  expect(result.current.file?.name).toBe('history.zip');
  await act(async () => { await result.current.submit(); });
  expect(mockImport).toHaveBeenCalledWith(expect.objectContaining({ file: expect.objectContaining({ name: 'history.zip' }) }));
  expect(result.current.file).toBeNull();
  expect(result.current.operation?.id).toBe('accepted');
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
});
it('retains the retry association when the same file is selected again', async () => {
  const { result } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  await act(async () => { await result.current.choose(); });
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockImport).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
});
it('clears file and retry identity when the provider changes', async () => {
  const { result, rerender } = renderHook(({ provider }: { provider: 'uber_eats' | 'doordash' }) => useImportFileSession(provider, 'post_onboarding'), { initialProps: { provider: 'uber_eats' as 'uber_eats' | 'doordash' } });
  await act(async () => { await result.current.choose(); });
  rerender({ provider: 'doordash' });
  expect(result.current.file).toBeNull();
  expect(mockReset).toHaveBeenCalledTimes(2);
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
});
it('does not carry selected files into another signed-in user session', async () => {
  const { result, rerender } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  mockUserId = 'user-2'; rerender({});
  expect(result.current.file).toBeNull();
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
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
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
  const reopened = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  expect(reopened.result.current.file).toBeNull();
});

it('retains a failed submission for retry, then removes the copy after acceptance', async () => {
  mockImport.mockRejectedValueOnce(new Error('connection lost'));
  const { result } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  await act(async () => { await result.current.submit(); });
  expect(result.current.file).not.toBeNull();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  await act(async () => { await result.current.submit(); });
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
});

it('defers unmount cleanup until an in-flight upload finishes', async () => {
  let finish!: (operation: ImportOperation) => void;
  mockImport.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  let submitted!: Promise<ImportOperation | null>;
  await act(async () => { submitted = result.current.submit(); await Promise.resolve(); });
  unmount();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  await act(async () => { finish({ id: 'accepted' } as ImportOperation); await submitted; });
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
});

it('removes rejected picker copies and the previous copy when selection changes', async () => {
  const { result } = renderHook(() => useImportFileSession('uber_eats', 'post_onboarding'));
  await act(async () => { await result.current.choose(); });
  const other = { ...file, uri: 'file:///cache/DocumentPicker/other.zip' };
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [other] });
  await act(async () => { await result.current.choose(); });
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(file.uri, { idempotent: true });
  const invalid = { ...file, uri: 'file:///cache/DocumentPicker/invalid.pdf', name: 'invalid.pdf' };
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [invalid] });
  await act(async () => { await result.current.choose(); });
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(invalid.uri, { idempotent: true });
  expect(result.current.file?.uri).toBe(other.uri);
});
