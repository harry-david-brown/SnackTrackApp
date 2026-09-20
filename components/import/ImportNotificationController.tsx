import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useUser } from '@contexts/UserContext';
import { beginAdForegroundSession } from '@features/ads/adSession';
import { useAppNavigation } from '@features/navigation';

export {
  registerImportNotificationDevice,
  requestImportNotifications,
} from '@services/importNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function ImportNotificationController() {
  const { state } = useUser();
  const { dispatchExternalNavigation } = useAppNavigation();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') backgroundedAt.current = Date.now();
      if (next === 'active' && state.user?.id && backgroundedAt.current && Date.now() - backgroundedAt.current >= 30_000) {
        beginAdForegroundSession(state.user.id);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [state.user?.id]);

  useEffect(() => {
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data;
      if (data.type === 'import_operation' && typeof data.operationId === 'string') {
        dispatchExternalNavigation({
          kind: 'import-result',
          source: 'notification',
          operationId: data.operationId,
        });
      }
    });
    return () => response.remove();
  }, [dispatchExternalNavigation]);

  return null;
}
