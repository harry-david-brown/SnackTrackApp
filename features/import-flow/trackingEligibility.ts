import type { ImportPreferencesResponse } from '@services/gmailApi';

export type TrackingEligibilityReason =
  | 'loading'
  | 'gmail_history_required'
  | 'gmail_reconnect_required'
  | 'eligible';

export interface TrackingEligibility {
  eligible: boolean;
  reason: TrackingEligibilityReason;
}

/** Canonical prerequisite shared by every ongoing-tracking entry point. */
export function resolveTrackingEligibility(
  preferences: ImportPreferencesResponse | null,
): TrackingEligibility {
  if (!preferences) return { eligible: false, reason: 'loading' };
  if (!preferences.gmailImport.hasImported) {
    return { eligible: false, reason: 'gmail_history_required' };
  }
  if (!preferences.ongoingTracking.capability.canTrack) {
    return { eligible: false, reason: 'gmail_reconnect_required' };
  }
  return { eligible: true, reason: 'eligible' };
}
