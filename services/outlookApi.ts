import api from './api';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import type {
  GmailAuthUrlResponse,
  ImportOperation,
  OutlookConnectionStatus,
} from '@features/import-flow/contracts';
import {
  normalizeDisconnectResponse,
  normalizeGmailAuthUrl,
  normalizeOutlookConnectionStatus,
} from './normalizers/gmailNormalizers';
import { importOperationsApi } from './importOperationsApi';

/** Microsoft Graph mailbox endpoints. Sign-in identity remains separate. */
export const outlookApi = {
  getAuthUrl: async (
    redirectUri: string,
    purpose: GmailConnectionPurpose,
  ): Promise<GmailAuthUrlResponse> => {
    const response = await api.post<unknown>('/outlook/auth-url', { redirectUri, purpose });
    return normalizeGmailAuthUrl(response.data);
  },

  getStatus: async (): Promise<OutlookConnectionStatus> => {
    const response = await api.get<unknown>('/outlook/status');
    return normalizeOutlookConnectionStatus(response.data);
  },

  importReceipts: (): Promise<ImportOperation> => importOperationsApi.startOutlook(),

  disconnect: async (
    options: { resetImportStatus?: boolean } = {},
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<unknown>('/outlook/disconnect', options);
    return normalizeDisconnectResponse(response.data);
  },
};
