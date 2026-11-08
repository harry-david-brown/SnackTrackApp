import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { requestImportNotifications, supportsImportNotifications } from '@services/importNotifications';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId, notificationEnabledKey } from '@utils/notificationInstallation';

/** Shared device state for Settings and in-journey notification enrollment. */
export function useDeviceNotifications(userId?: string) {
  const client = useQueryClient();
  const supported = supportsImportNotifications();
  const key = ['device-notifications', userId ?? 'anonymous'];
  const [issue, setIssue] = useState<'denied' | 'registration' | null>(null);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId && supported),
    queryFn: async () => {
      const [permission, local] = await Promise.all([
        Notifications.getPermissionsAsync(), AsyncStorage.getItem(notificationEnabledKey(userId!)),
      ]);
      return permission.granted && local === 'true' && await notificationDeviceApi.isEnabled(await getNotificationInstallationId());
    },
  });
  const refresh = useCallback(() => { void client.invalidateQueries({ queryKey: ['device-notifications', userId ?? 'anonymous'] }); }, [client, userId]);
  useFocusEffect(refresh);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);
  useEffect(() => { if (query.data) setIssue(null); }, [query.data]);
  const enable = async () => {
    if (!userId || !supported) return false;
    try {
      const enabled = await requestImportNotifications(userId);
      client.setQueryData(key, enabled);
      setIssue(enabled ? null : 'denied');
      return enabled;
    } catch (error) { setIssue('registration'); throw error; }
  };
  const disable = async () => {
    if (!userId) return;
    await notificationDeviceApi.unregister(await getNotificationInstallationId());
    await AsyncStorage.setItem(notificationEnabledKey(userId), 'false');
    client.setQueryData(key, false);
    setIssue(null);
  };
  return { supported, enabled: query.data === true, issue, enable, disable, refresh,
    openSettings: () => { void Linking.openSettings(); } };
}
