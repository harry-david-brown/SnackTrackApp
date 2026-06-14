import api from './api';

export interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
  canImport?: boolean;
  needsReconnect?: boolean;
  connectionMode?: 'none' | 'temporary' | 'offline';
  scopes?: string[];
  hasRequiredScope?: boolean;
  expiresAt?: string | null;
  statusMessage?: string;
}


export interface GmailImportResponse {
  success: boolean;
  totalEmailsFound: number;
  totalReceiptsProcessed: number;
  totalReceiptsImported: number;
  totalAmount: number;
  errors: string[];
}

export interface GmailAuthUrlResponse {
  success: boolean;
  authUrl: string;
}

let activeImportPromise: Promise<GmailImportResponse> | null = null;

export const gmailApi = {
  getAuthUrl: async (redirectUri: string, autoImportGmail = true): Promise<GmailAuthUrlResponse> => {
    const response = await api.post('/gmail/auth-url', { redirectUri, autoImportGmail });
    return response.data;
  },

  /**
   * Check Gmail connection status
   */
  getStatus: async (): Promise<GmailConnectionStatus> => {
    const response = await api.get('/gmail/status');
    return response.data;
  },

  /**
   * Import receipts from Gmail
   * Always replaces existing email-based receipts before importing new ones
   * Note: This operation can take a while, so we use a longer timeout
   */
  importReceipts: async (): Promise<GmailImportResponse> => {
    if (activeImportPromise) {
      return activeImportPromise;
    }

    activeImportPromise = api.post('/gmail/import', {}, {
      timeout: 300000, // 5 minutes timeout for Gmail import (can take a while)
    })
      .then((response) => response.data)
      .finally(() => {
        activeImportPromise = null;
      });

    return activeImportPromise;
  },

  /**
   * Disconnect Gmail account
   */
  disconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/gmail/disconnect');
    return response.data;
  },
};
