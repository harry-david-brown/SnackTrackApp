import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import api from '@services/api';
import { getUserId } from '@utils/tokenManager';
import { mailboxAuthorizationKey, type MailboxAuthorizationProvider } from '@utils/mailboxAuthorizationStorage';

const expired = () => new Error('This email connection belongs to another session or has expired. Start the connection again.');
const completions = new Map<string, { expiresAt: number; result: Promise<void> }>();

/** The verifier stays in this device's secure storage; it is never placed in the browser URL. */
export const beginMailboxAuthorization = async (provider: MailboxAuthorizationProvider, userId: string): Promise<string> => {
  if (await getUserId() !== userId) throw expired();
  const verifier = Array.from(await Crypto.getRandomBytesAsync(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  await SecureStore.setItemAsync(mailboxAuthorizationKey(provider), JSON.stringify({
    userId, verifier, expiresAt: Date.now() + 600_000,
  }));
  return challenge;
};

/** Shared by the browser result and cold-start callback route; a callback is redeemed at most once. */
export const finishMailboxAuthorization = (provider: MailboxAuthorizationProvider, userId: string,
  completionToken: string | null): Promise<void> => {
  if (!completionToken || !/^[a-f0-9]{64}$/.test(completionToken)) return Promise.reject(expired());
  for (const [key, entry] of completions) if (entry.expiresAt <= Date.now()) completions.delete(key);
  const key = `${userId}:${provider}:${completionToken}`;
  const existing = completions.get(key);
  if (existing) return existing.result;
  const result = (async () => {
    const storageKey = mailboxAuthorizationKey(provider);
    const stored = await SecureStore.getItemAsync(storageKey);
    const pending: unknown = stored ? JSON.parse(stored) : null;
    if (!pending || typeof pending !== 'object' || !('userId' in pending) || pending.userId !== userId ||
      !('verifier' in pending) || typeof pending.verifier !== 'string' ||
      !('expiresAt' in pending) || typeof pending.expiresAt !== 'number' || pending.expiresAt <= Date.now() ||
      await getUserId() !== userId) throw expired();
    const response = await api.post<unknown>(`/${provider}/complete`, { completionToken, verifier: pending.verifier });
    const body = response.data;
    if (!body || typeof body !== 'object' || !('success' in body) || body.success !== true) throw expired();
    if (await getUserId() !== userId) throw expired();
    // Do not erase a newer attempt if the user started another connection while this one completed.
    if (await SecureStore.getItemAsync(storageKey) === stored) await SecureStore.deleteItemAsync(storageKey);
  })();
  completions.set(key, { expiresAt: Date.now() + 600_000, result });
  return result;
};
