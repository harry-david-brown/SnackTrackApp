import api from '@services/api';

export const notificationDeviceApi = {
  isEnabled: async (installationId: string): Promise<boolean> => {
    const response=await api.get<{enabled: unknown}>(`/notifications/device/${encodeURIComponent(installationId)}`);
    if (typeof response.data.enabled !== 'boolean') throw new Error('Invalid notification registration status.');
    return response.data.enabled;
  },
  register: async (input: { installationId: string; token: string; platform: 'ios'|'android' }): Promise<void> => {
    await api.put('/notifications/device', input);
  },
  unregister: async (installationId: string): Promise<void> => {
    await api.delete(`/notifications/device/${encodeURIComponent(installationId)}`);
  },
};
