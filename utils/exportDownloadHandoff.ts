import { clearImportJourneyStorage } from '@utils/importJourneyStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import type { ExportProvider } from '@features/import-flow/contracts';
import { parseImportReturnTo, type ImportReturnTo } from '@features/import-flow/importNavigation';

export type ExportDownloadHandoffState = 'not_downloaded' | 'checking_email' | 'downloaded';

interface StoredExportDownloadHandoff {
  readyVersion: string;
  state: ExportDownloadHandoffState;
  pendingRequest?: PendingExportRequest;
}

export interface PendingExportRequest { startedAt: number; returnTo: ImportReturnTo }

/** A seven-day local return hint, never evidence that a request was submitted. */
export async function getPendingExportRequest(userId: string, provider: ExportProvider, serverUpdatedAt?: string | null): Promise<PendingExportRequest | null> {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(storageKey(userId, provider)) ?? '{}');
    const pending = value.pendingRequest;
    if (!pending || typeof pending.startedAt !== 'number') return null;
    if (Date.now() - pending.startedAt > 7 * 24 * 60 * 60 * 1000 || (serverUpdatedAt && Date.parse(serverUpdatedAt) > pending.startedAt)) {
      await clearPendingExportRequest(userId, provider);
      return null;
    }
    return { startedAt: pending.startedAt, returnTo: parseImportReturnTo(pending.returnTo) };
  } catch { return null; }
}

export async function setPendingExportRequest(userId: string, provider: ExportProvider, returnTo: ImportReturnTo): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId, provider), JSON.stringify({ readyVersion: '', state: 'not_downloaded', pendingRequest: { startedAt: Date.now(), returnTo } }));
}

export async function clearPendingExportRequest(userId: string, provider: ExportProvider): Promise<void> {
  const serialized = await AsyncStorage.getItem(storageKey(userId, provider));
  if (!serialized) return;
  try {
    const stored = JSON.parse(serialized);
    delete stored.pendingRequest;
    await AsyncStorage.setItem(storageKey(userId, provider), JSON.stringify(stored));
  } catch { await AsyncStorage.removeItem(storageKey(userId, provider)); }
}

const STORAGE_KEY_PREFIX = 'export-download-handoff';
const LEGACY_STORAGE_KEY_PREFIX = 'uber-export-download-handoff';
const READY_NOTIFICATION_KEY_PREFIX = 'export-ready-notified';
const LEGACY_READY_NOTIFICATION_KEY_PREFIX = 'uber-export-ready-notified';
const GMAIL_APP_URL = 'googlegmail://';

export const UBER_EXPORT_EMAIL_SENDER_NAME = 'Uber – Download Your Data';
export const UBER_EXPORT_EMAIL_ADDRESS = 'noreply@uber.com';
export const UBER_EXPORT_EMAIL_SUBJECT = 'Your Uber data is ready for download';
export const UBER_EXPORT_EMAIL_ACTION = 'Go to Download Page';
export const UBER_EXPORT_EMAIL_SEARCH_QUERY =
  `from:${UBER_EXPORT_EMAIL_ADDRESS} subject:"${UBER_EXPORT_EMAIL_SUBJECT}"`;
export const UBER_EXPORT_GMAIL_SEARCH_URL =
  `https://mail.google.com/mail/#search/${encodeURIComponent(UBER_EXPORT_EMAIL_SEARCH_QUERY)}`;

const storageKey = (userId: string, provider: ExportProvider) => `${STORAGE_KEY_PREFIX}:${userId}:${provider}`;

export function getExportDownloadHandoffState(userId: string, readyVersion: string): Promise<ExportDownloadHandoffState>;
export function getExportDownloadHandoffState(userId: string, provider: ExportProvider, readyVersion: string): Promise<ExportDownloadHandoffState>;
export async function getExportDownloadHandoffState(
  userId: string,
  providerOrVersion: ExportProvider | string,
  maybeVersion?: string
): Promise<ExportDownloadHandoffState> {
  const provider: ExportProvider = maybeVersion ? providerOrVersion as ExportProvider : 'uber_eats';
  const readyVersion = maybeVersion ?? providerOrVersion;
  const storedValue = await AsyncStorage.getItem(storageKey(userId, provider));
  if (!storedValue) return 'not_downloaded';

  try {
    const stored = JSON.parse(storedValue) as Partial<StoredExportDownloadHandoff>;
    if (stored.readyVersion !== readyVersion) return 'not_downloaded';
    if (
      stored.state === 'not_downloaded'
      || stored.state === 'checking_email'
      || stored.state === 'downloaded'
    ) {
      return stored.state;
    }
  } catch {
    // Ignore malformed local state and restart the handoff safely.
  }

  return 'not_downloaded';
}

export function setExportDownloadHandoffState(userId: string, readyVersion: string, state: ExportDownloadHandoffState): Promise<void>;
export function setExportDownloadHandoffState(userId: string, provider: ExportProvider, readyVersion: string, state: ExportDownloadHandoffState): Promise<void>;
export async function setExportDownloadHandoffState(
  userId: string,
  providerOrVersion: ExportProvider | string,
  versionOrState: string | ExportDownloadHandoffState,
  maybeState?: ExportDownloadHandoffState
): Promise<void> {
  const provider: ExportProvider = maybeState ? providerOrVersion as ExportProvider : 'uber_eats';
  const readyVersion = maybeState ? versionOrState : providerOrVersion;
  const state = maybeState ?? versionOrState as ExportDownloadHandoffState;
  const value: StoredExportDownloadHandoff = { readyVersion, state };
  await AsyncStorage.setItem(storageKey(userId, provider), JSON.stringify(value));
}

export async function resetExportDownloadStateForUser(userId: string): Promise<void> {
  await clearImportJourneyStorage(userId);
  await Promise.all([
    AsyncStorage.removeItem(storageKey(userId, 'uber_eats')),
    AsyncStorage.removeItem(storageKey(userId, 'doordash')),
    AsyncStorage.removeItem(`${LEGACY_STORAGE_KEY_PREFIX}:${userId}`),
    AsyncStorage.removeItem(`${READY_NOTIFICATION_KEY_PREFIX}:${userId}:uber_eats`),
    AsyncStorage.removeItem(`${READY_NOTIFICATION_KEY_PREFIX}:${userId}:doordash`),
    AsyncStorage.removeItem(`${LEGACY_READY_NOTIFICATION_KEY_PREFIX}:${userId}`),
  ]);
}

export async function resetExportDownloadStateForProvider(
  userId: string,
  provider: ExportProvider,
): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId, provider));
}

/** Opens Gmail when installed, falling back to a focused Gmail web search. */
export async function openUberExportEmail(): Promise<'gmail_app' | 'gmail_web'> {
  try {
    await Linking.openURL(GMAIL_APP_URL);
    return 'gmail_app';
  } catch {
    // Continue to the portable Gmail web fallback.
  }

  await Linking.openURL(UBER_EXPORT_GMAIL_SEARCH_URL);
  return 'gmail_web';
}
