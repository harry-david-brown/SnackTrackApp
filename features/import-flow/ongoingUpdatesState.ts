import type { ImportPreferencesResponse } from './contracts';

export type OngoingUpdatesState = 'loading' | 'unavailable' | 'eligible' | 'disconnected' | 'reconnect' | 'setting_up' | 'active' | 'off' | 'baseline' | 'error' | 'save_failed';
export function resolveOngoingUpdatesState(preferences: ImportPreferencesResponse | null, options: { unavailable?: boolean; saveFailed?: boolean; reconsider?: boolean } = {}): OngoingUpdatesState {
  if (options.saveFailed) return 'save_failed';
  if (options.unavailable) return 'unavailable';
  if (!preferences) return 'loading';
  const tracking = preferences.ongoingTracking;
  if (!tracking.baseline.eligible || tracking.baseline.source === 'none') return 'baseline';
  if (!options.reconsider && (tracking.consentState === 'declined' || tracking.effectiveState === 'declined' || tracking.effectiveState === 'paused' || tracking.consentState === 'revoked')) return 'off';
  if (tracking.capability.connectionHealth === 'unavailable') return 'unavailable';
  if (!tracking.capability.canTrack) {
    const previouslyConnected = Boolean(preferences.gmailConnection.email || preferences.outlookConnection.email || tracking.capability.needsReconnect);
    return previouslyConnected ? 'reconnect' : 'disconnected';
  }
  if (tracking.effectiveState === 'setting_up') return 'setting_up';
  if (tracking.effectiveState === 'active') return 'active';
  if (tracking.effectiveState === 'error') return 'error';
  if (tracking.effectiveState === 'reconnect_required') return tracking.consentState === 'granted' ? 'error' : 'eligible';
  return 'eligible';
}

export const ongoingUpdatesCopy: Record<OngoingUpdatesState, { eyebrow: string; title: string; body: string; note: string; action: string }> = {
  loading: { eyebrow: 'AUTOMATIC UPDATES', title: 'Checking your settings.', body: 'You can leave this screen while we load your saved update preferences.', note: 'Checking update settings…', action: 'View order history' },
  eligible: { eyebrow: 'FROM HERE ON', title: 'Keep your story up to date.', body: 'Let SnackTrack periodically check your connected inboxes for supported delivery receipts, even while the app is closed.', note: 'Turn updates off anytime in Accounts & permissions. Device notifications are a separate choice.', action: 'Enable automatic updates' },
  disconnected: { eyebrow: 'OPTIONAL NEXT STEP', title: 'Let new orders find their way in.', body: 'Connect the inbox that receives your delivery receipts. You’ll review automatic updates before turning them on.', note: 'Connecting email is optional. Your imported history stays here.', action: 'Connect email' },
  reconnect: { eyebrow: 'UPDATES NEED ATTENTION', title: 'Reconnect email for updates.', body: 'SnackTrack needs access to an inbox again before it can check for new receipts.', note: 'Your imported history is safe. Reconnecting does not enable new receipt checks without your permission.', action: 'Reconnect email' },
  setting_up: { eyebrow: 'YOUR CHOICE IS SAVED', title: 'Setting up automatic updates.', body: 'We’re checking for supported receipts newer than your imported history.', note: 'You can leave this screen. The first check continues in the background, and Home will show its status.', action: 'Go home' },
  active: { eyebrow: 'READY TO EXPLORE', title: 'Your story keeps growing.', body: 'Automatic updates are on. We’ll periodically check your connected inboxes for new supported receipts.', note: 'Your imported orders are ready to explore.', action: 'View order history' },
  off: { eyebrow: 'READY WHEN YOU ARE', title: 'Your story is ready to explore.', body: 'Your imported orders and stats are here whenever you want to revisit them.', note: 'Automatic updates are off. You can change this anytime in Accounts & permissions.', action: 'View order history' },
  baseline: { eyebrow: 'FIND YOUR FIRST ORDERS', title: 'Start with your order history.', body: 'Add a delivery-app history file or complete an eligible email history scan before setting up automatic updates.', note: 'If an import failed or found no supported orders, try another source. Any existing history is safe.', action: 'Add order history' },
  unavailable: { eyebrow: 'TRY AGAIN SHORTLY', title: 'We can’t check your settings right now.', body: 'Your saved history is still available. Your update preferences haven’t changed.', note: 'Try loading the latest status before reconnecting an inbox or enabling updates again.', action: 'Check again' },
  error: { eyebrow: 'UPDATES NEED ANOTHER TRY', title: 'We couldn’t finish checking for orders.', body: 'Your imported history is safe. The latest receipt check did not finish.', note: 'Your permission is saved. Retry the check without enabling updates a second time.', action: 'Retry check' },
  save_failed: { eyebrow: 'CHOICE NOT CONFIRMED', title: 'We couldn’t confirm your choice.', body: 'Check your connection and try again. Your imported history is safe.', note: 'We’ll check your saved setting before retrying so you won’t need to start over.', action: 'Check and retry' },
};

/** Automatic journeys use this gate; explicit settings remain available. */
export function shouldOfferAutomaticUpdates(preferences: ImportPreferencesResponse | null): boolean {
  return Boolean(preferences && (preferences.coverage.hasEmailData || preferences.coverage.hasExportData) && !preferences.automaticUpdatesOfferSeenAt
    && preferences.ongoingTracking.consentState === 'not_offered'
    && ['eligible', 'disconnected'].includes(resolveOngoingUpdatesState(preferences)));
}
