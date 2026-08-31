import type { ExportProvider, ImportPreferencesResponse } from '@services/gmailApi';
import { resolveTrackingEligibility, resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';
import {
  resolveImportCoverage,
  resolveImportSetupRecommendation,
  type ProviderJourneyState,
} from '@features/import-flow/importJourneyState';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import { resolveGmailBaselineState } from '@features/import-flow/gmailBaselineState';

export type DashboardTrackingAction =
  | 'open_import'
  | 'connect_gmail'
  | 'import_gmail'
  | 'request_export'
  | 'continue_export'
  | 'open_gmail'
  | 'enable_tracking'
  | 'retry_tracking';

export type DashboardTrackingTone = 'brand' | 'progress' | 'success' | 'warning' | 'error';

export interface DashboardProgressState {
  id: string;
  title: string;
  body: string;
  icon: string;
  provider?: ExportProvider;
  action?: DashboardTrackingAction;
  actionLabel?: string;
}

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
  primaryProvider?: ExportProvider;
  gmailPurpose?: GmailConnectionPurpose;
  secondaryAction?: DashboardTrackingAction;
  secondaryLabel?: string;
  secondaryProvider?: ExportProvider;
  passive?: boolean;
  showActivity?: boolean;
  progress?: DashboardProgressState;
}

const requestedProgress = (
  uberEats: ProviderJourneyState,
  doorDash: ProviderJourneyState,
  monitoring: ImportPreferencesResponse['monitoring'],
): DashboardProgressState | undefined => {
  const uberRequested = uberEats.status === 'requested';
  const doorDashRequested = doorDash.status === 'requested';
  if (!uberRequested && !doorDashRequested) return undefined;

  if (uberRequested && doorDashRequested) {
    return {
      id: 'exports_requested',
      title: 'Uber Eats and DoorDash exports requested',
      body: 'Both providers are preparing your archives. Keep an eye on your email while you continue setup.',
      icon: 'time-outline',
    };
  }

  if (uberRequested) {
    return {
      id: 'uber_export_requested',
      title: 'Uber Eats export requested',
      body: monitoring.effectiveState === 'enabled'
        ? 'SnackTrack will check for Uber’s ready email while the app is active.'
        : 'Uber will email when the archive is ready.',
      icon: 'time-outline',
      provider: 'uber_eats',
      action: 'open_gmail',
      actionLabel: 'Check Gmail',
    };
  }

  return {
    id: 'doordash_export_requested',
    title: 'DoorDash export requested',
    body: 'DoorDash typically emails a “View Your Data Archive” link when it is ready.',
    icon: 'time-outline',
    provider: 'doordash',
  };
};

const withProgress = (
  state: DashboardTrackingCardState,
  progress?: DashboardProgressState,
): DashboardTrackingCardState => progress ? { ...state, progress } : state;

const providerActionCard = (
  provider: ProviderJourneyState,
  progress?: DashboardProgressState,
): DashboardTrackingCardState => withProgress({
  id: `request_${provider.provider}`,
  sectionLabel: 'Next step',
  eyebrow: 'EXPAND YOUR HISTORY',
  title: `Add your ${provider.name} export`,
  body: `Your other sources are safe. Add ${provider.name} when you want more complete provider coverage.`,
  icon: 'cloud-download-outline',
  tone: 'brand',
  primaryAction: 'request_export',
  primaryProvider: provider.provider,
  primaryLabel: `Add ${provider.name}`,
}, progress);

export const resolveDashboardTrackingState = (
  preferences: ImportPreferencesResponse | null,
  loading: boolean,
): DashboardTrackingCardState => {
  if (loading || !preferences) {
    return {
      id: 'loading', sectionLabel: 'In progress', eyebrow: 'CHECKING YOUR SETUP',
      title: 'Getting your next step ready', body: 'This will only take a moment.',
      icon: 'sync-outline', tone: 'progress', passive: true,
    };
  }

  const { ongoingTracking, monitoring } = preferences;
  const gmailBaseline = resolveGmailBaselineState(preferences);
  const latestGmailAttempt = gmailBaseline.latestAttempt;
  const coverage = resolveImportCoverage(preferences);
  const { uberEats, doorDash } = coverage.providers;
  const progress = requestedProgress(uberEats, doorDash, monitoring);
  const trackingEligibility = resolveTrackingEligibility(preferences);
  const trackingRecovery = resolveTrackingRecovery(preferences);
  const gmailConnected = ongoingTracking.capability.gmailConnected || monitoring.capability.gmailConnected;
  const gmailNeedsReconnect = ongoingTracking.capability.needsReconnect === true
    || monitoring.capability.needsReconnect === true
    || ongoingTracking.capability.connectionHealth === 'reconnect_required'
    || monitoring.capability.connectionHealth === 'reconnect_required';
  const setupRecommendation = resolveImportSetupRecommendation({
    preferences,
    gmailFeatureEnabled: true,
    gmailConnected,
    gmailNeedsReconnect,
  });
  const readyProvider = [uberEats, doorDash].find((provider) => provider.status === 'file_ready');
  const processingProvider = [uberEats, doorDash].find((provider) => provider.status === 'import_processing');
  const failedProvider = [uberEats, doorDash].find((provider) => provider.status === 'failed');

  if (readyProvider) {
    return {
      id: `export_ready_${readyProvider.provider}`, sectionLabel: 'Next step', eyebrow: 'YOUR FILE IS READY',
      title: `Download your ${readyProvider.name} data`,
      body: `Open the provider’s ready message, download the archive, then bring it back to SnackTrack.`,
      icon: 'mail-unread-outline', tone: 'success', primaryAction: 'continue_export',
      primaryProvider: readyProvider.provider, primaryLabel: 'Continue',
    };
  }

  if (processingProvider) {
    return {
      id: `export_processing_${processingProvider.provider}`, sectionLabel: 'In progress', eyebrow: 'ADDING YOUR HISTORY',
      title: `Your ${processingProvider.name} export is being processed`,
      body: 'SnackTrack is building your more complete spending history.',
      icon: 'hourglass-outline', tone: 'progress', passive: true,
    };
  }

  if (latestGmailAttempt.status === 'importing') {
    return withProgress({
      id: 'gmail_importing', sectionLabel: 'In progress', eyebrow: 'SCANNING GMAIL',
      title: 'Looking for delivery receipts', body: 'SnackTrack is finishing the scan you started.',
      icon: 'search-outline', tone: 'progress', passive: true,
    }, progress);
  }

  if (failedProvider) {
    return {
      id: `export_failed_${failedProvider.provider}`, sectionLabel: 'Next step', eyebrow: 'IMPORT NEEDS ATTENTION',
      title: `We couldn’t add your ${failedProvider.name} export`,
      body: 'Try the file again or review that provider’s download instructions.',
      icon: 'alert-circle-outline', tone: 'error', primaryAction: 'continue_export',
      primaryProvider: failedProvider.provider, primaryLabel: 'Try again',
    };
  }

  if (latestGmailAttempt.status === 'failed') {
    const reconnectRequired = latestGmailAttempt.errorCode === 'GMAIL_RECONNECT_REQUIRED';
    return withProgress({
      id: 'gmail_failed', sectionLabel: 'Next step', eyebrow: 'SCAN NEEDS ATTENTION',
      title: reconnectRequired ? 'Reconnect Gmail to continue' : 'The last Gmail check failed',
      body: reconnectRequired
        ? 'Google no longer accepts the saved connection. Your existing history is safe.'
        : gmailBaseline.hasCompleted
          ? 'Your previously imported history is safe. Try checking again when you’re ready.'
          : 'Try the email check again to establish a starting point for newer orders.',
      icon: reconnectRequired ? 'link-outline' : 'refresh-circle-outline',
      tone: reconnectRequired ? 'warning' : 'error',
      primaryAction: reconnectRequired ? 'connect_gmail' : 'import_gmail',
      primaryLabel: reconnectRequired ? 'Reconnect Gmail' : 'Try again',
      gmailPurpose: 'connection_recovery',
    }, progress);
  }

  if (gmailNeedsReconnect) {
    const purpose: GmailConnectionPurpose = monitoring.consentState === 'granted' && uberEats.status === 'requested'
      ? 'export_ready_alerts'
      : ongoingTracking.consentState === 'granted'
        ? 'ongoing_tracking'
        : 'connection_recovery';
    return withProgress({
      id: 'gmail_connection_reconnect', sectionLabel: 'Next step', eyebrow: 'GMAIL NEEDS ATTENTION',
      title: 'Reconnect Gmail to continue',
      body: gmailBaseline.hasCompleted || coverage.hasEmailCoverage
        ? 'Your imported history is safe. Reconnect Gmail to restore the email feature you enabled.'
        : 'Google no longer accepts the saved connection. Reconnect before scanning for delivery receipts.',
      icon: 'link-outline', tone: 'warning', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
      gmailPurpose: purpose,
    }, progress);
  }

  const gmailHasRun = gmailBaseline.hasCompleted;
  if (!gmailHasRun) {
    if (coverage.hasAnyExportData) {
      const importedProvider = coverage.providers.uberEats.imported
        ? coverage.providers.uberEats
        : coverage.providers.doorDash;
      const exportTitle = coverage.allProvidersImported
        ? 'Both provider exports are included'
        : `${importedProvider.name} export is included`;
      const exportCoverageBody = coverage.allProvidersImported
        ? 'Your provider export history is complete.'
        : `Your ${importedProvider.name} export history is safe; you can still add the other provider separately.`;
      if (ongoingTracking.effectiveState === 'setting_up') {
        return withProgress({
          id: 'enable_tracking', sectionLabel: 'Tracking status', eyebrow: 'CATCHING UP',
          title: 'Checking for orders newer than your exports',
          body: `${exportCoverageBody} SnackTrack is checking Gmail for supported delivery receipts that arrived afterward.`,
          icon: 'sync-outline', tone: 'brand', passive: true, showActivity: true,
        }, progress);
      }
      if (ongoingTracking.effectiveState === 'active') {
        return withProgress({
          id: 'tracking_active', sectionLabel: 'Tracking status', eyebrow: 'ONGOING TRACKING IS ON',
          title: 'Your stats are staying up to date',
          body: `${exportCoverageBody} SnackTrack will check Gmail for supported new delivery receipts.`,
          icon: 'radio-outline', tone: 'success', passive: true, showActivity: true,
        }, progress);
      }
      if (ongoingTracking.effectiveState === 'error') {
        return withProgress({
          id: 'tracking_error', sectionLabel: 'Next step', eyebrow: 'TRACKING NEEDS ATTENTION',
          title: 'We couldn’t finish checking for newer orders',
          body: 'Your provider export history is safe. Retry the Gmail check when you’re ready.',
          icon: 'alert-circle-outline', tone: 'error', primaryAction: 'retry_tracking', primaryLabel: 'Try again', showActivity: true,
        }, progress);
      }
      if (ongoingTracking.effectiveState === 'paused' || ongoingTracking.effectiveState === 'declined') {
        return withProgress({
          id: 'tracking_paused', sectionLabel: 'Tracking status', eyebrow: 'HISTORY COVERAGE COMPLETE',
          title: exportTitle,
          body: `Ongoing Gmail updates are off. ${exportCoverageBody} You can turn updates on from Profile whenever you want.`,
          icon: 'checkmark-circle-outline', tone: 'success', passive: true,
        }, progress);
      }
      const temporarilyUnavailable = trackingRecovery.kind === 'unavailable';
      return withProgress({
        id: 'history_complete_optional_freshness', sectionLabel: 'Tracking status', eyebrow: coverage.allProvidersImported ? 'HISTORY COVERAGE COMPLETE' : 'EXPORT HISTORY INCLUDED',
        title: exportTitle,
        body: temporarilyUnavailable
          ? `${exportCoverageBody} Gmail is temporarily unavailable, so ongoing updates can be set up later.`
          : `${exportCoverageBody} Enable ongoing updates to catch supported newer orders and keep future stats current.`,
        icon: 'checkmark-circle-outline', tone: 'success',
        primaryAction: temporarilyUnavailable ? undefined : gmailConnected ? 'enable_tracking' : 'connect_gmail',
        primaryLabel: temporarilyUnavailable ? undefined : gmailConnected ? 'Enable ongoing updates' : 'Connect Gmail for updates',
        gmailPurpose: 'ongoing_tracking',
      }, progress);
    }
    if (setupRecommendation.kind === 'choose_source') {
      return withProgress({
        id: 'choose_import_source', sectionLabel: 'Next step', eyebrow: 'BUILD YOUR HISTORY',
        title: 'Choose how you want to start',
        body: 'Use email for a quick start, upload a provider export for detailed history, or use both in any order.',
        icon: 'layers-outline', tone: 'brand', primaryAction: 'open_import', primaryLabel: 'Choose a source',
      }, progress);
    }

    if (setupRecommendation.kind === 'provider') {
      return providerActionCard(setupRecommendation.provider, progress);
    }

    return withProgress({
      id: gmailConnected ? 'import_gmail' : 'connect_gmail', sectionLabel: 'Next step',
      eyebrow: 'START WITH YOUR INBOX',
      title: gmailConnected ? 'Import your Gmail receipts' : 'Connect Gmail for recent orders',
      body: 'SnackTrack can quickly find recent delivery receipts while provider exports add deeper history.',
      icon: gmailConnected ? 'mail-open-outline' : 'mail-outline', tone: 'brand',
      primaryAction: gmailConnected ? 'import_gmail' : 'connect_gmail',
      primaryLabel: gmailConnected ? 'Import receipts' : 'Connect Gmail',
      gmailPurpose: 'receipt_import',
    }, progress);
  }

  if (setupRecommendation.kind === 'provider') {
    return providerActionCard(setupRecommendation.provider, progress);
  }

  if (ongoingTracking.effectiveState === 'reconnect_required') {
    return withProgress({
      id: 'tracking_reconnect', sectionLabel: 'Next step', eyebrow: 'UPDATES ARE PAUSED',
      title: 'Reconnect Gmail to resume tracking',
      body: 'Your imported history is safe, but new receipts cannot be checked until Gmail is reconnected.',
      icon: 'link-outline', tone: 'warning', primaryAction: 'connect_gmail', primaryLabel: 'Reconnect Gmail',
      gmailPurpose: 'ongoing_tracking',
    }, progress);
  }

  if (ongoingTracking.effectiveState === 'error') {
    return withProgress({
      id: 'tracking_error', sectionLabel: 'Next step', eyebrow: 'TRACKING NEEDS ATTENTION',
      title: 'We couldn’t check for new orders', body: 'Your existing stats are safe. Try the check again.',
      icon: 'alert-circle-outline', tone: 'error', primaryAction: 'retry_tracking', primaryLabel: 'Try again', showActivity: true,
    }, progress);
  }

  if (ongoingTracking.effectiveState === 'active') {
    return withProgress({
      id: 'tracking_active', sectionLabel: 'Tracking status', eyebrow: 'ONGOING TRACKING IS ON',
      title: 'Your stats are staying up to date', body: 'SnackTrack will check for new delivery receipts. Check back occasionally to see what changed.',
      icon: 'radio-outline', tone: 'success', passive: true, showActivity: true,
    }, progress);
  }

  if (ongoingTracking.effectiveState === 'paused' || ongoingTracking.effectiveState === 'declined') {
    const needsBaseline = trackingRecovery.kind === 'baseline';
    const temporarilyUnavailable = trackingRecovery.kind === 'unavailable';
    return withProgress({
      id: 'tracking_paused', sectionLabel: 'Tracking status', eyebrow: 'ONGOING UPDATES ARE OFF',
      title: 'Your imported history is safe', body: 'Turn tracking back on whenever you want SnackTrack to check for new receipts.',
      icon: 'pause-circle-outline', tone: 'warning',
      primaryAction: trackingEligibility.eligible ? 'enable_tracking' : temporarilyUnavailable ? undefined : needsBaseline ? 'import_gmail' : 'connect_gmail',
      primaryLabel: trackingEligibility.eligible ? 'Turn on tracking' : temporarilyUnavailable ? undefined : needsBaseline ? 'Check email first' : 'Reconnect to enable',
      gmailPurpose: 'ongoing_tracking',
    }, progress);
  }

  if (!trackingEligibility.eligible) {
    const needsBaseline = trackingRecovery.kind === 'baseline';
    const temporarilyUnavailable = trackingRecovery.kind === 'unavailable';
    return withProgress({
      id: temporarilyUnavailable ? 'tracking_setup_unavailable' : needsBaseline ? 'tracking_setup_scan' : 'tracking_setup_reconnect', sectionLabel: 'Next step', eyebrow: 'OPTIONAL FUTURE UPDATES',
      title: temporarilyUnavailable ? 'Gmail is temporarily unavailable' : needsBaseline ? 'Check email before enabling updates' : 'Reconnect Gmail for future orders',
      body: temporarilyUnavailable
        ? 'Your connection and imported history are safe. Try setting up future updates again shortly.'
        : needsBaseline
        ? 'Your imported history is safe. Run a current email check before choosing whether SnackTrack should keep checking.'
        : 'Durable Gmail access is needed before you can allow periodic receipt checks.',
      icon: temporarilyUnavailable ? 'cloud-offline-outline' : needsBaseline ? 'mail-open-outline' : 'link-outline', tone: temporarilyUnavailable ? 'warning' : 'brand',
      primaryAction: temporarilyUnavailable ? undefined : needsBaseline ? 'import_gmail' : 'connect_gmail',
      primaryLabel: temporarilyUnavailable ? undefined : needsBaseline ? 'Check email' : 'Reconnect Gmail',
      gmailPurpose: 'ongoing_tracking',
    }, progress);
  }

  return withProgress({
    id: 'enable_tracking', sectionLabel: 'Next step', eyebrow: 'OPTIONAL FUTURE UPDATES',
    title: 'Keep your stats growing', body: 'Give SnackTrack permission to periodically check Gmail for new delivery receipts.',
    icon: 'pulse-outline', tone: 'brand', primaryAction: 'enable_tracking', primaryLabel: 'Enable ongoing tracking',
  }, progress);
};
