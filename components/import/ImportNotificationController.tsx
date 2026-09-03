import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import { useImportOperation } from '@hooks/useImportOperation';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId, notificationEnabledKey, notificationPromptKey } from '@utils/notificationInstallation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export const registerImportNotificationDevice = async (): Promise<void> => {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('imports', { name: 'Import updates', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationDeviceApi.register({ installationId: await getNotificationInstallationId(), token, platform: Platform.OS });
};

export function ImportNotificationController() {
  const { state } = useUser();
  const { operation } = useImportOperation(Boolean(state.user?.id));
  const prompting = useRef(false);

  useEffect(() => {
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data;
      if (data.type === 'import_operation' && typeof data.operationId === 'string') {
        router.push({ pathname: '/(tabs)/upload', params: { operationId: data.operationId } });
      }
    });
    return () => response.remove();
  }, []);

  useEffect(() => {
    const userId = state.user?.id;
    if (!userId || !operation || operation.trigger !== 'user' || !['pending_dispatch','queued','running','retrying'].includes(operation.status) || prompting.current) return;
    prompting.current = true;
    void (async () => {
      try {
        const key = notificationPromptKey(userId);
        const [prompted, enabledPreference] = await Promise.all([
          AsyncStorage.getItem(key),
          AsyncStorage.getItem(notificationEnabledKey(userId)),
        ]);
        if (enabledPreference === 'false') return;
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) {
          await registerImportNotificationDevice();
          await AsyncStorage.setItem(notificationEnabledKey(userId), 'true');
          return;
        }
        if (prompted) return;
        await AsyncStorage.setItem(key, 'true');
        const permission = await Notifications.requestPermissionsAsync();
        if (permission.granted) {
          await registerImportNotificationDevice();
          await AsyncStorage.setItem(notificationEnabledKey(userId), 'true');
        }
      } catch {
        // Import progress remains available through durable polling; a later
        // foreground/profile attempt can retry device registration.
      } finally {
        prompting.current = false;
      }
    })();
  }, [operation, state.user?.id]);
  return null;
}
