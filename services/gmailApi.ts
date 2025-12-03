import api from './api';

export interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
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
}

export const gmailApi = {
  /**
   * Exchange OAuth access token for backend tokens
   * @param accessToken - OAuth access token from Google
   */
  exchangeToken: async (accessToken: string): Promise<GmailExchangeTokenResponse> => {
    const response = await api.post('/gmail/exchange-token', { 
      accessToken
    });
    
    if (__DEV__) {
      console.log(`✅ Gmail token exchange successful`);
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
   */
  importReceipts: async (replaceExisting: boolean = false): Promise<GmailImportResponse> => {
    const response = await api.post('/gmail/import', { replaceExisting });
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

