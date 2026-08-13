import type {
  EffectiveMonitoringState,
  ExportLifecycleStatus,
  ExportReadyCheckResponse,
  GmailAuthUrlResponse,
  GmailConnectionStatus,
  GmailImportLifecycleStatus,
  GmailImportResponse,
  ImportPreferencesResponse,
  MonitoringConsentState,
  OngoingTrackingEffectiveState,
} from '../gmailApi';

type UnknownRecord = Record<string, unknown>;
const invalid = (field: string): never => { throw new Error(`Invalid Gmail response: ${field}`); };
const record = (value: unknown, field: string): UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : invalid(field);
const string = (value: unknown, field: string): string => typeof value === 'string' ? value : invalid(field);
const boolean = (value: unknown, field: string): boolean => typeof value === 'boolean' ? value : invalid(field);
const number = (value: unknown, field: string): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : invalid(field);
const nullableString = (value: unknown, field: string): string | null => value === null ? null : string(value, field);
const optionalString = (value: unknown, field: string): string | undefined => value === undefined ? undefined : string(value, field);
const optionalBoolean = (value: unknown, field: string): boolean | undefined => value === undefined ? undefined : boolean(value, field);
const member = <T extends string>(value: unknown, values: readonly T[], field: string): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : invalid(field);

const consentStates = ['not_offered', 'declined', 'granted', 'revoked'] as const satisfies readonly MonitoringConsentState[];
const monitoringStates = ['not_offered', 'declined', 'enabled', 'disabled', 'reconnect_required'] as const satisfies readonly EffectiveMonitoringState[];
const exportStates = ['not_started', 'requested_monitoring_enabled', 'requested_monitoring_disabled', 'file_ready', 'import_processing', 'completed', 'failed'] as const satisfies readonly ExportLifecycleStatus[];
const gmailImportStates = ['never_started', 'importing', 'completed', 'failed'] as const satisfies readonly GmailImportLifecycleStatus[];
const trackingEffectiveStates = ['not_offered', 'declined', 'active', 'paused', 'reconnect_required', 'error'] as const satisfies readonly OngoingTrackingEffectiveState[];
const trackingStates = ['inactive', 'active', 'paused', 'reconnect_required', 'error'] as const;
const healthStates = ['disconnected', 'valid', 'reconnect_required', 'unavailable'] as const;
const connectionModes = ['none', 'temporary', 'offline'] as const;

export function normalizeGmailConnectionStatus(value: unknown): GmailConnectionStatus {
  const data = record(value, 'status');
  return {
    connected: boolean(data.connected, 'status.connected'),
    email: optionalString(data.email, 'status.email'),
    canImport: optionalBoolean(data.canImport, 'status.canImport'),
    needsReconnect: optionalBoolean(data.needsReconnect, 'status.needsReconnect'),
    connectionMode: data.connectionMode === undefined ? undefined : member(data.connectionMode, connectionModes, 'status.connectionMode'),
    scopes: data.scopes === undefined ? undefined : Array.isArray(data.scopes) ? data.scopes.map((item, index) => string(item, `status.scopes[${index}]`)) : invalid('status.scopes'),
    hasRequiredScope: optionalBoolean(data.hasRequiredScope, 'status.hasRequiredScope'),
    expiresAt: data.expiresAt === undefined ? undefined : nullableString(data.expiresAt, 'status.expiresAt'),
    statusMessage: optionalString(data.statusMessage, 'status.statusMessage'),
    connectionHealth: data.connectionHealth === undefined ? undefined : member(data.connectionHealth, healthStates, 'status.connectionHealth'),
    lastValidatedAt: data.lastValidatedAt === undefined ? undefined : nullableString(data.lastValidatedAt, 'status.lastValidatedAt'),
  };
}

export function normalizeImportPreferences(value: unknown): ImportPreferencesResponse {
  const data = record(value, 'preferences');
  const monitoring = record(data.monitoring, 'preferences.monitoring');
  const monitoringCapability = record(monitoring.capability, 'preferences.monitoring.capability');
  const exportState = record(data.export, 'preferences.export');
  const gmailImport = record(data.gmailImport, 'preferences.gmailImport');
  const tracking = record(data.ongoingTracking, 'preferences.ongoingTracking');
  const trackingCapability = record(tracking.capability, 'preferences.ongoingTracking.capability');
  const activity = record(tracking.activity, 'preferences.ongoingTracking.activity');
  const coverage = record(data.coverage, 'preferences.coverage');

  return {
    monitoring: {
      consentState: member(monitoring.consentState, consentStates, 'preferences.monitoring.consentState'),
      consentVersion: nullableString(monitoring.consentVersion, 'preferences.monitoring.consentVersion'),
      consentedAt: nullableString(monitoring.consentedAt, 'preferences.monitoring.consentedAt'),
      revokedAt: nullableString(monitoring.revokedAt, 'preferences.monitoring.revokedAt'),
      effectiveState: member(monitoring.effectiveState, monitoringStates, 'preferences.monitoring.effectiveState'),
      capability: {
        gmailConnected: boolean(monitoringCapability.gmailConnected, 'preferences.monitoring.capability.gmailConnected'),
        durableAccess: boolean(monitoringCapability.durableAccess, 'preferences.monitoring.capability.durableAccess'),
        needsReconnect: optionalBoolean(monitoringCapability.needsReconnect, 'preferences.monitoring.capability.needsReconnect'),
        connectionHealth: monitoringCapability.connectionHealth === undefined ? undefined : member(monitoringCapability.connectionHealth, healthStates, 'preferences.monitoring.capability.connectionHealth'),
        lastValidatedAt: monitoringCapability.lastValidatedAt === undefined ? undefined : nullableString(monitoringCapability.lastValidatedAt, 'preferences.monitoring.capability.lastValidatedAt'),
        canMonitor: boolean(monitoringCapability.canMonitor, 'preferences.monitoring.capability.canMonitor'),
      },
    },
    export: {
      status: member(exportState.status, exportStates, 'preferences.export.status'),
      requestedAt: nullableString(exportState.requestedAt, 'preferences.export.requestedAt'),
      updatedAt: nullableString(exportState.updatedAt, 'preferences.export.updatedAt'),
    },
    gmailImport: {
      status: member(gmailImport.status, gmailImportStates, 'preferences.gmailImport.status'),
      updatedAt: nullableString(gmailImport.updatedAt, 'preferences.gmailImport.updatedAt'),
      importedCount: number(gmailImport.importedCount, 'preferences.gmailImport.importedCount'),
      errorCode: nullableString(gmailImport.errorCode, 'preferences.gmailImport.errorCode'),
      receiptCount: number(gmailImport.receiptCount, 'preferences.gmailImport.receiptCount'),
      hasImported: boolean(gmailImport.hasImported, 'preferences.gmailImport.hasImported'),
    },
    ongoingTracking: {
      consentState: member(tracking.consentState, consentStates, 'preferences.ongoingTracking.consentState'),
      consentVersion: nullableString(tracking.consentVersion, 'preferences.ongoingTracking.consentVersion'),
      consentedAt: nullableString(tracking.consentedAt, 'preferences.ongoingTracking.consentedAt'),
      revokedAt: nullableString(tracking.revokedAt, 'preferences.ongoingTracking.revokedAt'),
      status: member(tracking.status, trackingStates, 'preferences.ongoingTracking.status'),
      effectiveState: member(tracking.effectiveState, trackingEffectiveStates, 'preferences.ongoingTracking.effectiveState'),
      capability: {
        gmailConnected: boolean(trackingCapability.gmailConnected, 'preferences.ongoingTracking.capability.gmailConnected'),
        durableAccess: boolean(trackingCapability.durableAccess, 'preferences.ongoingTracking.capability.durableAccess'),
        needsReconnect: optionalBoolean(trackingCapability.needsReconnect, 'preferences.ongoingTracking.capability.needsReconnect'),
        connectionHealth: trackingCapability.connectionHealth === undefined ? undefined : member(trackingCapability.connectionHealth, healthStates, 'preferences.ongoingTracking.capability.connectionHealth'),
        lastValidatedAt: trackingCapability.lastValidatedAt === undefined ? undefined : nullableString(trackingCapability.lastValidatedAt, 'preferences.ongoingTracking.capability.lastValidatedAt'),
        canTrack: boolean(trackingCapability.canTrack, 'preferences.ongoingTracking.capability.canTrack'),
      },
      activity: {
        lastCheckAttemptAt: nullableString(activity.lastCheckAttemptAt, 'preferences.ongoingTracking.activity.lastCheckAttemptAt'),
        lastSuccessfulCheckAt: nullableString(activity.lastSuccessfulCheckAt, 'preferences.ongoingTracking.activity.lastSuccessfulCheckAt'),
        lastStatsUpdatedAt: nullableString(activity.lastStatsUpdatedAt, 'preferences.ongoingTracking.activity.lastStatsUpdatedAt'),
        lastNewOrderAt: nullableString(activity.lastNewOrderAt, 'preferences.ongoingTracking.activity.lastNewOrderAt'),
        ordersAddedThisWeek: number(activity.ordersAddedThisWeek, 'preferences.ongoingTracking.activity.ordersAddedThisWeek'),
        lastErrorAt: nullableString(activity.lastErrorAt, 'preferences.ongoingTracking.activity.lastErrorAt'),
        lastErrorCode: nullableString(activity.lastErrorCode, 'preferences.ongoingTracking.activity.lastErrorCode'),
      },
    },
    coverage: {
      emailReceiptCount: number(coverage.emailReceiptCount, 'preferences.coverage.emailReceiptCount'),
      exportReceiptCount: number(coverage.exportReceiptCount, 'preferences.coverage.exportReceiptCount'),
      hasEmailData: boolean(coverage.hasEmailData, 'preferences.coverage.hasEmailData'),
      hasExportData: boolean(coverage.hasExportData, 'preferences.coverage.hasExportData'),
    },
  };
}

export function normalizeGmailImportResponse(value: unknown): GmailImportResponse {
  const data = record(value, 'import');
  const errors = Array.isArray(data.errors) ? data.errors.map((item, index) => string(item, `import.errors[${index}]`)) : invalid('import.errors');
  return {
    success: boolean(data.success, 'import.success'),
    code: data.code === undefined ? undefined : nullableString(data.code, 'import.code'),
    message: optionalString(data.message, 'import.message'),
    totalEmailsFound: number(data.totalEmailsFound, 'import.totalEmailsFound'),
    totalReceiptsProcessed: number(data.totalReceiptsProcessed, 'import.totalReceiptsProcessed'),
    totalReceiptsImported: number(data.totalReceiptsImported, 'import.totalReceiptsImported'),
    totalAmount: number(data.totalAmount, 'import.totalAmount'),
    errors,
    newOrders: data.newOrders === undefined ? undefined : number(data.newOrders, 'import.newOrders'),
    updatedOrders: data.updatedOrders === undefined ? undefined : number(data.updatedOrders, 'import.updatedOrders'),
    unchangedOrders: data.unchangedOrders === undefined ? undefined : number(data.unchangedOrders, 'import.unchangedOrders'),
  };
}

export function normalizeGmailAuthUrl(value: unknown): GmailAuthUrlResponse {
  const data = record(value, 'authUrl');
  return { success: boolean(data.success, 'authUrl.success'), authUrl: string(data.authUrl, 'authUrl.authUrl') };
}

export function normalizeExportReadyCheck(value: unknown): ExportReadyCheckResponse {
  const data = record(value, 'exportReady');
  return { detected: boolean(data.detected, 'exportReady.detected'), preferences: normalizeImportPreferences(data.preferences) };
}

export function normalizeDisconnectResponse(value: unknown): { success: boolean; message: string } {
  const data = record(value, 'disconnect');
  return { success: boolean(data.success, 'disconnect.success'), message: string(data.message, 'disconnect.message') };
}
