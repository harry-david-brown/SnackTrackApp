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
  newOrders?: number;
  updatedOrders?: number;
  unchangedOrders?: number;
}

export interface GmailAuthUrlResponse {
  success: boolean;
  authUrl: string;
}

export type MonitoringConsentState = 'not_offered' | 'declined' | 'granted' | 'revoked';
export type EffectiveMonitoringState =
  | 'not_offered'
  | 'declined'
  | 'enabled'
  | 'disabled'
  | 'reconnect_required';
export type ExportLifecycleStatus =
  | 'not_started'
  | 'requested_monitoring_enabled'
  | 'requested_monitoring_disabled'
  | 'file_ready'
  | 'import_processing'
  | 'completed'
  | 'failed';
export type GmailImportLifecycleStatus = 'never_started' | 'importing' | 'completed' | 'failed';
export type OngoingTrackingEffectiveState =
  | 'not_offered' | 'declined' | 'active' | 'paused' | 'reconnect_required' | 'error';

export interface ImportPreferencesResponse {
  monitoring: {
    consentState: MonitoringConsentState;
    consentVersion: string | null;
    consentedAt: string | null;
    revokedAt: string | null;
    effectiveState: EffectiveMonitoringState;
    capability: {
      gmailConnected: boolean;
      durableAccess: boolean;
      canMonitor: boolean;
    };
  };
  export: {
    status: ExportLifecycleStatus;
    requestedAt: string | null;
    updatedAt: string | null;
  };
  gmailImport: {
    status: GmailImportLifecycleStatus;
    updatedAt: string | null;
    importedCount: number;
    errorCode: string | null;
    receiptCount: number;
    hasImported: boolean;
  };
  ongoingTracking: {
    consentState: MonitoringConsentState;
    consentVersion: string | null;
    consentedAt: string | null;
    revokedAt: string | null;
    status: 'inactive' | 'active' | 'paused' | 'reconnect_required' | 'error';
    effectiveState: OngoingTrackingEffectiveState;
    capability: {
      gmailConnected: boolean;
      durableAccess: boolean;
      canTrack: boolean;
    };
    activity: {
      lastCheckAttemptAt: string | null;
      lastSuccessfulCheckAt: string | null;
      lastStatsUpdatedAt: string | null;
      lastNewOrderAt: string | null;
      ordersAddedThisWeek: number;
      lastErrorAt: string | null;
      lastErrorCode: string | null;
    };
  };
  coverage: {
    emailReceiptCount: number;
    exportReceiptCount: number;
    hasEmailData: boolean;
    hasExportData: boolean;
  };
}

export interface ExportReadyCheckResponse {
  detected: boolean;
  preferences: ImportPreferencesResponse;
}

export const MONITORING_CONSENT_VERSION = '2026-08-04.v2';
export const ONGOING_TRACKING_CONSENT_VERSION = '2026-08-10.v1';

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

  getImportPreferences: async (): Promise<ImportPreferencesResponse> => {
    const response = await api.get('/gmail/preferences');
    return response.data;
  },

  setMonitoringConsent: async (
    decision: 'granted' | 'declined' | 'revoked'
  ): Promise<ImportPreferencesResponse> => {
    const response = await api.put('/gmail/preferences/monitoring-consent', {
      decision,
      consentVersion: decision === 'granted' ? MONITORING_CONSENT_VERSION : undefined,
    });
    return response.data;
  },

  setOngoingTrackingConsent: async (
    decision: 'granted' | 'declined' | 'revoked'
  ): Promise<ImportPreferencesResponse> => {
    const response = await api.put('/gmail/preferences/ongoing-tracking-consent', {
      decision,
      consentVersion: decision === 'granted' ? ONGOING_TRACKING_CONSENT_VERSION : undefined,
    });
    return response.data;
  },

  checkOngoingTracking: async (): Promise<GmailImportResponse & { preferences: ImportPreferencesResponse }> => {
    const response = await api.post('/gmail/tracking/check', {}, { timeout: 300000 });
    return response.data;
  },

  markExportRequested: async (): Promise<ImportPreferencesResponse> => {
    const response = await api.post('/gmail/preferences/export-requested');
    return response.data;
  },

  checkExportReady: async (): Promise<ExportReadyCheckResponse> => {
    const response = await api.post('/gmail/preferences/check-export-ready');
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
