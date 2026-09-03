import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useUser } from '@contexts/UserContext';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { useImportOperation } from '@hooks/useImportOperation';

const TRACKING_FRESHNESS_MS = 15 * 60 * 1000;

/**
 * Owns import work that should follow the signed-in session rather than a
 * particular route. It renders nothing and remains mounted across tab changes.
 */
export function ImportBackgroundController() {
  const { state } = useUser();
  const trackingCheckKey = useRef<string | null>(null);
  const previousTrackingState = useRef<string | null>(null);
  const {
    preferences,
    isUpdating,
    checkOngoingTracking,
  } = useImportPreferences(Boolean(state.user?.id));
  useImportOperation(Boolean(state.user?.id), true);

  useEffect(() => {
    trackingCheckKey.current = null;
    previousTrackingState.current = null;
  }, [state.user?.id]);

  useEffect(() => {
    const nextState = preferences?.ongoingTracking.effectiveState ?? null;
    const previousState = previousTrackingState.current;
    previousTrackingState.current = nextState;
    if (previousState !== 'setting_up') return;
    if (nextState === 'active') {
      AccessibilityInfo.announceForAccessibility('Ongoing updates are ready. SnackTrack will keep checking for supported new delivery receipts.');
    } else if (nextState === 'error' || nextState === 'reconnect_required') {
      AccessibilityInfo.announceForAccessibility('Ongoing updates need attention. Your imported history is safe.');
    }
  }, [preferences?.ongoingTracking.effectiveState]);

  useEffect(() => {
    if (!preferences || !['setting_up', 'active'].includes(preferences.ongoingTracking.effectiveState) || isUpdating) return;

    const lastChecked = preferences.ongoingTracking.activity.lastSuccessfulCheckAt;
    const lastCheckedAt = lastChecked ? new Date(lastChecked).getTime() : 0;
    if (lastCheckedAt && Date.now() - lastCheckedAt < TRACKING_FRESHNESS_MS) return;

    const operationKey = lastChecked ?? 'never';
    if (trackingCheckKey.current === operationKey) return;
    trackingCheckKey.current = operationKey;
    void checkOngoingTracking().catch(() => undefined);
  }, [checkOngoingTracking, isUpdating, preferences]);

  return null;
}
