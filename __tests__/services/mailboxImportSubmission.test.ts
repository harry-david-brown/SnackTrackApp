import AsyncStorage from '@react-native-async-storage/async-storage';
import { importOperationsApi } from '@services/importOperationsApi';
import { resumeOrSubmitMailboxImport } from '@services/mailboxImportSubmission';
import type { ImportOperation } from '@features/import-flow/contracts';
jest.mock('@services/importOperationsApi', () => ({ importOperationsApi: { getActive: jest.fn() } }));
const storage = new Map<string, string>();
beforeEach(() => {
  jest.clearAllMocks(); storage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => { storage.delete(key); });
  jest.mocked(importOperationsApi.getActive).mockResolvedValue(null);
});
it.each(['gmail', 'outlook'] as const)('reuses the %s submission key after a lost response', async mailbox => {
  const job = { id: 'accepted', kind: `${mailbox}_historical`, status: 'queued' } as ImportOperation;
  const submit = jest.fn().mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce(job);
  await expect(resumeOrSubmitMailboxImport('user', mailbox, submit)).rejects.toThrow('response lost');
  await expect(resumeOrSubmitMailboxImport('user', mailbox, submit)).resolves.toBe(job);
  expect(submit.mock.calls[0][0]).toBe(submit.mock.calls[1][0]);
  expect(storage.size).toBe(0);
});
it('resumes accepted work before starting another inbox', async () => {
  const job = { id: 'existing', kind: 'export_file', status: 'running' } as ImportOperation;
  jest.mocked(importOperationsApi.getActive).mockResolvedValue(job);
  const submit = jest.fn();
  expect(await resumeOrSubmitMailboxImport('user', 'outlook', submit)).toBe(job);
  expect(submit).not.toHaveBeenCalled();
});
it('does not submit while the status of existing work is unknown', async () => {
  jest.mocked(importOperationsApi.getActive).mockRejectedValue(new Error('offline'));
  const submit = jest.fn();
  await expect(resumeOrSubmitMailboxImport('user', 'gmail', submit)).rejects.toThrow();
  expect(submit).not.toHaveBeenCalled();
});
