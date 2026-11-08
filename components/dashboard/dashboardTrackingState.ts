import { resolveImportNextAction } from '@features/import-flow/importNextAction';
import { type ExportProvider, type ImportOperation, type ImportPreferencesResponse } from "@features/import-flow/contracts";
import type { GmailConnectionPurpose } from "@features/import-flow/gmailConnectionPurpose";
import { resolveTrackingRecovery } from "@features/import-flow/trackingEligibility";

export type DashboardTrackingAction = "open_import" | "connect_gmail" | "import_gmail" | "request_export" | "continue_export" | "open_gmail" | "enable_tracking" | "retry_tracking" | "retry_preferences";
export type DashboardTrackingTone = "brand" | "progress" | "success" | "warning" | "error";
export type HomeGuidancePlacement = "priority" | "footer";

export interface DashboardProgressState {
  id: string; title: string; body: string; icon: string;
  provider?: ExportProvider; action?: DashboardTrackingAction; actionLabel?: string;
}

export interface DashboardTrackingCardState {
  id: string;
  sectionLabel: "Next step" | "In progress" | "Your data";
  placement: HomeGuidancePlacement;
  display?: "compact" | "expanded";
  exportRecommendation?: DashboardExportRecommendation;
  eyebrow: string; title: string; body: string; icon: string; tone: DashboardTrackingTone;
  primaryAction?: DashboardTrackingAction; primaryLabel?: string; primaryProvider?: ExportProvider;
  gmailPurpose?: GmailConnectionPurpose;
  secondaryAction?: DashboardTrackingAction; secondaryLabel?: string; secondaryProvider?: ExportProvider;
  passive?: boolean; busy?: boolean; showActivity?: boolean; canMarkUberNotUsed?: boolean;
  progress?: DashboardProgressState;
}

export type HomePrioritySurface =
  | { kind: "active_import"; operation: ImportOperation }
  | { kind: "guidance"; guidance: DashboardTrackingCardState }
  | { kind: "none" };

export const resolveHomePrioritySurface = (
  operation: ImportOperation | null,
  guidance: DashboardTrackingCardState,
): HomePrioritySurface => {
  if (resolveImportNextAction({ preferences: null, operation }).kind === 'operation' && operation) return { kind: "active_import", operation };
  if (guidance.placement === "priority") return { kind: "guidance", guidance };
  return { kind: "none" };
};

const card = (value: Omit<DashboardTrackingCardState, "placement"> & { placement?: HomeGuidancePlacement }): DashboardTrackingCardState => ({ placement: "priority", ...value });
const providerName = (provider: ExportProvider) => provider === "uber_eats" ? "Uber Eats" : "DoorDash";

const activeDeferralLabel = (value: string | null, now: Date): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

export type DashboardExportRecommendation = ExportProvider | "neutral";
export const SPARSE_EMAIL_RECEIPT_LIMIT = 5;

/** Receipt counts select a useful source; they are not unique purchase totals. */
export function resolveDashboardExportRecommendation(preferences: ImportPreferencesResponse): DashboardExportRecommendation | null {
  const { coverage } = preferences;
  const hasExport = coverage.exportProviders.uberEats.hasData || coverage.exportProviders.doorDash.hasData;
  const completedScan = preferences.gmailBaseline.hasCompleted || preferences.outlookBaseline.hasCompleted
    || preferences.gmailBaseline.latestAttempt.status === "completed" || preferences.outlookBaseline.latestAttempt.status === "completed";
  if (!completedScan && coverage.emailReceiptCount === 0 && !hasExport) return null;
  const candidates = ([
    { provider: "uber_eats", source: coverage.emailProviders.uberEats, exported: coverage.exportProviders.uberEats.hasData, relevance: preferences.export.providers.uberEats.relevance },
    { provider: "doordash", source: coverage.emailProviders.doorDash, exported: coverage.exportProviders.doorDash.hasData, relevance: preferences.export.providers.doorDash.relevance },
  ] as const).filter(candidate => !candidate.exported && candidate.relevance !== "not_used"
    // After a successful export, do not pitch an unobserved second service.
    && (!hasExport || candidate.source.receiptCount > 0));
  if (!candidates.length) return null;
  if (coverage.emailReceiptCount <= SPARSE_EMAIL_RECEIPT_LIMIT) return "neutral";
  const [first, second] = [...candidates].sort((a, b) => b.source.receiptCount - a.source.receiptCount);
  if (first.source.receiptCount === 0 || first.source.receiptCount === second?.source.receiptCount) return "neutral";
  return first.provider;
}

function exportInvitation(recommendation: DashboardExportRecommendation): DashboardTrackingCardState {
  const name = recommendation === "neutral" ? null : providerName(recommendation);
  return card({
    id: `export_invitation_${recommendation}`, exportRecommendation: recommendation,
    sectionLabel: "Next step", eyebrow: "EXPAND YOUR HISTORY", display: "compact", tone: "brand", icon: "cloud-download-outline",
    title: name ? `Get more from your ${name} history` : "Expand your order history",
    body: name ? `Add your ${name} history download for more complete order details.`
      : "Email receipts may only show part of your history. Add a delivery-app data export to fill in the picture.",
    primaryAction: "request_export", primaryProvider: recommendation === "neutral" ? undefined : recommendation,
    primaryLabel: recommendation === "uber_eats" ? "Get my Uber history" : recommendation === "doordash" ? "Get my DoorDash history" : "Explore history exports",
  });
}

/** Pure owner of the single data-guidance surface shown on Home. */
export function resolveHomeDataGuidance(
  preferences: ImportPreferencesResponse | null,
  loading: boolean,
  unavailable = false,
  now = new Date(),
): DashboardTrackingCardState {
  if (loading) return card({
    id: "loading", sectionLabel: "In progress", eyebrow: "CHECKING YOUR DATA",
    title: "Getting your next step ready", body: "This will only take a moment.",
    icon: "sync-outline", tone: "progress", passive: true, busy: true, display: "compact",
  });
  if (unavailable || !preferences) return card({
    id: "preferences_unavailable", sectionLabel: "Next step", eyebrow: "DATA STATUS UNAVAILABLE",
    title: "We couldn’t check your data setup", body: "Your spending history is still available. Try the status check again.",
    icon: "cloud-offline-outline", tone: "warning", primaryAction: "retry_preferences", primaryLabel: "Try again",
  });

  const uber = preferences.export.providers.uberEats;
  const doorDash = preferences.export.providers.doorDash;
  const providers = [uber, doorDash];
  const usefulHistory = preferences.coverage.emailReceiptCount + preferences.coverage.exportReceiptCount > 0;
  const uberFileCoverage = preferences.coverage.exportProviders.uberEats.hasData;
  const tracking = preferences.ongoingTracking;
  const emailAttempt = preferences.gmailBaseline.latestAttempt.status === "importing" || preferences.gmailBaseline.latestAttempt.status === "failed"
    ? preferences.gmailBaseline.latestAttempt : preferences.outlookBaseline.latestAttempt;

  const ready = providers.find((provider) => provider.status === "file_ready");
  if (ready) return card({
    id: `file_ready_${ready.provider}`, sectionLabel: "Next step", eyebrow: "YOUR FILE IS READY",
    title: `Add your ${providerName(ready.provider)} history`, body: "Download the archive from the provider’s message, then bring it back to SnackTrack.",
    icon: "mail-unread-outline", tone: "success", primaryAction: "continue_export", primaryProvider: ready.provider, primaryLabel: "Continue",
  });

  const failed = providers.find((provider) => provider.status === "failed");
  const reconnectRequired = tracking.effectiveState === "reconnect_required"
    || preferences.monitoring.effectiveState === "reconnect_required"
    || emailAttempt.errorCode === "GMAIL_RECONNECT_REQUIRED"
    || emailAttempt.errorCode === "OUTLOOK_RECONNECT_REQUIRED";
  if (failed) return card({
    id: `import_failed_${failed.provider}`, sectionLabel: "Next step", eyebrow: "IMPORT NEEDS ATTENTION",
    title: `We couldn’t add your ${providerName(failed.provider)} history`, body: "Your existing orders are safe. Review the instructions or try the file again.",
    icon: "alert-circle-outline", tone: "error", primaryAction: "continue_export", primaryProvider: failed.provider, primaryLabel: "Try again",
  });
  if (reconnectRequired) return card({
    id: "reconnect_required", sectionLabel: "Next step", eyebrow: "EMAIL NEEDS ATTENTION",
    title: "Reconnect email to resume updates", body: "Your imported history is safe.",
    icon: "link-outline", tone: "warning", primaryAction: "open_import", primaryLabel: "Manage email connection", gmailPurpose: "connection_recovery", display: "compact",
  });
  if (emailAttempt.status === "failed" || tracking.effectiveState === "error") return card({
    id: "email_import_failed", sectionLabel: "Next step", eyebrow: "CHECK NEEDS ATTENTION",
    title: "We couldn’t finish checking for orders", body: "Your existing history is safe. Try the check again when you’re ready.",
    icon: "refresh-circle-outline", tone: "error", primaryAction: tracking.effectiveState === "error" ? "retry_tracking" : "import_gmail", primaryLabel: "Try again",
  });

  const processing = providers.find((provider) => provider.status === "import_processing");
  if (processing || emailAttempt.status === "importing") return card({
    id: `processing_${processing?.provider ?? "email"}`, sectionLabel: "In progress", eyebrow: "ADDING YOUR HISTORY",
    title: `Your ${processing ? providerName(processing.provider) : "email"} history is being processed`, body: "SnackTrack is finishing the import you started.",
    icon: "hourglass-outline", tone: "progress", passive: true, busy: true,
  });

  const waiting = providers.find((provider) => provider.status === "requested");
  if (waiting) return card({
    id: `request_waiting_${waiting.provider}`, sectionLabel: "In progress", eyebrow: "YOUR PLACE IS SAVED",
    title: `Waiting for your ${providerName(waiting.provider)} download`, body: "They’ll email you when the download is ready. You can review the steps anytime.",
    icon: "time-outline", tone: "progress", primaryAction: "continue_export", primaryProvider: waiting.provider, primaryLabel: "Review steps", display: "compact",
  });

  if (tracking.effectiveState === "setting_up") return card({
    id: "tracking_setting_up", sectionLabel: "In progress", eyebrow: "AUTOMATIC UPDATES",
    title: "Setting up automatic updates", body: "SnackTrack is catching up from your saved history and preparing to watch for new orders.",
    icon: "sync-outline", tone: "progress", passive: true, busy: true, display: "compact",
  });

  const exportRecommendation = resolveDashboardExportRecommendation(preferences);
  if (exportRecommendation) return exportInvitation(exportRecommendation);

  if (!usefulHistory) {
    if (uber.relevance === "not_used") return card({
      id: "no_history_uber_not_used", sectionLabel: "Next step", eyebrow: "START YOUR ORDER HISTORY",
      title: "Add orders from email or DoorDash", body: "Connect the email registered with your delivery apps, or add your DoorDash download.",
      icon: "receipt-outline", tone: "brand", primaryAction: "open_import", primaryLabel: "Choose another source",
    });
    const reminderDate = activeDeferralLabel(preferences.setupGuidance.initialSetupDeferredUntil, now);
    return card({
      id: reminderDate ? "setup_deferred" : "no_history", sectionLabel: "Next step", eyebrow: "START YOUR ORDER HISTORY",
      title: reminderDate ? "Continue setting up your data" : "Build your SnackTrack history",
      body: reminderDate ? `You chose to come back later. We’ll remind you again after ${reminderDate}.` : "Choose the inbox that receives your delivery receipts, or use a history download from your delivery app.",
      icon: "receipt-outline", tone: "brand", primaryAction: "open_import", primaryLabel: reminderDate ? "Continue setup" : "Get started",
      display: reminderDate ? "compact" : "expanded",
    });
  }


  if (tracking.effectiveState === "not_offered" && tracking.consentState === "not_offered") {
    const trackingRecovery = resolveTrackingRecovery(preferences);
    if (trackingRecovery.kind === "eligible") return card({
      id: "tracking_recommended", placement: preferences.automaticUpdatesOfferSeenAt ? "footer" : "priority", sectionLabel: "Next step", eyebrow: "KEEP YOUR STATS CURRENT",
      title: "Keep your stats current", body: "Let SnackTrack periodically check your connected inboxes for new supported receipts.",
      icon: "notifications-outline", tone: "brand", primaryAction: "enable_tracking", primaryLabel: "Turn on automatic updates", display: "compact",
    });
    if (trackingRecovery.kind === "reconnect") return card({
      id: "tracking_connect_email", placement: preferences.automaticUpdatesOfferSeenAt ? "footer" : "priority", sectionLabel: "Next step", eyebrow: "KEEP YOUR STATS CURRENT",
      title: "Keep SnackTrack up to date", body: "Connect your receipt inbox, then choose whether to enable ongoing updates.",
      icon: "mail-outline", tone: "brand", primaryAction: "open_import", primaryLabel: "Connect email", gmailPurpose: "ongoing_tracking", display: "compact",
    });
  }


  return card({
    id: "data_healthy", sectionLabel: "Your data", eyebrow: "YOUR DATA",
    title: uberFileCoverage ? "Your history is ready" : "Your saved sources are up to date",
    body: tracking.effectiveState === "active" ? "Ongoing email updates are on." : "Your imported order history is ready to explore.",
    icon: "checkmark-circle-outline", tone: "success", placement: "footer", display: "compact",
    primaryAction: "open_import", primaryLabel: "Add orders", showActivity: tracking.effectiveState === "active",
  });
}

export const resolveDashboardTrackingState = resolveHomeDataGuidance;
