import api from './api';
import {
  normalizeDisconnectResponse,
  normalizeExportReadyCheck,
  normalizeGmailAuthUrl,
  normalizeGmailConnectionStatus,
  normalizeGmailImportResponse,
  normalizeImportPreferences,
} from './normalizers/gmailNormalizers';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';

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
  connectionHealth?: 'disconnected' | 'valid' | 'reconnect_required' | 'unavailable';
  lastValidatedAt?: string | null;
}


export interface GmailImportResponse {
  success: boolean;
  code?: string | null;
  message?: string;
  totalEmailsFound: number;
  totalReceiptsProcessed: number;
  emailsExamined: number;
  supportedReceiptsFound: number;
  exportCoveredReceipts: number;
  eligibleReceipts: number;
  deduplicatedReceipts: number;
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
export type ExportProvider = 'uber_eats' | 'doordash';
export type ProviderExportLifecycleStatus =
  | 'not_started'
  | 'requested'
  | 'file_ready'
  | 'import_processing'
  | 'completed'
  | 'failed';
export interface ProviderExportState {
  provider: ExportProvider;
  status: ProviderExportLifecycleStatus;
  requestedAt: string | null;
  updatedAt: string | null;
  errorCode: string | null;
  readySource?: 'detected_email' | 'user_confirmed' | null;
}
export type GmailImportLifecycleStatus = 'never_started' | 'importing' | 'completed' | 'failed';
export type OngoingTrackingEffectiveState =
  | 'not_offered' | 'declined' | 'setting_up' | 'active' | 'paused' | 'reconnect_required' | 'error';

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
      needsReconnect?: boolean;
      connectionHealth?: GmailConnectionStatus['connectionHealth'];
      lastValidatedAt?: string | null;
      canMonitor: boolean;
    };
  };
  export: {
    /** Compatibility summary; provider-specific UI uses providers + coverage. */
    status: ExportLifecycleStatus;
    requestedAt: string | null;
    updatedAt: string | null;
    providers?: {
      uberEats: ProviderExportState;
      doorDash: ProviderExportState;
    };
  };
  gmailImport: {
    status: GmailImportLifecycleStatus;
    updatedAt: string | null;
    importedCount: number;
    errorCode: string | null;
    receiptCount: number;
    hasImported: boolean;
  };
  gmailBaseline?: {
    hasCompleted: boolean;
    completedAt: string | null;
    latestAttempt: {
      status: GmailImportLifecycleStatus;
      updatedAt: string | null;
      importedCount: number;
      errorCode: string | null;
    };
  };
  ongoingTracking: {
    consentState: MonitoringConsentState;
    consentVersion: string | null;
    consentedAt: string | null;
    revokedAt: string | null;
    status: 'inactive' | 'setting_up' | 'active' | 'paused' | 'reconnect_required' | 'error';
    effectiveState: OngoingTrackingEffectiveState;
    baseline?: {
      eligible: boolean;
      source: 'gmail' | 'exports' | 'none';
    };
    capability: {
      gmailConnected: boolean;
      durableAccess: boolean;
      needsReconnect?: boolean;
      connectionHealth?: GmailConnectionStatus['connectionHealth'];
      lastValidatedAt?: string | null;
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
    exportProviders: {
      uberEats: {
        receiptCount: number;
        hasData: boolean;
        earliestOrderDate?: string | null;
        latestOrderDate?: string | null;
      };
      doorDash: {
        receiptCount: number;
        hasData: boolean;
        earliestOrderDate?: string | null;
        latestOrderDate?: string | null;
      };
    };
  };
}

export interface ExportReadyCheckResponse {
  detected: boolean;
  preferences: ImportPreferencesResponse;
}

export const MONITORING_CONSENT_VERSION = '2026-08-04.v2';
export const ONGOING_TRACKING_CONSENT_VERSION = '2026-08-24.v2';

export const gmailApi = {
  getAuthUrl: async (redirectUri: string, purpose: GmailConnectionPurpose): Promise<GmailAuthUrlResponse> => {
    const response = await api.post<unknown>('/gmail/auth-url', { redirectUri, purpose });
    return normalizeGmailAuthUrl(response.data);
  },

  /**
   * Check Gmail connection status
   */
  getStatus: async (): Promise<GmailConnectionStatus> => {
    const response = await api.get<unknown>('/gmail/status');
    return normalizeGmailConnectionStatus(response.data);
  },

  getImportPreferences: async (): Promise<ImportPreferencesResponse> => {
    const response = await api.get<unknown>('/gmail/preferences');
    return normalizeImportPreferences(response.data);
  },

  setMonitoringConsent: async (
    decision: 'granted' | 'declined' | 'revoked'
  ): Promise<ImportPreferencesResponse> => {
    const response = await api.put<unknown>('/gmail/preferences/monitoring-consent', {
      decision,
      consentVersion: decision === 'granted' ? MONITORING_CONSENT_VERSION : undefined,
    });
    return normalizeImportPreferences(response.data);
  },

  setOngoingTrackingConsent: async (
    decision: 'granted' | 'declined' | 'revoked'
  ): Promise<ImportPreferencesResponse> => {
    const response = await api.put<unknown>('/gmail/preferences/ongoing-tracking-consent', {
      decision,
      consentVersion: decision === 'granted' ? ONGOING_TRACKING_CONSENT_VERSION : undefined,
    });
    return normalizeImportPreferences(response.data);
  },

  checkOngoingTracking: async (): Promise<GmailImportResponse & { preferences: ImportPreferencesResponse }> => {
    const response = await api.post<unknown>('/gmail/tracking/check', {}, { timeout: 300000 });
    const data = response.data as Record<string, unknown>;
    return { ...normalizeGmailImportResponse(data), preferences: normalizeImportPreferences(data.preferences) };
  },

  markExportRequested: async (provider: ExportProvider): Promise<ImportPreferencesResponse> => {
    const response = await api.post<unknown>('/gmail/preferences/export-requested', { provider });
    return normalizeImportPreferences(response.data);
  },

  confirmExportReady: async (provider: ExportProvider): Promise<ImportPreferencesResponse> => {
    const response = await api.post<unknown>('/gmail/preferences/export-ready', { provider });
    return normalizeImportPreferences(response.data);
  },

  checkExportReady: async (): Promise<ExportReadyCheckResponse> => {
    const response = await api.post<unknown>('/gmail/preferences/check-export-ready');
    return normalizeExportReadyCheck(response.data);
  },

  /**
   * Import receipts from Gmail
   * Incrementally merges new or updated Gmail receipts.
   * Note: This operation can take a while, so we use a longer timeout
   */
  importReceipts: async (): Promise<GmailImportResponse> => {
    const response = await api.post<unknown>('/gmail/import', {}, {
      timeout: 300000, // 5 minutes timeout for Gmail import (can take a while)
    });
    return normalizeGmailImportResponse(response.data);
  },

  /**
   * Disconnect Gmail account
   */
  disconnect: async (
    options: { resetImportStatus?: boolean } = {}
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<unknown>('/gmail/disconnect', options);
    return normalizeDisconnectResponse(response.data);
  },
};
