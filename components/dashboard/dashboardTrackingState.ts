import type { ExportProvider, ImportPreferencesResponse } from "@features/import-flow/contracts";
import type { GmailConnectionPurpose } from "@features/import-flow/gmailConnectionPurpose";

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
  eyebrow: string; title: string; body: string; icon: string; tone: DashboardTrackingTone;
  primaryAction?: DashboardTrackingAction; primaryLabel?: string; primaryProvider?: ExportProvider;
  gmailPurpose?: GmailConnectionPurpose;
  secondaryAction?: DashboardTrackingAction; secondaryLabel?: string; secondaryProvider?: ExportProvider;
  passive?: boolean; busy?: boolean; showActivity?: boolean; canMarkUberNotUsed?: boolean;
  progress?: DashboardProgressState;
}

const card = (value: Omit<DashboardTrackingCardState, "placement"> & { placement?: HomeGuidancePlacement }): DashboardTrackingCardState => ({ placement: "priority", ...value });
const providerName = (provider: ExportProvider) => provider === "uber_eats" ? "Uber Eats" : "DoorDash";

const activeDeferralLabel = (value: string | null, now: Date): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

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
    title: "Reconnect email to resume updates", body: "Your imported history is safe. Restore the email registered with your delivery apps to continue.",
    icon: "link-outline", tone: "warning", primaryAction: "open_import", primaryLabel: "Manage email connection", gmailPurpose: "connection_recovery",
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
    id: `request_waiting_${waiting.provider}`, sectionLabel: "In progress", eyebrow: "REQUEST SUBMITTED",
    title: `${providerName(waiting.provider)} is preparing your history`, body: "They’ll email you when the download is ready. You can review the steps anytime.",
    icon: "time-outline", tone: "progress", primaryAction: "continue_export", primaryProvider: waiting.provider, primaryLabel: "Review steps", display: "compact",
  });

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
      body: reminderDate ? `You chose to come back later. We’ll remind you again after ${reminderDate}.` : "Use the email registered with your delivery apps, or choose another method for phone-number, Apple, and other sign-ins.",
      icon: "receipt-outline", tone: "brand", primaryAction: "open_import", primaryLabel: reminderDate ? "Continue setup" : "Get started",
      display: reminderDate ? "compact" : "expanded",
    });
  }

  if (!uberFileCoverage && uber.relevance !== "not_used") {
    const completedWithoutOrders = uber.status === "completed";
    return card({
      id: completedWithoutOrders ? "uber_no_usable_orders" : "missing_uber_history", sectionLabel: "Next step",
      eyebrow: completedWithoutOrders ? "NO UBER EATS ORDERS ADDED" : "ADD MORE HISTORY",
      title: completedWithoutOrders ? "Try another Uber Eats history file" : "Complete your Uber Eats history",
      body: completedWithoutOrders
        ? "That archive didn’t contain usable orders, so your Uber Eats milestone is still incomplete."
        : "Import your data directly from Uber to build a more detailed order history.",
      icon: completedWithoutOrders ? "alert-circle-outline" : "cloud-download-outline", tone: completedWithoutOrders ? "warning" : "brand",
      primaryAction: completedWithoutOrders ? "continue_export" : "request_export", primaryProvider: "uber_eats",
      primaryLabel: completedWithoutOrders ? "Review import steps" : "Add orders",
      canMarkUberNotUsed: false, display: "compact",
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
