import api from './api';
import { Platform } from 'react-native';

export interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
}

export interface GmailAuthUrlResponse {
  authUrl: string;
  state: string;
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
   * Get OAuth URL - automatically detects platform (web/mobile)
   */
  getAuthUrl: async (): Promise<GmailAuthUrlResponse> => {
    const platform = Platform.OS === 'web' ? 'web' : 'mobile';
    const response = await api.get(`/gmail/auth-url?platform=${platform}`);
    
    if (__DEV__) {
      console.log(`📧 Gmail OAuth URL requested - Platform: ${platform}`);
      console.log(`   Redirect URI: ${response.data.redirectUri}`);
    }
    
    return response.data;
  },

  /**
   * Exchange authorization code for tokens
   */
  exchangeToken: async (code: string): Promise<GmailExchangeTokenResponse> => {
    const platform = Platform.OS === 'web' ? 'web' : 'mobile';
    const response = await api.post('/gmail/exchange-token', { 
      code,
      platform 
    });
    
    if (__DEV__) {
      console.log(`✅ Gmail token exchange successful - Platform: ${platform}`);
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

