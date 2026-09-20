/** Normalized import-flow domain contracts consumed by hooks, resolvers, and UI. */
export interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
  canImport?: boolean;
  needsReconnect?: boolean;
  connectionMode?: "none" | "temporary" | "offline";
  scopes?: string[];
  hasRequiredScope?: boolean;
  expiresAt?: string | null;
  statusMessage?: string;
  connectionHealth?:
    "disconnected" | "valid" | "reconnect_required" | "unavailable";
  lastValidatedAt?: string | null;
}

export interface OutlookConnectionStatus {
  provider: "microsoft";
  connected: boolean;
  email: string | null;
  canImport: boolean;
  needsReconnect: boolean;
  connectionMode: "none" | "temporary" | "offline";
  scopes: string[];
  hasRequiredScope: boolean;
  expiresAt: string | null;
  statusMessage: string;
  connectionHealth:
    | "disconnected"
    | "valid"
    | "reconnect_required"
    | "unavailable";
  lastValidatedAt: string | null;
}

export type MailboxProvider = "gmail" | "outlook";

export interface GmailImportResponse {
  success: boolean;
  code: string | null;
  totalEmailsFound: number;
  totalReceiptsProcessed: number;
  emailsExamined: number;
  supportedReceiptsFound: number;
  exportCoveredReceipts: number;
  eligibleReceipts: number;
  deduplicatedReceipts: number;
  totalReceiptsImported: number;
  totalAmount: number | null;
  currencyCode?: string | null;
  receiptOutcome?: import('./receiptImportOutcome').ReceiptImportOutcome;
  errors: string[];
  newOrders: number;
  updatedOrders: number;
  unchangedOrders: number;
}

export interface GmailAuthUrlResponse {
  success: boolean;
  authUrl: string;
}

export type MonitoringConsentState =
  "not_offered" | "declined" | "granted" | "revoked";
export type EffectiveMonitoringState =
  "not_offered" | "declined" | "enabled" | "disabled" | "reconnect_required";
export type ExportProvider = "uber_eats" | "doordash";
export type ProviderRelevance = "unknown" | "not_used";

export interface SetupGuidance {
  initialSetupDeferredUntil: string | null;
}

export interface ExportImportResult {
  readonly message: string;
  readonly importedCount: number;
  readonly totalAmount: number | null;
  readonly currencyCode?: string | null;
  readonly receiptOutcome?: import('./receiptImportOutcome').ReceiptImportOutcome;
  readonly fileType: "csv" | "zip";
  readonly provider: ExportProvider;
}

export type ImportOperationKind =
  | "gmail_historical"
  | "outlook_historical"
  | "manual_tracking"
  | "scheduled_tracking"
  | "export_file"
  | "gmail_push_tracking"
  | "receipt_rebuild"
  | "receipt_publish"
  | "receipt_rollback";
export type ImportJourneyContext = "onboarding" | "post_onboarding" | "routine" | "legacy";
export type ImportOperationStatus =
  | "awaiting_upload"
  | "pending_dispatch"
  | "queued"
  | "running"
  | "retrying"
  | "succeeded"
  | "failed"
  | "expired"
  | "superseded"
  | "cancelled";
export interface ImportTimeEstimate {
  readonly kind: "total" | "remaining" | "retry_wait" | "finishing";
  readonly minimumMinutes: number | null;
  readonly maximumMinutes: number | null;
  readonly revision: number;
}
export interface ImportOperationPresentation {
  readonly mode: "foreground" | "delayed";
  readonly expectedDurationBand: "under_5_minutes" | "over_5_minutes" | "unknown";
  readonly reason: "normal" | "queue_backlog" | "workers_unavailable" | "queue_paused" | "retrying" | "elapsed_over_threshold";
  readonly stage: "waiting" | "discovering" | "building_history" | "preparing_recap";
  readonly discoveredOrderCount: number | null;
  readonly timeEstimate: ImportTimeEstimate | null;
}
export interface ImportOperation {
  readonly id: string;
  readonly kind: ImportOperationKind;
  readonly trigger: "user" | "scheduler";
  readonly journeyContext: ImportJourneyContext;
  readonly status: ImportOperationStatus;
  readonly phase: string;
  readonly progress: number;
  readonly result: (Readonly<Record<string, unknown>> & { readonly receiptOutcome?: import('./receiptImportOutcome').ReceiptImportOutcome }) | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly attempts: number;
  readonly provider: ExportProvider | null;
  readonly createdAt: string;
  readonly queuedAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly updatedAt: string;
  readonly presentation: ImportOperationPresentation | null;
}

export const isActiveImportOperation = (operation: ImportOperation | null | undefined): boolean =>
  Boolean(operation && ["awaiting_upload", "pending_dispatch", "queued", "running", "retrying"].includes(operation.status));
export type ProviderExportLifecycleStatus =
  | "not_started"
  | "requested"
  | "file_ready"
  | "import_processing"
  | "completed"
  | "failed";

export interface ProviderExportState {
  provider: ExportProvider;
  status: ProviderExportLifecycleStatus;
  requestedAt: string | null;
  updatedAt: string | null;
  errorCode: string | null;
  readySource?: "detected_email" | "user_confirmed" | null;
  relevance: ProviderRelevance;
}

export type GmailImportLifecycleStatus =
  "never_started" | "importing" | "completed" | "failed";
export type OngoingTrackingEffectiveState =
  | "not_offered"
  | "declined"
  | "setting_up"
  | "active"
  | "paused"
  | "reconnect_required"
  | "error";

export interface ImportPreferencesResponse {
  gmailConnection: GmailConnectionStatus;
  outlookConnection: OutlookConnectionStatus;
  monitoring: {
    consentState: MonitoringConsentState;
    consentVersion: string | null;
    consentedAt: string | null;
    revokedAt: string | null;
    effectiveState: EffectiveMonitoringState;
    capability: {
      gmailConnected: boolean;
      outlookConnected?: boolean;
      durableAccess: boolean;
      needsReconnect?: boolean;
      connectionHealth?: GmailConnectionStatus["connectionHealth"];
      lastValidatedAt?: string | null;
      canMonitor: boolean;
    };
  };
  export: {
    providers: {
      uberEats: ProviderExportState;
      doorDash: ProviderExportState;
    };
  };
  gmailBaseline: {
    hasCompleted: boolean;
    completedAt: string | null;
    latestAttempt: {
      status: GmailImportLifecycleStatus;
      updatedAt: string | null;
      importedCount: number;
      errorCode: string | null;
    };
  };
  outlookBaseline: {
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
    status:
      | "inactive"
      | "setting_up"
      | "active"
      | "paused"
      | "reconnect_required"
      | "error";
    effectiveState: OngoingTrackingEffectiveState;
    baseline: {
      eligible: boolean;
      source: "gmail" | "outlook" | "exports" | "none";
    };
    capability: {
      gmailConnected: boolean;
      outlookConnected?: boolean;
      durableAccess: boolean;
      needsReconnect: boolean;
      connectionHealth: GmailConnectionStatus["connectionHealth"];
      lastValidatedAt: string | null;
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
    /** Canonical records with each source; merged orders overlap, so these are not additive. */
    emailReceiptCount: number;
    exportReceiptCount: number;
    hasEmailData: boolean;
    hasExportData: boolean;
    emailProviders: {
      uberEats: ProviderSourceCoverage;
      doorDash: ProviderSourceCoverage;
    };
    exportProviders: {
      uberEats: ProviderSourceCoverage;
      doorDash: ProviderSourceCoverage;
    };
  };
  setupGuidance: SetupGuidance;
}

export interface ProviderSourceCoverage {
  /** Includes unresolved records and adjustments, not a unique purchase total. */
  receiptCount: number;
  hasData: boolean;
  /** Observed order range only; unlinked adjustment dates do not extend it. */
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
}

export interface ExportReadyCheckResponse {
  detected: boolean;
  preferences: ImportPreferencesResponse;
}
