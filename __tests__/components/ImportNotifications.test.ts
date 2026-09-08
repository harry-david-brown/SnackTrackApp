import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { requestImportNotifications } from '@components/import/ImportNotificationController';
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project' } } } } }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'token' }), setNotificationChannelAsync: jest.fn(), AndroidImportance: { DEFAULT: 3 } }));
jest.mock('@services/notificationDeviceApi', () => ({ notificationDeviceApi: { register: jest.fn() } }));
jest.mock('@utils/notificationInstallation', () => ({ getNotificationInstallationId: jest.fn().mockResolvedValue('installation'), notificationEnabledKey: (id: string) => `enabled:${id}` }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never); });
it('explains denial without claiming successful registration', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as never);
  expect(await requestImportNotifications('user')).toBe(false);
  expect(notificationDeviceApi.register).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('enabled:user', 'false');
});
it('does not save an enabled setting if registration fails', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(notificationDeviceApi.register).mockRejectedValue(new Error('Registration failed'));
  await expect(requestImportNotifications('user')).rejects.toThrow('Registration failed');
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('enabled:user', 'true');
});
it('saves enabled only after the device is registered', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(notificationDeviceApi.register).mockResolvedValue(undefined as never);
  expect(await requestImportNotifications('user')).toBe(true);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('enabled:user', 'true');
});
