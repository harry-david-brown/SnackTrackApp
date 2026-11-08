import * as FileSystem from 'expo-file-system/legacy';

const pickerDirectory = () => FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}DocumentPicker/` : null;

// React Native's URL implementation does not parse file: pathnames. Keep this
// boundary local-file-only and reject traversal instead of relying on that parser.
const localFilePath = (uri: string): string | null => {
  const decoded = decodeURIComponent(uri);
  if (/[\\\u0000-\u001f?#]/.test(decoded)) return null;
  const path = /^file:(?:\/\/)?(\/.*)$/.exec(decoded)?.[1];
  if (!path || path.split('/').some((part) => part === '.' || part === '..')) return null;
  return path;
};

/** Only the picker-owned sandbox directory is eligible, never a source document. */
export const isPickerCacheFile = (uri: string): boolean => {
  const root = pickerDirectory();
  if (!root) return false;
  try {
    const path = localFilePath(uri);
    const directory = localFilePath(root);
    return Boolean(path && directory && path.startsWith(directory) && path.length > directory.length && !path.endsWith('/'));
  } catch { return false; }
};

const remove = async (uri: string): Promise<void> => {
  if (!isPickerCacheFile(uri)) return;
  try { await FileSystem.deleteAsync(uri, { idempotent: true }); }
  catch { /* The startup sweep retries cache copies left by a failed delete or interrupted process. */ }
};

let preparation: Promise<void> | undefined;
export const prepareImportFileCache = (): Promise<void> => {
  if (!preparation) {
    preparation = (async () => {
      const directory = pickerDirectory();
      if (!directory) return;
      try {
        const info = await FileSystem.getInfoAsync(directory);
        if (!info.exists) return;
        for (const name of await FileSystem.readDirectoryAsync(directory)) {
          if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') continue;
          await remove(directory + encodeURIComponent(name));
        }
      } catch { /* Cache eviction or an unavailable filesystem can race startup. */ }
    })();
  }
  return preparation;
};

/** One mounted import session owns copies; an in-flight upload temporarily holds them. */
export class ImportFileCacheSession {
  private readonly owned = new Set<string>();
  private readonly pending = new Set<string>();
  private uploading: string | null = null;
  private closed = false;

  claim(uri: string): boolean {
    if (this.closed) { void remove(uri); return false; }
    this.owned.add(uri);
    return true;
  }
  holdForUpload(uri: string): void { this.uploading = uri; }
  release(uri: string): void {
    if (!this.owned.has(uri)) return;
    if (this.uploading === uri) { this.pending.add(uri); return; }
    this.owned.delete(uri);
    this.pending.delete(uri);
    void remove(uri);
  }
  finishUpload(): void {
    this.uploading = null;
    for (const uri of this.pending) this.release(uri);
  }
  releaseAll(): void { for (const uri of this.owned) this.release(uri); }
  close(): void { this.closed = true; this.releaseAll(); }
}
