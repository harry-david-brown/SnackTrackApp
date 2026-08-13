import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { useImportPreferences } from '../../hooks/useImportPreferences';
import { showAlert } from '../../utils/platformAlert';
import {
  getExportDownloadHandoffState,
  openUberExportEmail,
  setExportDownloadHandoffState,
  UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS,
  UBER_EXPORT_EMAIL_ACTION,
  UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SUBJECT,
} from '../../utils/exportDownloadHandoff';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const NOTIFICATION_KEY_PREFIX = 'uber-export-ready-notified';

/**
 * Checks for a requested Uber export when the signed-in app becomes active.
 * This is intentionally an in-app alert; SnackTrack never opens Uber's link or
 * downloads the archive without the user.
 */
export default function ExportReadyNotifier() {
  const { state } = useUser();
  const userId = state.user?.id;
  const { checkExportReady } = useImportPreferences(Boolean(userId));
  const isCheckingRef = useRef(false);
  const lastCheckedAtRef = useRef(0);
  const readyVersionRef = useRef<string | null>(null);
  const isShowingDownloadPromptRef = useRef(false);

  const openImportForUpload = useCallback(async (readyVersion: string) => {
    if (!userId) return;
    await setExportDownloadHandoffState(userId, readyVersion, 'downloaded');
    router.push(
      `/(tabs)/upload?focus=export&downloadedVersion=${encodeURIComponent(readyVersion)}`
    );
  }, [userId]);

  const showDownloadFollowUp = useCallback((readyVersion: string) => {
    if (!userId || isShowingDownloadPromptRef.current) return;
    isShowingDownloadPromptRef.current = true;

    showAlert(
      'Did you save the Uber ZIP?',
      `Were you able to tap “${UBER_EXPORT_EMAIL_ACTION}” and save the ZIP? If you downloaded it on a computer, transfer it to this device first.`,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void setExportDownloadHandoffState(userId, readyVersion, 'not_downloaded');
          },
        },
        {
          text: 'Choose the File',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void openImportForUpload(readyVersion);
          },
        },
      ]
    );
  }, [openImportForUpload, userId]);

  const openEmailForDownload = useCallback(async (readyVersion: string) => {
    if (!userId) return;

    await setExportDownloadHandoffState(userId, readyVersion, 'checking_email');
    try {
      await openUberExportEmail();
    } catch {
      await setExportDownloadHandoffState(userId, readyVersion, 'not_downloaded');
      showAlert(
        'Could not open Gmail',
        `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`,
        [{ text: 'OK' }]
      );
    }
  }, [userId]);

  const showReadyPrompt = useCallback((readyVersion: string) => {
    if (!userId || isShowingDownloadPromptRef.current) return;
    isShowingDownloadPromptRef.current = true;

    showAlert(
      'Your Uber data is ready',
      `In Gmail, look for “${UBER_EXPORT_EMAIL_SUBJECT}” from ${UBER_EXPORT_EMAIL_ADDRESS}. Open it and tap “${UBER_EXPORT_EMAIL_ACTION}.” Uber keeps the download available for ${UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS} days.\n\nHave you already saved the ZIP?`,
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void setExportDownloadHandoffState(userId, readyVersion, 'not_downloaded');
          },
        },
        {
          text: 'Open Gmail',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void openEmailForDownload(readyVersion);
          },
        },
        {
          text: 'Already Downloaded',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void openImportForUpload(readyVersion);
          },
        },
      ]
    );
  }, [openEmailForDownload, openImportForUpload, userId]);

  const checkForReadyExport = useCallback(async () => {
    if (!userId || isCheckingRef.current) return;

    const now = Date.now();
    if (now - lastCheckedAtRef.current < CHECK_INTERVAL_MS) return;

    isCheckingRef.current = true;
    lastCheckedAtRef.current = now;
    try {
      const result = await checkExportReady();
      if (result.preferences.export.status !== 'file_ready') return;

      const readyVersion = result.preferences.export.updatedAt ?? 'ready';
      readyVersionRef.current = readyVersion;
      const handoffState = await getExportDownloadHandoffState(userId, readyVersion);
      if (handoffState === 'checking_email') {
        showDownloadFollowUp(readyVersion);
        return;
      }
      if (handoffState === 'downloaded') return;

      const notificationKey = `${NOTIFICATION_KEY_PREFIX}:${userId}`;
      const previouslyNotifiedVersion = await AsyncStorage.getItem(notificationKey);
      if (previouslyNotifiedVersion === readyVersion) return;

      await AsyncStorage.setItem(notificationKey, readyVersion);
      showReadyPrompt(readyVersion);
    } catch {
      // This background check should never interrupt normal app use.
    } finally {
      isCheckingRef.current = false;
    }
  }, [checkExportReady, showDownloadFollowUp, showReadyPrompt, userId]);

  useEffect(() => {
    lastCheckedAtRef.current = 0;
    isCheckingRef.current = false;
    readyVersionRef.current = null;
    isShowingDownloadPromptRef.current = false;
  }, [userId]);

  useEffect(() => {
    void checkForReadyExport();
  }, [checkForReadyExport]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const readyVersion = readyVersionRef.current;
        if (readyVersion && userId) {
          void getExportDownloadHandoffState(userId, readyVersion).then((handoffState) => {
            if (handoffState === 'checking_email') {
              showDownloadFollowUp(readyVersion);
            } else {
              void checkForReadyExport();
            }
          });
        } else {
          void checkForReadyExport();
        }
      }
    });
    return () => subscription.remove();
  }, [checkForReadyExport, showDownloadFollowUp, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void checkForReadyExport();
      }
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForReadyExport]);

  return null;
}
