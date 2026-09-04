import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUser } from '@contexts/UserContext';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { showAlert } from '@utils/platformAlert';
import {
  getExportDownloadHandoffState,
  setExportDownloadHandoffState,
  UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS,
  UBER_EXPORT_EMAIL_ACTION,
  UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const NOTIFICATION_KEY_PREFIX = 'export-ready-notified';

/**
 * Checks for a requested Uber export when the signed-in app becomes active.
 * This is intentionally an in-app alert; SnackTrack never opens Uber's link or
 * downloads the archive without the user.
 */
export default function ExportReadyNotifier() {
  const { state } = useUser();
  const userId = state.user?.id;
  const { preferences, checkExportReady } = useImportPreferences(Boolean(userId));
  const uberExport = preferences?.export.providers.uberEats;
  const cachedReadyVersion = uberExport?.status === 'file_ready'
    ? uberExport.updatedAt ?? 'ready'
    : null;
  const canCheckForReadyExport = Boolean(
    preferences?.monitoring.consentState === 'granted'
      && preferences.monitoring.capability.canMonitor
      && uberExport?.status === 'requested'
      && uberExport.requestedAt,
  );
  const isCheckingRef = useRef(false);
  const lastCheckedAtRef = useRef(0);
  const readyVersionRef = useRef<string | null>(null);
  const isShowingDownloadPromptRef = useRef(false);

  const openImportForUpload = useCallback(async (readyVersion: string) => {
    if (!userId) return;
    await setExportDownloadHandoffState(userId, 'uber_eats', readyVersion, 'downloaded');
    router.push(
      `/data-tracking?focus=export&provider=uber_eats&downloadedVersion=${encodeURIComponent(readyVersion)}`
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
            void setExportDownloadHandoffState(userId, 'uber_eats', readyVersion, 'not_downloaded');
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

  const openDownloadGuide = useCallback(() => {
    isShowingDownloadPromptRef.current = false;
    router.push('/data-tracking?focus=export&provider=uber_eats&showExportTutorial=true');
  }, []);

  const showReadyPrompt = useCallback((readyVersion: string) => {
    if (!userId || isShowingDownloadPromptRef.current) return;
    isShowingDownloadPromptRef.current = true;

    showAlert(
      'Your Uber data is ready',
      `Find Uber’s “${UBER_EXPORT_EMAIL_SUBJECT}” email or text, then open the download page. Uber keeps the download available for ${UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS} days.\n\nHave you already saved the ZIP?`,
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            isShowingDownloadPromptRef.current = false;
            void setExportDownloadHandoffState(userId, 'uber_eats', readyVersion, 'not_downloaded');
          },
        },
        {
          text: 'Show Download Steps',
          onPress: openDownloadGuide,
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
  }, [openDownloadGuide, openImportForUpload, userId]);

  const handleReadyExport = useCallback(async (readyVersion: string) => {
    if (!userId) return;

    readyVersionRef.current = readyVersion;
    const handoffState = await getExportDownloadHandoffState(userId, 'uber_eats', readyVersion);
    if (handoffState === 'checking_email') {
      showDownloadFollowUp(readyVersion);
      return;
    }
    if (handoffState === 'downloaded') return;

    const notificationKey = `${NOTIFICATION_KEY_PREFIX}:${userId}:uber_eats`;
    const previouslyNotifiedVersion = await AsyncStorage.getItem(notificationKey);
    if (previouslyNotifiedVersion === readyVersion) return;

    await AsyncStorage.setItem(notificationKey, readyVersion);
    showReadyPrompt(readyVersion);
  }, [showDownloadFollowUp, showReadyPrompt, userId]);

  const checkForReadyExport = useCallback(async () => {
    if (!userId || isCheckingRef.current) return;

    if (cachedReadyVersion) {
      isCheckingRef.current = true;
      try {
        await handleReadyExport(cachedReadyVersion);
      } finally {
        isCheckingRef.current = false;
      }
      return;
    }
    if (!canCheckForReadyExport) return;

    const now = Date.now();
    if (now - lastCheckedAtRef.current < CHECK_INTERVAL_MS) return;

    isCheckingRef.current = true;
    lastCheckedAtRef.current = now;
    try {
      const result = await checkExportReady();
      const uberExport = result.preferences.export.providers.uberEats;
      if (uberExport.status !== 'file_ready') return;

      const readyVersion = uberExport.updatedAt ?? 'ready';
      await handleReadyExport(readyVersion);
    } catch {
      // This background check should never interrupt normal app use.
    } finally {
      isCheckingRef.current = false;
    }
  }, [cachedReadyVersion, canCheckForReadyExport, checkExportReady, handleReadyExport, userId]);

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
          void getExportDownloadHandoffState(userId, 'uber_eats', readyVersion).then((handoffState) => {
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
