import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

export type ExportDownloadHandoffState = 'not_downloaded' | 'checking_email' | 'downloaded';

interface StoredExportDownloadHandoff {
  readyVersion: string;
  state: ExportDownloadHandoffState;
}

const STORAGE_KEY_PREFIX = 'uber-export-download-handoff';
const GMAIL_APP_URL = 'googlegmail://';

export const UBER_EXPORT_EMAIL_SENDER_NAME = 'Uber – Download Your Data';
export const UBER_EXPORT_EMAIL_ADDRESS = 'noreply@uber.com';
export const UBER_EXPORT_EMAIL_SUBJECT = 'Your Uber data is ready for download';
export const UBER_EXPORT_EMAIL_ACTION = 'Go to Download Page';
export const UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS = 7;
export const UBER_EXPORT_EMAIL_SEARCH_QUERY =
  `from:${UBER_EXPORT_EMAIL_ADDRESS} subject:"${UBER_EXPORT_EMAIL_SUBJECT}"`;
export const UBER_EXPORT_GMAIL_SEARCH_URL =
  `https://mail.google.com/mail/#search/${encodeURIComponent(UBER_EXPORT_EMAIL_SEARCH_QUERY)}`;

const storageKey = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

export async function getExportDownloadHandoffState(
  userId: string,
  readyVersion: string
): Promise<ExportDownloadHandoffState> {
  const storedValue = await AsyncStorage.getItem(storageKey(userId));
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

export async function setExportDownloadHandoffState(
  userId: string,
  readyVersion: string,
  state: ExportDownloadHandoffState
): Promise<void> {
  const value: StoredExportDownloadHandoff = { readyVersion, state };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(value));
}

/** Opens Gmail when installed, falling back to a focused Gmail web search. */
export async function openUberExportEmail(): Promise<'gmail_app' | 'gmail_web'> {
  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(GMAIL_APP_URL);
      return 'gmail_app';
    } catch {
      // Continue to the portable Gmail web fallback.
    }
  }

  await Linking.openURL(UBER_EXPORT_GMAIL_SEARCH_URL);
  return 'gmail_web';
}
