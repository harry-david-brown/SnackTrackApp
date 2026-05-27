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

export interface GmailExchangeTokenResponse {
  success: boolean;
  message: string;
  connected: boolean;
  connectionMode?: 'temporary' | 'offline';
  expiresAt?: string | null;
  scopes?: string[];
}

export const gmailApi = {
  /**
   * Exchange OAuth access token for backend tokens
   * @param accessToken - OAuth access token from Google
   * @param refreshToken - OAuth refresh token from Google (optional)
   */
  exchangeToken: async (accessToken: string, refreshToken?: string): Promise<GmailExchangeTokenResponse> => {
    const response = await api.post('/gmail/exchange-token', { 
      accessToken,
      refreshToken
    });
    
    if (__DEV__) {
      console.log(`✅ Gmail token exchange successful`, { hasRefreshToken: !!refreshToken });
    }
    
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
    const response = await api.post('/gmail/import', {}, {
      timeout: 300000, // 5 minutes timeout for Gmail import (can take a while)
    });
    return response.data;
  },

  /**
   * Disconnect Gmail account
   */
  disconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/gmail/disconnect');
    return response.data;
  },
};
