import type { ImportPreferencesResponse } from '@services/gmailApi';
import { resolveTrackingEligibility } from '@features/import-flow/trackingEligibility';

export type DashboardTrackingAction =
  | 'connect_gmail'
  | 'import_gmail'
  | 'request_export'
  | 'continue_export'
  | 'open_gmail'
  | 'enable_tracking'
  | 'retry_tracking';

export type DashboardTrackingTone = 'brand' | 'progress' | 'success' | 'warning' | 'error';

export interface DashboardTrackingCardState {
  id: string;
  sectionLabel: 'Next step' | 'In progress' | 'Tracking status';
  eyebrow: string;
  title: string;
  body: string;
  icon: string;
  tone: DashboardTrackingTone;
  primaryAction?: DashboardTrackingAction;
  primaryLabel?: string;
  secondaryAction?: DashboardTrackingAction;
  secondaryLabel?: string;
  passive?: boolean;
  showActivity?: boolean;
}

export const resolveDashboardTrackingState = (
  preferences: ImportPreferencesResponse | null,
  loading: boolean
): DashboardTrackingCardState => {
  if (loading || !preferences) {
    return {
      id: 'loading', sectionLabel: 'In progress', eyebrow: 'CHECKING YOUR SETUP',
      title: 'Getting your next step ready', body: 'This will only take a moment.',
      icon: 'sync-outline', tone: 'progress', passive: true,
    };
  }

  const { export: exportState, gmailImport, ongoingTracking, coverage, monitoring } = preferences;
  const trackingEligibility = resolveTrackingEligibility(preferences);
  const uberExportStatus = exportState.providers?.uberEats.status;
  const doorDashExportStatus = exportState.providers?.doorDash.status;
  const gmailConnected = ongoingTracking.capability.gmailConnected || monitoring.capability.gmailConnected;
  const gmailNeedsReconnect = ongoingTracking.capability.needsReconnect === true
    || monitoring.capability.needsReconnect === true
    || ongoingTracking.capability.connectionHealth === 'reconnect_required'
    || monitoring.capability.connectionHealth === 'reconnect_required';

  if (exportState.status === 'file_ready') {
    return {
      id: 'export_ready', sectionLabel: 'Next step', eyebrow: 'YOUR FILE IS READY',
      title: 'Download your Uber data',
      body: 'Open Uber’s email, download the archive, then bring it back to SnackTrack.',
      icon: 'mail-unread-outline', tone: 'success', primaryAction: 'continue_export', primaryLabel: 'Continue',
    };
  }
  if (exportState.status === 'import_processing') {
    return {
      id: 'export_processing', sectionLabel: 'In progress', eyebrow: 'ADDING YOUR HISTORY',
      title: 'Your export is being processed', body: 'SnackTrack is building your more complete spending history.',
      icon: 'hourglass-outline', tone: 'progress', passive: true,
    };
  }
  if (gmailImport.status === 'importing') {
    return {
      id: 'gmail_importing', sectionLabel: 'In progress', eyebrow: 'SCANNING GMAIL',
      title: 'Looking for delivery receipts', body: 'You can leave this screen while SnackTrack finishes the scan.',
      icon: 'search-outline', tone: 'progress', passive: true,
    };
  }
  if (exportState.status === 'failed') {
    return {
      id: 'export_failed', sectionLabel: 'Next step', eyebrow: 'IMPORT NEEDS ATTENTION',
      title: 'We couldn’t add that export', body: 'Try the file again or review the download instructions.',
      icon: 'alert-circle-outline', tone: 'error', primaryAction: 'continue_export', primaryLabel: 'Try again',
    };
  }
  if (gmailImport.status === 'failed' && !coverage.hasEmailData) {
    const reconnectRequired = gmailImport.errorCode === 'GMAIL_RECONNECT_REQUIRED';
    return {
      id: 'gmail_failed', sectionLabel: 'Next step', eyebrow: 'SCAN NEEDS ATTENTION',
      title: reconnectRequired ? 'Reconnect Gmail to continue' : 'We couldn’t finish the Gmail scan',
      body: reconnectRequired
        ? 'Google no longer accepts the saved connection. Your existing history is safe.'
        : 'Retry the import to get your recent orders.',
      icon: reconnectRequired ? 'link-outline' : 'refresh-circle-outline', tone: reconnectRequired ? 'warning' : 'error',
      primaryAction: reconnectRequired ? 'connect_gmail' : 'import_gmail', primaryLabel: reconnectRequired ? 'Reconnect Gmail' : 'Try again',
    };
  }

  const uberExportRequested = uberExportStatus === 'requested';
  const doorDashExportRequested = doorDashExportStatus === 'requested';
  const exportRequested = uberExportRequested || doorDashExportRequested;
  if (exportRequested) {
    if (uberExportRequested && monitoring.effectiveState === 'reconnect_required') {
      return {
        id: 'export_reconnect', sectionLabel: 'Next step', eyebrow: 'EXPORT ALERTS PAUSED',
        title: 'Reconnect Gmail to restore alerts', body: 'Uber may still be preparing your file. Reconnect so SnackTrack can recognize the ready email.',
        icon: 'link-outline', tone: 'warning', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
      };
    }
    return {
      id: uberExportRequested && doorDashExportRequested
        ? 'exports_requested'
        : uberExportRequested ? 'uber_export_requested' : 'doordash_export_requested',
      sectionLabel: 'In progress',
      eyebrow: uberExportRequested && doorDashExportRequested
        ? 'WAITING FOR YOUR EXPORTS'
        : uberExportRequested ? 'WAITING FOR UBER' : 'WAITING FOR DOORDASH',
      title: uberExportRequested && doorDashExportRequested
        ? 'Your delivery exports are being prepared'
        : `${uberExportRequested ? 'Uber' : 'DoorDash'} is preparing your file`,
      body: uberExportRequested
        ? monitoring.effectiveState === 'enabled'
          ? 'SnackTrack will check for Uber’s data-ready email while the app is active.'
          : 'Check your inbox for Uber’s data-ready email. DoorDash will send its own archive-ready email separately.'
        : 'DoorDash typically emails a “View Your Data Archive” link when the file is ready.',
      icon: 'time-outline', tone: 'progress', passive: true,
      primaryAction: uberExportRequested && monitoring.effectiveState !== 'enabled' ? 'open_gmail' : undefined,
      primaryLabel: uberExportRequested && monitoring.effectiveState !== 'enabled' ? 'Open Gmail' : undefined,
      secondaryAction: uberExportRequested && monitoring.effectiveState === 'enabled' ? 'open_gmail' : undefined,
      secondaryLabel: uberExportRequested && monitoring.effectiveState === 'enabled' ? 'Check Gmail manually' : undefined,
    };
  }

  if (gmailNeedsReconnect) {
    return {
      id: 'gmail_connection_reconnect', sectionLabel: 'Next step', eyebrow: 'GMAIL NEEDS ATTENTION',
      title: 'Reconnect Gmail to continue',
      body: gmailImport.hasImported
        ? 'Your imported history is safe. Reconnect Gmail so SnackTrack can keep future orders current.'
        : 'Google no longer accepts the saved connection. Reconnect before SnackTrack scans for delivery receipts.',
      icon: 'link-outline', tone: 'warning', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
    };
  }

  const gmailHasRun = gmailImport.hasImported;
  if (!gmailHasRun) {
    const hasExistingExport = coverage.hasExportData;
    return {
      id: gmailConnected ? 'import_gmail' : 'connect_gmail', sectionLabel: 'Next step',
      eyebrow: hasExistingExport ? 'KEEP YOUR STATS GROWING' : 'START WITH YOUR INBOX',
      title: hasExistingExport
        ? gmailConnected ? 'Scan Gmail for future orders' : 'Connect Gmail for future orders'
        : gmailConnected ? 'Import your Gmail receipts' : 'Connect Gmail for recent orders',
      body: hasExistingExport
        ? gmailConnected
          ? 'Your full history is already here. Run a Gmail scan so SnackTrack can start recognizing new delivery receipts.'
          : 'Your full history is already here. Connect Gmail so SnackTrack can recognize new delivery receipts going forward.'
        : 'SnackTrack can quickly find your recent delivery receipts before you add a full export.',
      icon: gmailConnected ? 'mail-open-outline' : 'mail-outline', tone: 'brand',
      primaryAction: gmailConnected ? 'import_gmail' : 'connect_gmail', primaryLabel: gmailConnected
        ? hasExistingExport ? 'Scan Gmail' : 'Import receipts'
        : 'Connect Gmail',
    };
  }

  if (!coverage.hasExportData && exportState.status === 'not_started') {
    return {
      id: coverage.emailReceiptCount <= 5 ? 'sparse_export' : 'request_export',
      sectionLabel: 'Next step', eyebrow: coverage.emailReceiptCount <= 5 ? 'YOUR INBOX ONLY TELLS PART OF THE STORY' : 'UNLOCK YOUR FULL HISTORY',
      title: 'Add a delivery data export',
      body: coverage.emailReceiptCount <= 5
        ? `Gmail found ${coverage.emailReceiptCount} ${coverage.emailReceiptCount === 1 ? 'order' : 'orders'}. An Uber Eats or DoorDash export can recover older history.`
        : 'Fill in older orders and make your long-term trends more complete.',
      icon: 'cloud-download-outline', tone: 'brand', primaryAction: 'request_export', primaryLabel: 'Choose a provider',
    };
  }

  if (ongoingTracking.effectiveState === 'reconnect_required') {
    return {
      id: 'tracking_reconnect', sectionLabel: 'Next step', eyebrow: 'UPDATES ARE PAUSED',
      title: 'Reconnect Gmail to resume tracking', body: 'Your imported history is safe, but new receipts cannot be checked until Gmail is reconnected.',
      icon: 'link-outline', tone: 'warning', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
    };
  }
  if (ongoingTracking.effectiveState === 'error') {
    return {
      id: 'tracking_error', sectionLabel: 'Next step', eyebrow: 'TRACKING NEEDS ATTENTION',
      title: 'We couldn’t check for new orders', body: 'Your existing stats are safe. Try the check again.',
      icon: 'alert-circle-outline', tone: 'error', primaryAction: 'retry_tracking', primaryLabel: 'Try again', showActivity: true,
    };
  }
  if (ongoingTracking.effectiveState === 'active') {
    return {
      id: 'tracking_active', sectionLabel: 'Tracking status', eyebrow: 'ONGOING TRACKING IS ON',
      title: 'Your stats are staying up to date', body: 'SnackTrack will check for new delivery receipts. Check back occasionally to see what changed.',
      icon: 'radio-outline', tone: 'success', passive: true, showActivity: true,
    };
  }
  if (ongoingTracking.effectiveState === 'paused' || ongoingTracking.effectiveState === 'declined') {
    return {
      id: 'tracking_paused', sectionLabel: 'Tracking status', eyebrow: 'ONGOING UPDATES ARE OFF',
      title: 'Your imported history is safe', body: 'Turn tracking back on whenever you want SnackTrack to check for new receipts.',
      icon: 'pause-circle-outline', tone: 'warning',
      primaryAction: trackingEligibility.eligible ? 'enable_tracking' : 'connect_gmail',
      primaryLabel: trackingEligibility.eligible ? 'Turn on tracking' : 'Reconnect to enable',
    };
  }
  if (!trackingEligibility.eligible) {
    return {
      id: 'tracking_setup_reconnect', sectionLabel: 'Next step', eyebrow: 'SET UP ONGOING UPDATES',
      title: 'Reconnect Gmail for future orders', body: 'Your imports are complete. Durable Gmail access is needed before you can allow periodic receipt checks.',
      icon: 'link-outline', tone: 'brand', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
    };
  }

  return {
    id: 'enable_tracking', sectionLabel: 'Next step', eyebrow: 'ONE LAST STEP',
    title: 'Keep your stats growing', body: 'Give SnackTrack permission to periodically check Gmail for new delivery receipts.',
    icon: 'pulse-outline', tone: 'brand', primaryAction: 'enable_tracking', primaryLabel: 'Enable ongoing tracking',
  };
};
