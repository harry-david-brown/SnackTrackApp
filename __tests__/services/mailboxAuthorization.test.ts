import * as SecureStore from 'expo-secure-store';
import api from '@services/api';
import { getUserId } from '@utils/tokenManager';
import { beginMailboxAuthorization, finishMailboxAuthorization } from '@services/mailboxAuthorization';
import { scrubAuthTelemetry } from '@utils/authTelemetry';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(32).fill(10)),
  digestStringAsync: jest.fn(async () => 'b'.repeat(64)),
}));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('@services/api', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@utils/tokenManager', () => ({ getUserId: jest.fn() }));

let stored: string | null;
beforeEach(() => {
  jest.clearAllMocks();
  stored = null;
  (getUserId as jest.Mock).mockResolvedValue('account-a');
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_key, value) => { stored = value; });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async () => stored);
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async () => { stored = null; });
  (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
});

it('stores the private verifier on the device and shares completion between browser and callback', async () => {
  expect(await beginMailboxAuthorization('gmail', 'account-a')).toBe('b'.repeat(64));
  expect(JSON.parse(stored!).verifier).toBe('0a'.repeat(32));
  const first = finishMailboxAuthorization('gmail', 'account-a', '1'.repeat(64));
  const second = finishMailboxAuthorization('gmail', 'account-a', '1'.repeat(64));
  expect(first).toBe(second);
  await first;
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/gmail/complete', { completionToken: '1'.repeat(64), verifier: '0a'.repeat(32) });
  expect(stored).toBeNull();
});

it('rejects callbacks from another device or account before sending a completion request', async () => {
  await expect(finishMailboxAuthorization('outlook', 'account-a', '2'.repeat(64))).rejects.toThrow();
  await beginMailboxAuthorization('outlook', 'account-a');
  (getUserId as jest.Mock).mockResolvedValue('account-b');
  await expect(finishMailboxAuthorization('outlook', 'account-b', '3'.repeat(64))).rejects.toThrow();
  await expect(finishMailboxAuthorization('outlook', 'account-a', '4'.repeat(64))).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});

it('rejects expired attempts and fabricated or old success callbacks', async () => {
  stored = JSON.stringify({ userId: 'account-a', verifier: 'a'.repeat(64), expiresAt: 1 });
  await expect(finishMailboxAuthorization('gmail', 'account-a', '5'.repeat(64))).rejects.toThrow();
  await expect(finishMailboxAuthorization('gmail', 'account-a', null)).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});

it('scrubs handoff secrets in nested telemetry, serialized requests, and navigation URLs', () => {
  const scrubbed = JSON.stringify(scrubAuthTelemetry({
    request: { data: JSON.stringify({ verifier: 'private-device-value', completionToken: 'private-completion-value' }) },
    breadcrumbs: [{ data: { url: 'snacktrack://oauth-callback?completionToken=private-url-value' } }],
  }));
  expect(scrubbed).not.toContain('private-device-value');
  expect(scrubbed).not.toContain('private-completion-value');
  expect(scrubbed).not.toContain('private-url-value');
});
