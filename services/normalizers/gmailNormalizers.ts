import type {
  EffectiveMonitoringState,
  ExportReadyCheckResponse,
  GmailAuthUrlResponse,
  GmailConnectionStatus,
  GmailImportLifecycleStatus,
  GmailImportResponse,
  ImportPreferencesResponse,
  MonitoringConsentState,
  OngoingTrackingEffectiveState,
  OutlookConnectionStatus,
  ProviderExportLifecycleStatus,
  ProviderRelevance,
  SetupGuidance,
} from "@features/import-flow/contracts";

type UnknownRecord = Record<string, unknown>;
const invalid = (field: string): never => {
  throw new Error(`Invalid Gmail response: ${field}`);
};
const record = (value: unknown, field: string): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : invalid(field);
const string = (value: unknown, field: string): string =>
  typeof value === "string" ? value : invalid(field);
const boolean = (value: unknown, field: string): boolean =>
  typeof value === "boolean" ? value : invalid(field);
const number = (value: unknown, field: string): number =>
  typeof value === "number" && Number.isFinite(value) ? value : invalid(field);
const nullableString = (value: unknown, field: string): string | null =>
  value === null ? null : string(value, field);
const optionalString = (value: unknown, field: string): string | undefined =>
  value === undefined ? undefined : string(value, field);
const optionalBoolean = (value: unknown, field: string): boolean | undefined =>
  value === undefined ? undefined : boolean(value, field);
const member = <T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T =>
  typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : invalid(field);

const consentStates = [
  "not_offered",
  "declined",
  "granted",
  "revoked",
] as const satisfies readonly MonitoringConsentState[];
const monitoringStates = [
  "not_offered",
  "declined",
  "enabled",
  "disabled",
  "reconnect_required",
] as const satisfies readonly EffectiveMonitoringState[];
const providerExportStates = [
  "not_started",
  "requested",
  "file_ready",
  "import_processing",
  "completed",
  "failed",
] as const satisfies readonly ProviderExportLifecycleStatus[];
const exportProviderNames = ["uber_eats", "doordash"] as const;
const exportReadySources = ["detected_email", "user_confirmed"] as const;
const providerRelevanceStates = ["unknown", "not_used"] as const satisfies readonly ProviderRelevance[];
const gmailImportStates = [
  "never_started",
  "importing",
  "completed",
  "failed",
] as const satisfies readonly GmailImportLifecycleStatus[];
const trackingEffectiveStates = [
  "not_offered",
  "declined",
  "setting_up",
  "active",
  "paused",
  "reconnect_required",
  "error",
] as const satisfies readonly OngoingTrackingEffectiveState[];
const trackingStates = [
  "inactive",
  "setting_up",
  "active",
  "paused",
  "reconnect_required",
  "error",
] as const;
const trackingBaselineSources = ["gmail", "outlook", "exports", "none"] as const;
const healthStates = [
  "disconnected",
  "valid",
  "reconnect_required",
  "unavailable",
] as const;
const connectionModes = ["none", "temporary", "offline"] as const;

export function normalizeSetupGuidance(value: unknown): SetupGuidance {
  const data = record(value, "setup guidance");
  return {
    initialSetupDeferredUntil: nullableString(
      data.initialSetupDeferredUntil,
      "setup guidance.initialSetupDeferredUntil",
    ),
  };
}

export function normalizeGmailConnectionStatus(
  value: unknown,
): GmailConnectionStatus {
  const data = record(value, "status");
  return {
    connected: boolean(data.connected, "status.connected"),
    email: optionalString(data.email, "status.email"),
    canImport: optionalBoolean(data.canImport, "status.canImport"),
    needsReconnect: optionalBoolean(
      data.needsReconnect,
      "status.needsReconnect",
    ),
    connectionMode:
      data.connectionMode === undefined
        ? undefined
        : member(data.connectionMode, connectionModes, "status.connectionMode"),
    scopes:
      data.scopes === undefined
        ? undefined
        : Array.isArray(data.scopes)
          ? data.scopes.map((item, index) =>
              string(item, `status.scopes[${index}]`),
            )
          : invalid("status.scopes"),
    hasRequiredScope: optionalBoolean(
      data.hasRequiredScope,
      "status.hasRequiredScope",
    ),
    expiresAt:
      data.expiresAt === undefined
        ? undefined
        : nullableString(data.expiresAt, "status.expiresAt"),
    statusMessage: optionalString(data.statusMessage, "status.statusMessage"),
    connectionHealth:
      data.connectionHealth === undefined
        ? undefined
        : member(
            data.connectionHealth,
            healthStates,
            "status.connectionHealth",
          ),
    lastValidatedAt:
      data.lastValidatedAt === undefined
        ? undefined
        : nullableString(data.lastValidatedAt, "status.lastValidatedAt"),
  };
}

export function normalizeOutlookConnectionStatus(
  value: unknown,
): OutlookConnectionStatus {
  const data = record(value, "outlook status");
  return {
    provider: member(data.provider, ["microsoft"] as const, "outlook status.provider"),
    connected: boolean(data.connected, "outlook status.connected"),
    email: nullableString(data.email, "outlook status.email"),
    canImport: boolean(data.canImport, "outlook status.canImport"),
    needsReconnect: boolean(data.needsReconnect, "outlook status.needsReconnect"),
    connectionMode: member(data.connectionMode, connectionModes, "outlook status.connectionMode"),
    scopes: Array.isArray(data.scopes)
      ? data.scopes.map((item, index) => string(item, `outlook status.scopes[${index}]`))
      : invalid("outlook status.scopes"),
    hasRequiredScope: boolean(data.hasRequiredScope, "outlook status.hasRequiredScope"),
    expiresAt: nullableString(data.expiresAt, "outlook status.expiresAt"),
    statusMessage: string(data.statusMessage, "outlook status.statusMessage"),
    connectionHealth: member(data.connectionHealth, healthStates, "outlook status.connectionHealth"),
    lastValidatedAt: nullableString(data.lastValidatedAt, "outlook status.lastValidatedAt"),
  };
}

export function normalizeImportPreferences(
  value: unknown,
): ImportPreferencesResponse {
  const data = record(value, "preferences");
  const gmailConnection = normalizeGmailConnectionStatus(data.gmailConnection);
  const outlookConnection = normalizeOutlookConnectionStatus(data.outlookConnection);
  const monitoring = record(data.monitoring, "preferences.monitoring");
  const monitoringCapability = record(
    monitoring.capability,
    "preferences.monitoring.capability",
  );
  const exportState = record(data.export, "preferences.export");
  const providerStates = record(
    exportState.providers,
    "preferences.export.providers",
  );
  const uberEatsProvider = record(
    providerStates.uberEats,
    "preferences.export.providers.uberEats",
  );
  const doorDashProvider = record(
    providerStates.doorDash,
    "preferences.export.providers.doorDash",
  );
  const gmailBaseline = record(data.gmailBaseline, "preferences.gmailBaseline");
  const latestGmailAttempt = record(
    gmailBaseline.latestAttempt,
    "preferences.gmailBaseline.latestAttempt",
  );
  const outlookBaseline = record(data.outlookBaseline, "preferences.outlookBaseline");
  const latestOutlookAttempt = record(
    outlookBaseline.latestAttempt,
    "preferences.outlookBaseline.latestAttempt",
  );
  const tracking = record(data.ongoingTracking, "preferences.ongoingTracking");
  const trackingCapability = record(
    tracking.capability,
    "preferences.ongoingTracking.capability",
  );
  const trackingBaseline = record(
    tracking.baseline,
    "preferences.ongoingTracking.baseline",
  );
  const activity = record(
    tracking.activity,
    "preferences.ongoingTracking.activity",
  );
  const coverage = record(data.coverage, "preferences.coverage");
  const emailProviders = record(
    coverage.emailProviders,
    "preferences.coverage.emailProviders",
  );
  const uberEatsEmail = record(
    emailProviders.uberEats,
    "preferences.coverage.emailProviders.uberEats",
  );
  const doorDashEmail = record(
    emailProviders.doorDash,
    "preferences.coverage.emailProviders.doorDash",
  );
  const exportProviders = record(
    coverage.exportProviders,
    "preferences.coverage.exportProviders",
  );
  const uberEatsExport = record(
    exportProviders.uberEats,
    "preferences.coverage.exportProviders.uberEats",
  );
  const doorDashExport = record(
    exportProviders.doorDash,
    "preferences.coverage.exportProviders.doorDash",
  );

  return {
    gmailConnection,
    outlookConnection,
    monitoring: {
      consentState: member(
        monitoring.consentState,
        consentStates,
        "preferences.monitoring.consentState",
      ),
      consentVersion: nullableString(
        monitoring.consentVersion,
        "preferences.monitoring.consentVersion",
      ),
      consentedAt: nullableString(
        monitoring.consentedAt,
        "preferences.monitoring.consentedAt",
      ),
      revokedAt: nullableString(
        monitoring.revokedAt,
        "preferences.monitoring.revokedAt",
      ),
      effectiveState: member(
        monitoring.effectiveState,
        monitoringStates,
        "preferences.monitoring.effectiveState",
      ),
      capability: {
        gmailConnected: boolean(
          monitoringCapability.gmailConnected,
          "preferences.monitoring.capability.gmailConnected",
        ),
        outlookConnected: boolean(
          monitoringCapability.outlookConnected,
          "preferences.monitoring.capability.outlookConnected",
        ),
        durableAccess: boolean(
          monitoringCapability.durableAccess,
          "preferences.monitoring.capability.durableAccess",
        ),
        needsReconnect: boolean(
          monitoringCapability.needsReconnect,
          "preferences.monitoring.capability.needsReconnect",
        ),
        connectionHealth: member(
          monitoringCapability.connectionHealth,
          healthStates,
          "preferences.monitoring.capability.connectionHealth",
        ),
        lastValidatedAt: nullableString(
          monitoringCapability.lastValidatedAt,
          "preferences.monitoring.capability.lastValidatedAt",
        ),
        canMonitor: boolean(
          monitoringCapability.canMonitor,
          "preferences.monitoring.capability.canMonitor",
        ),
      },
    },
    export: {
      providers: {
        uberEats: {
          provider: member(
            uberEatsProvider.provider,
            exportProviderNames,
            "preferences.export.providers.uberEats.provider",
          ),
          status: member(
            uberEatsProvider.status,
            providerExportStates,
            "preferences.export.providers.uberEats.status",
          ),
          requestedAt: nullableString(
            uberEatsProvider.requestedAt,
            "preferences.export.providers.uberEats.requestedAt",
          ),
          updatedAt: nullableString(
            uberEatsProvider.updatedAt,
            "preferences.export.providers.uberEats.updatedAt",
          ),
          errorCode: nullableString(
            uberEatsProvider.errorCode,
            "preferences.export.providers.uberEats.errorCode",
          ),
          readySource:
            uberEatsProvider.readySource == null
              ? null
              : member(
                  uberEatsProvider.readySource,
                  exportReadySources,
                  "preferences.export.providers.uberEats.readySource",
                ),
          relevance: member(
            uberEatsProvider.relevance,
            providerRelevanceStates,
            "preferences.export.providers.uberEats.relevance",
          ),
        },
        doorDash: {
          provider: member(
            doorDashProvider.provider,
            exportProviderNames,
            "preferences.export.providers.doorDash.provider",
          ),
          status: member(
            doorDashProvider.status,
            providerExportStates,
            "preferences.export.providers.doorDash.status",
          ),
          requestedAt: nullableString(
            doorDashProvider.requestedAt,
            "preferences.export.providers.doorDash.requestedAt",
          ),
          updatedAt: nullableString(
            doorDashProvider.updatedAt,
            "preferences.export.providers.doorDash.updatedAt",
          ),
          errorCode: nullableString(
            doorDashProvider.errorCode,
            "preferences.export.providers.doorDash.errorCode",
          ),
          readySource:
            doorDashProvider.readySource == null
              ? null
              : member(
                  doorDashProvider.readySource,
                  exportReadySources,
                  "preferences.export.providers.doorDash.readySource",
                ),
          relevance: member(
            doorDashProvider.relevance,
            providerRelevanceStates,
            "preferences.export.providers.doorDash.relevance",
          ),
        },
      },
    },
    gmailBaseline: {
      hasCompleted: boolean(
        gmailBaseline.hasCompleted,
        "preferences.gmailBaseline.hasCompleted",
      ),
      completedAt: nullableString(
        gmailBaseline.completedAt,
        "preferences.gmailBaseline.completedAt",
      ),
      latestAttempt: {
        status: member(
          latestGmailAttempt.status,
          gmailImportStates,
          "preferences.gmailBaseline.latestAttempt.status",
        ),
        updatedAt: nullableString(
          latestGmailAttempt.updatedAt,
          "preferences.gmailBaseline.latestAttempt.updatedAt",
        ),
        importedCount: number(
          latestGmailAttempt.importedCount,
          "preferences.gmailBaseline.latestAttempt.importedCount",
        ),
        errorCode: nullableString(
          latestGmailAttempt.errorCode,
          "preferences.gmailBaseline.latestAttempt.errorCode",
        ),
      },
    },
    outlookBaseline: {
      hasCompleted: boolean(
        outlookBaseline.hasCompleted,
        "preferences.outlookBaseline.hasCompleted",
      ),
      completedAt: nullableString(
        outlookBaseline.completedAt,
        "preferences.outlookBaseline.completedAt",
      ),
      latestAttempt: {
        status: member(
          latestOutlookAttempt.status,
          gmailImportStates,
          "preferences.outlookBaseline.latestAttempt.status",
        ),
        updatedAt: nullableString(
          latestOutlookAttempt.updatedAt,
          "preferences.outlookBaseline.latestAttempt.updatedAt",
        ),
        importedCount: number(
          latestOutlookAttempt.importedCount,
          "preferences.outlookBaseline.latestAttempt.importedCount",
        ),
        errorCode: nullableString(
          latestOutlookAttempt.errorCode,
          "preferences.outlookBaseline.latestAttempt.errorCode",
        ),
      },
    },
    ongoingTracking: {
      consentState: member(
        tracking.consentState,
        consentStates,
        "preferences.ongoingTracking.consentState",
      ),
      consentVersion: nullableString(
        tracking.consentVersion,
        "preferences.ongoingTracking.consentVersion",
      ),
      consentedAt: nullableString(
        tracking.consentedAt,
        "preferences.ongoingTracking.consentedAt",
      ),
      revokedAt: nullableString(
        tracking.revokedAt,
        "preferences.ongoingTracking.revokedAt",
      ),
      status: member(
        tracking.status,
        trackingStates,
        "preferences.ongoingTracking.status",
      ),
      effectiveState: member(
        tracking.effectiveState,
        trackingEffectiveStates,
        "preferences.ongoingTracking.effectiveState",
      ),
      baseline: {
        eligible: boolean(
          trackingBaseline.eligible,
          "preferences.ongoingTracking.baseline.eligible",
        ),
        source: member(
          trackingBaseline.source,
          trackingBaselineSources,
          "preferences.ongoingTracking.baseline.source",
        ),
      },
      capability: {
        gmailConnected: boolean(
          trackingCapability.gmailConnected,
          "preferences.ongoingTracking.capability.gmailConnected",
        ),
        outlookConnected: boolean(
          trackingCapability.outlookConnected,
          "preferences.ongoingTracking.capability.outlookConnected",
        ),
        durableAccess: boolean(
          trackingCapability.durableAccess,
          "preferences.ongoingTracking.capability.durableAccess",
        ),
        needsReconnect: boolean(
          trackingCapability.needsReconnect,
          "preferences.ongoingTracking.capability.needsReconnect",
        ),
        connectionHealth: member(
          trackingCapability.connectionHealth,
          healthStates,
          "preferences.ongoingTracking.capability.connectionHealth",
        ),
        lastValidatedAt: nullableString(
          trackingCapability.lastValidatedAt,
          "preferences.ongoingTracking.capability.lastValidatedAt",
        ),
        canTrack: boolean(
          trackingCapability.canTrack,
          "preferences.ongoingTracking.capability.canTrack",
        ),
      },
      activity: {
        lastCheckAttemptAt: nullableString(
          activity.lastCheckAttemptAt,
          "preferences.ongoingTracking.activity.lastCheckAttemptAt",
        ),
        lastSuccessfulCheckAt: nullableString(
          activity.lastSuccessfulCheckAt,
          "preferences.ongoingTracking.activity.lastSuccessfulCheckAt",
        ),
        lastStatsUpdatedAt: nullableString(
          activity.lastStatsUpdatedAt,
          "preferences.ongoingTracking.activity.lastStatsUpdatedAt",
        ),
        lastNewOrderAt: nullableString(
          activity.lastNewOrderAt,
          "preferences.ongoingTracking.activity.lastNewOrderAt",
        ),
        ordersAddedThisWeek: number(
          activity.ordersAddedThisWeek,
          "preferences.ongoingTracking.activity.ordersAddedThisWeek",
        ),
        lastErrorAt: nullableString(
          activity.lastErrorAt,
          "preferences.ongoingTracking.activity.lastErrorAt",
        ),
        lastErrorCode: nullableString(
          activity.lastErrorCode,
          "preferences.ongoingTracking.activity.lastErrorCode",
        ),
      },
    },
    coverage: {
      emailReceiptCount: number(
        coverage.emailReceiptCount,
        "preferences.coverage.emailReceiptCount",
      ),
      exportReceiptCount: number(
        coverage.exportReceiptCount,
        "preferences.coverage.exportReceiptCount",
      ),
      hasEmailData: boolean(
        coverage.hasEmailData,
        "preferences.coverage.hasEmailData",
      ),
      hasExportData: boolean(
        coverage.hasExportData,
        "preferences.coverage.hasExportData",
      ),
      emailProviders: {
        uberEats: {
          receiptCount: number(uberEatsEmail.receiptCount, "preferences.coverage.emailProviders.uberEats.receiptCount"),
          hasData: boolean(uberEatsEmail.hasData, "preferences.coverage.emailProviders.uberEats.hasData"),
          earliestOrderDate: nullableString(uberEatsEmail.earliestOrderDate, "preferences.coverage.emailProviders.uberEats.earliestOrderDate"),
          latestOrderDate: nullableString(uberEatsEmail.latestOrderDate, "preferences.coverage.emailProviders.uberEats.latestOrderDate"),
        },
        doorDash: {
          receiptCount: number(doorDashEmail.receiptCount, "preferences.coverage.emailProviders.doorDash.receiptCount"),
          hasData: boolean(doorDashEmail.hasData, "preferences.coverage.emailProviders.doorDash.hasData"),
          earliestOrderDate: nullableString(doorDashEmail.earliestOrderDate, "preferences.coverage.emailProviders.doorDash.earliestOrderDate"),
          latestOrderDate: nullableString(doorDashEmail.latestOrderDate, "preferences.coverage.emailProviders.doorDash.latestOrderDate"),
        },
      },
      exportProviders: {
        uberEats: {
          receiptCount: number(
            uberEatsExport.receiptCount,
            "preferences.coverage.exportProviders.uberEats.receiptCount",
          ),
          hasData: boolean(
            uberEatsExport.hasData,
            "preferences.coverage.exportProviders.uberEats.hasData",
          ),
          earliestOrderDate: nullableString(
            uberEatsExport.earliestOrderDate,
            "preferences.coverage.exportProviders.uberEats.earliestOrderDate",
          ),
          latestOrderDate: nullableString(
            uberEatsExport.latestOrderDate,
            "preferences.coverage.exportProviders.uberEats.latestOrderDate",
          ),
        },
        doorDash: {
          receiptCount: number(
            doorDashExport.receiptCount,
            "preferences.coverage.exportProviders.doorDash.receiptCount",
          ),
          hasData: boolean(
            doorDashExport.hasData,
            "preferences.coverage.exportProviders.doorDash.hasData",
          ),
          earliestOrderDate: nullableString(
            doorDashExport.earliestOrderDate,
            "preferences.coverage.exportProviders.doorDash.earliestOrderDate",
          ),
          latestOrderDate: nullableString(
            doorDashExport.latestOrderDate,
            "preferences.coverage.exportProviders.doorDash.latestOrderDate",
          ),
        },
      },
    },
    setupGuidance: normalizeSetupGuidance(data.setupGuidance),
  };
}

export function normalizeGmailImportResponse(
  value: unknown,
): GmailImportResponse {
  const data = record(value, "import");
  const errors = Array.isArray(data.errors)
    ? data.errors.map((item, index) => string(item, `import.errors[${index}]`))
    : invalid("import.errors");
  return {
    success: boolean(data.success, "import.success"),
    code: nullableString(data.code, "import.code"),
    totalEmailsFound: number(data.totalEmailsFound, "import.totalEmailsFound"),
    totalReceiptsProcessed: number(
      data.totalReceiptsProcessed,
      "import.totalReceiptsProcessed",
    ),
    emailsExamined: number(data.emailsExamined, "import.emailsExamined"),
    supportedReceiptsFound: number(
      data.supportedReceiptsFound,
      "import.supportedReceiptsFound",
    ),
    exportCoveredReceipts: number(
      data.exportCoveredReceipts,
      "import.exportCoveredReceipts",
    ),
    eligibleReceipts: number(data.eligibleReceipts, "import.eligibleReceipts"),
    deduplicatedReceipts: number(
      data.deduplicatedReceipts,
      "import.deduplicatedReceipts",
    ),
    totalReceiptsImported: number(
      data.totalReceiptsImported,
      "import.totalReceiptsImported",
    ),
    totalAmount: number(data.totalAmount, "import.totalAmount"),
    errors,
    newOrders: number(data.newOrders, "import.newOrders"),
    updatedOrders: number(data.updatedOrders, "import.updatedOrders"),
    unchangedOrders: number(data.unchangedOrders, "import.unchangedOrders"),
  };
}

export function normalizeGmailAuthUrl(value: unknown): GmailAuthUrlResponse {
  const data = record(value, "authUrl");
  return {
    success: boolean(data.success, "authUrl.success"),
    authUrl: string(data.authUrl, "authUrl.authUrl"),
  };
}

export function normalizeExportReadyCheck(
  value: unknown,
): ExportReadyCheckResponse {
  const data = record(value, "exportReady");
  return {
    detected: boolean(data.detected, "exportReady.detected"),
    preferences: normalizeImportPreferences(data.preferences),
  };
}

export function normalizeDisconnectResponse(value: unknown): {
  success: boolean;
  message: string;
} {
  const data = record(value, "disconnect");
  return {
    success: boolean(data.success, "disconnect.success"),
    message: string(data.message, "disconnect.message"),
  };
}
