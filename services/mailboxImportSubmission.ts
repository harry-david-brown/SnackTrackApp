import AsyncStorage from '@react-native-async-storage/async-storage';
import { isActiveImportOperation, type ImportOperation, type MailboxProvider } from '@features/import-flow/contracts';
import { importOperationsApi } from '@services/importOperationsApi';

export class ImportStatusUnavailableError extends Error {}

/** A lost start response must reuse its request key, including after app restart. */
export async function resumeOrSubmitMailboxImport(userId: string, mailbox: MailboxProvider, submit: (key: string) => Promise<ImportOperation>): Promise<ImportOperation> {
  const active = await importOperationsApi.getActive().catch(() => { throw new ImportStatusUnavailableError('Import status is unavailable.'); });
  if (active && isActiveImportOperation(active)) return active;
  const storageKey = `import-journey:${userId}:submission:${mailbox}`;
  const stored = await AsyncStorage.getItem(storageKey);
  const key = stored ?? `${mailbox}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  if (!stored) await AsyncStorage.setItem(storageKey, key);
  const operation = await submit(key);
  await AsyncStorage.removeItem(storageKey).catch(() => undefined);
  return operation;
}
