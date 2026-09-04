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
import { experienceApi } from '@services/experienceApi';
import { beginAdForegroundSession, suppressAdsForSession } from '@features/ads/adSession';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';

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

export const requestImportNotifications = async (userId: string): Promise<boolean> => {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return false;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await AsyncStorage.setItem(notificationEnabledKey(userId), 'false');
    return false;
  }
  await registerImportNotificationDevice();
  await AsyncStorage.setItem(notificationEnabledKey(userId), 'true');
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
        const operationId = data.operationId;
        void experienceApi.getState().then(experience => {
          if (resolvePostImportDestination({ experience }) === 'automatic_recap') {
            if (state.user?.id) suppressAdsForSession(state.user.id);
            router.push({ pathname: '/(tabs)/wrapped-journey', params: { auto: 'true', entryPoint: 'notification' } });
          } else {
            router.push({ pathname: '/data-tracking', params: { operationId } });
          }
        }).catch(() => router.push({ pathname: '/data-tracking', params: { operationId } }));
      }
    });
    return () => response.remove();
  }, [state.user?.id]);

  return null;
}
