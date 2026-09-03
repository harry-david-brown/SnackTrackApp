import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALLATION_KEY = '@snacktrack:notification-installation';
export const notificationPromptKey = (userId: string): string => `@snacktrack:notification-prompted:${userId}`;
export const notificationEnabledKey = (userId: string): string => `@snacktrack:notification-enabled:${userId}`;

export const getNotificationInstallationId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
};
