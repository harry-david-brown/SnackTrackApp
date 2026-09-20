import { useCallback } from 'react';
import type { ImportPreferencesResponse } from '@features/import-flow/contracts';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { requestImportNotifications } from '@services/importNotifications';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';

type SetOngoingTrackingConsent = (
  decision: 'granted' | 'declined' | 'revoked',
) => Promise<ImportPreferencesResponse>;

export function useOngoingTrackingActivation(
  userId: string | undefined,
  setOngoingTrackingConsent: SetOngoingTrackingConsent,
  onNotificationStatusChange?: (enabled: boolean) => void,
) {
  const navigation = useAppNavigation();
  const enableOngoingTracking = useCallback(async (): Promise<ImportPreferencesResponse> => {
    const preferences = await setOngoingTrackingConsent('granted');
    if (!userId) return preferences;

    try {
      const notificationsEnabled = await requestImportNotifications(userId);
      onNotificationStatusChange?.(notificationsEnabled);
      if (notificationsEnabled) {
        showSimpleAlert(
          'Ongoing updates are on',
          'SnackTrack will keep checking for supported delivery orders and notify you when it finds one.',
        );
      } else {
        showAlert(
          'Ongoing updates are on',
          'SnackTrack will keep checking for supported delivery orders. Device notifications are off; you can enable them in Accounts & permissions.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Accounts & permissions', onPress: () => navigation.open(appDestinations.accountsPermissions) },
          ],
        );
      }
    } catch {
      onNotificationStatusChange?.(false);
      showSimpleAlert(
        'Ongoing updates are on',
        'SnackTrack will keep checking for supported delivery orders, but device notifications could not be enabled. Try again from Accounts & permissions.',
      );
    }

    return preferences;
  }, [navigation, onNotificationStatusChange, setOngoingTrackingConsent, userId]);

  return { enableOngoingTracking };
}
