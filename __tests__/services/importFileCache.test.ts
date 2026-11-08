import * as FileSystem from 'expo-file-system/legacy';
import { ImportFileCacheSession, isPickerCacheFile, prepareImportFileCache } from '@services/importFileCache';

jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readDirectoryAsync: jest.fn().mockResolvedValue(['abandoned.zip']),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

it('sweeps abandoned cache copies before a picker can create a new one', async () => {
  await prepareImportFileCache();
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/DocumentPicker/abandoned.zip', { idempotent: true });
});

it('never removes original documents, another cache directory, or path traversal', () => {
  for (const uri of ['file:///documents/history.zip', 'content://documents/history.zip',
    'file:///cache/other/history.zip', 'file:///cache/DocumentPicker/../original.zip',
    'file:///cache/DocumentPicker/%2e%2e/original.zip', 'file:///cache/DocumentPicker/']) {
    expect(isPickerCacheFile(uri)).toBe(false);
  }
  expect(isPickerCacheFile('file:///cache/DocumentPicker/export%20history.zip')).toBe(true);
  expect(isPickerCacheFile('file:/cache/DocumentPicker/export.zip')).toBe(true);
  expect(isPickerCacheFile('file://remote/cache/DocumentPicker/export.zip')).toBe(false);
});

it('releases copies arriving after a session has already closed', () => {
  const session = new ImportFileCacheSession();
  session.close();
  expect(session.claim('file:///cache/DocumentPicker/late.zip')).toBe(false);
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/DocumentPicker/late.zip', { idempotent: true });
});
