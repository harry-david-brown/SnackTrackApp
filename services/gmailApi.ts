import api from './api';
import {
  normalizeDisconnectResponse,
  normalizeExportReadyCheck,
  normalizeGmailAuthUrl,
  normalizeGmailConnectionStatus,
  normalizeImportPreferences,
  normalizeSetupGuidance,
} from './normalizers/gmailNormalizers';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import type {
  ExportProvider,
  ExportReadyCheckResponse,
  GmailAuthUrlResponse,
  GmailConnectionStatus,
  ImportOperation,
  ImportJourneyContext,
  ImportPreferencesResponse,
  ProviderRelevance,
  SetupGuidance,
} from '@features/import-flow/contracts';
import { importOperationsApi } from './importOperationsApi';

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

  getSetupGuidance: async (): Promise<SetupGuidance> => {
    const response = await api.get<unknown>('/gmail/preferences/setup-guidance');
    return normalizeSetupGuidance(response.data);
  },

  setSetupDeferral: async (decision: 'defer' | 'resume'): Promise<SetupGuidance> => {
    const response = await api.put<unknown>('/gmail/preferences/setup-deferral', { decision });
    return normalizeSetupGuidance(response.data);
  },

  setProviderRelevance: async (
    provider: ExportProvider,
    relevance: ProviderRelevance,
  ): Promise<ImportPreferencesResponse> => {
    const response = await api.put<unknown>('/gmail/preferences/provider-relevance', {
      provider,
      relevance,
    });
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

  checkOngoingTracking: (): Promise<ImportOperation> => importOperationsApi.startTracking(),

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
  importReceipts: (journeyContext: ImportJourneyContext = 'legacy', automaticUpdates = false): Promise<ImportOperation> => importOperationsApi.startGmail(journeyContext, automaticUpdates),

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
