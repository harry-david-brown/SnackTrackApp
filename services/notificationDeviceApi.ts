import api from '@services/api';

export const notificationDeviceApi = {
  register: async (input: { installationId: string; token: string; platform: 'ios'|'android' }): Promise<void> => {
    await api.put('/notifications/device', input);
  },
  unregister: async (installationId: string): Promise<void> => {
    await api.delete(`/notifications/device/${encodeURIComponent(installationId)}`);
  },
};
