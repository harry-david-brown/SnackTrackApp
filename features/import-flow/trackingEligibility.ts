import type { ImportPreferencesResponse } from '@services/gmailApi';
import { resolveGmailBaselineState } from './gmailBaselineState';

export type TrackingEligibilityReason =
  | 'loading'
  | 'historical_baseline_required'
  | 'gmail_reconnect_required'
  | 'gmail_temporarily_unavailable'
  | 'eligible';

export interface TrackingEligibility {
  eligible: boolean;
  reason: TrackingEligibilityReason;
}

export type TrackingBaselineSource = 'gmail' | 'exports' | 'none';

export function resolveTrackingBaselineSource(
  preferences: ImportPreferencesResponse | null,
): TrackingBaselineSource {
  if (!preferences) return 'none';
  if (preferences.ongoingTracking.baseline) {
    return preferences.ongoingTracking.baseline.source;
  }
  const providers = preferences.coverage.exportProviders;
  if (providers.uberEats.hasData || providers.doorDash.hasData) return 'exports';
  return resolveGmailBaselineState(preferences).hasCompleted ? 'gmail' : 'none';
}

/** Canonical prerequisite shared by every ongoing-tracking entry point. */
export function resolveTrackingEligibility(
  preferences: ImportPreferencesResponse | null,
): TrackingEligibility {
  if (!preferences) return { eligible: false, reason: 'loading' };
  if (resolveTrackingBaselineSource(preferences) === 'none') {
    return { eligible: false, reason: 'historical_baseline_required' };
  }
  if (preferences.ongoingTracking.capability.connectionHealth === 'unavailable') {
    return { eligible: false, reason: 'gmail_temporarily_unavailable' };
  }
  if (!preferences.ongoingTracking.capability.canTrack) {
    return { eligible: false, reason: 'gmail_reconnect_required' };
  }
  return { eligible: true, reason: 'eligible' };
}

export type TrackingRecovery =
  | { kind: 'loading' }
  | { kind: 'baseline'; action: 'import_gmail'; purpose: 'ongoing_tracking' }
  | { kind: 'reconnect'; action: 'connect_gmail'; purpose: 'ongoing_tracking' }
  | { kind: 'unavailable' }
  | { kind: 'eligible'; action: 'enable_tracking' };

export function resolveTrackingRecovery(
  preferences: ImportPreferencesResponse | null,
): TrackingRecovery {
  const eligibility = resolveTrackingEligibility(preferences);
  switch (eligibility.reason) {
    case 'historical_baseline_required':
      return { kind: 'baseline', action: 'import_gmail', purpose: 'ongoing_tracking' };
    case 'gmail_reconnect_required':
      return { kind: 'reconnect', action: 'connect_gmail', purpose: 'ongoing_tracking' };
    case 'gmail_temporarily_unavailable':
      return { kind: 'unavailable' };
    case 'eligible':
      return { kind: 'eligible', action: 'enable_tracking' };
    default:
      return { kind: 'loading' };
  }
}

export interface OngoingUpdatesPresentation {
  visible: boolean;
  statusLabel: string;
  tone: 'complete' | 'recommended' | 'optional' | 'warning';
  title: string;
  body: string;
  actionLabel?: string;
  actionVariant?: 'primary' | 'secondary';
}

const formatCoverageDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date);
};

const exportCoverageDescription = (preferences: ImportPreferencesResponse): string | null => {
  const providers = preferences.coverage.exportProviders;
  const uberDate = formatCoverageDate(providers.uberEats.latestOrderDate);
  const doorDashDate = formatCoverageDate(providers.doorDash.latestOrderDate);
  if (!uberDate || !doorDashDate) return null;
  return `Your Uber Eats export is covered through ${uberDate} and DoorDash through ${doorDashDate}.`;
};

export function resolveOngoingUpdatesPresentation(
  preferences: ImportPreferencesResponse | null,
  hasHistoricalCoverage: boolean,
): OngoingUpdatesPresentation {
  if (!preferences || !hasHistoricalCoverage) {
    return { visible: false, statusLabel: 'Optional', tone: 'optional', title: 'Future updates', body: '' };
  }
  const tracking = preferences.ongoingTracking;
  const effectiveTrackingState = tracking.effectiveState ?? 'not_offered';
  const baselineSource = resolveTrackingBaselineSource(preferences);
  const exportCoverage = baselineSource === 'exports'
    ? exportCoverageDescription(preferences)
    : null;
  if (effectiveTrackingState === 'setting_up') {
    return {
      visible: true,
      statusLabel: 'Catching up',
      tone: 'optional',
      title: 'Keeping your stats up to date',
      body: baselineSource === 'exports'
        ? `${exportCoverage ? `${exportCoverage} ` : ''}SnackTrack is checking for supported delivery receipts after those dates.`
        : 'SnackTrack is checking for delivery receipts newer than your last Gmail import.',
    };
  }
  if (effectiveTrackingState === 'active') {
    return {
      visible: true,
      statusLabel: 'On',
      tone: 'complete',
      title: 'Future updates',
      body: 'SnackTrack will periodically check for new delivery receipts. Your imported history remains separate and complete.',
    };
  }
  if (effectiveTrackingState === 'reconnect_required') {
    return {
      visible: true,
      statusLabel: 'Reconnect',
      tone: 'warning',
      title: 'Future updates',
      body: 'Your imported history is safe. Reconnect Gmail to resume the optional updates you enabled.',
      actionLabel: 'Reconnect Gmail',
    };
  }
  if (effectiveTrackingState === 'error') {
    return {
      visible: true,
      statusLabel: 'Needs attention',
      tone: 'warning',
      title: 'Future updates',
      body: 'The latest background check failed. Your imported history is safe.',
      actionLabel: 'Review updates',
    };
  }
  const recovery = resolveTrackingRecovery(preferences);
  const trackingWasDeclined = effectiveTrackingState === 'paused' || effectiveTrackingState === 'declined';
  if (!trackingWasDeclined && recovery.kind === 'reconnect') {
    return {
      visible: true,
      statusLabel: 'Reconnect',
      tone: 'warning',
      title: 'Reconnect Gmail for future updates',
      body: 'Your imported history is safe. Reconnect Gmail before enabling automatic updates.',
      actionLabel: 'Reconnect Gmail',
      actionVariant: 'secondary',
    };
  }
  const shouldRecommend = recovery.kind === 'eligible' && effectiveTrackingState === 'not_offered';
  return {
    visible: true,
    statusLabel: trackingWasDeclined ? 'Off' : shouldRecommend ? 'Recommended' : 'Optional',
    tone: recovery.kind === 'unavailable' ? 'warning' : shouldRecommend ? 'recommended' : 'optional',
    title: shouldRecommend ? 'Keep your stats updated' : 'Future updates',
    body: trackingWasDeclined
      ? 'Your imported history is complete. Ongoing Gmail updates are off, and you can turn them back on from Profile whenever you want.'
      : recovery.kind === 'baseline'
      ? 'Add a provider export or complete one Gmail history import before setting up ongoing updates.'
      : recovery.kind === 'unavailable'
        ? 'Gmail is temporarily unavailable. Your connection and imported history are unchanged.'
        : baselineSource === 'exports'
          ? `${exportCoverage ? `${exportCoverage} ` : ''}Let SnackTrack catch supported newer receipts, then keep checking for future orders.`
          : 'Optionally let SnackTrack check for new delivery receipts so your stats stay current.',
    actionLabel: recovery.kind === 'unavailable' || trackingWasDeclined ? undefined : 'Enable Ongoing Updates',
    actionVariant: shouldRecommend ? 'primary' : 'secondary',
  };
}
