import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId, notificationEnabledKey } from '@utils/notificationInstallation';

export const registerImportNotificationDevice = async (): Promise<void> => {
  if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('imports', {
      name: 'Import updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Notification registration is unavailable.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationDeviceApi.register({
    installationId: await getNotificationInstallationId(),
    token,
    platform: Platform.OS,
  });
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
