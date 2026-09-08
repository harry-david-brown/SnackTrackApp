import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId, notificationEnabledKey } from '@utils/notificationInstallation';
import { beginAdForegroundSession } from '@features/ads/adSession';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export const registerImportNotificationDevice = async (): Promise<void> => {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('imports', { name: 'Import updates', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Notification registration is unavailable.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationDeviceApi.register({ installationId: await getNotificationInstallationId(), token, platform: Platform.OS });
};

export const requestImportNotifications = async (userId: string): Promise<boolean> => {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return false;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await AsyncStorage.setItem(notificationEnabledKey(userId), 'false');
    return false;
  }
  try {
    await registerImportNotificationDevice();
    await AsyncStorage.setItem(notificationEnabledKey(userId), 'true');
  } catch (error) {
    await AsyncStorage.setItem(notificationEnabledKey(userId), 'false').catch(() => undefined);
    throw error;
  }
  return true;
};

export function ImportNotificationController() {
  const { state } = useUser();
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
        router.push({ pathname: '/import-result', params: { operationId: data.operationId } });
      }
    });
    return () => response.remove();
  }, []);

  return null;
}
