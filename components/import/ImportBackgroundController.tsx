import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useUser } from '@contexts/UserContext';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { useImportOperation } from '@hooks/useImportOperation';
import { usePathname } from 'expo-router';
import { experienceApi } from '@services/experienceApi';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';
import { useAppNavigation } from '@features/navigation';

const TRACKING_FRESHNESS_MS = 15 * 60 * 1000;

/**
 * Owns import work that should follow the signed-in session rather than a
 * particular route. It renders nothing and remains mounted across tab changes.
 */
export function ImportBackgroundController() {
  const { state } = useUser();
  const { dispatchExternalNavigation } = useAppNavigation();
  const trackingCheckKey = useRef<string | null>(null);
  const previousTrackingState = useRef<string | null>(null);
  const handledOperation = useRef<string | null>(null);
  const pathname = usePathname();
  const {
    preferences,
    isUpdating,
    checkOngoingTracking,
  } = useImportPreferences(Boolean(state.user?.id));
  const { operation } = useImportOperation(Boolean(state.user?.id), true);

  useEffect(() => {
    trackingCheckKey.current = null;
    previousTrackingState.current = null;
    handledOperation.current = null;
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
    if (!preferences || !preferences.ongoingTracking.baseline.eligible || !['setting_up', 'active'].includes(preferences.ongoingTracking.effectiveState) || isUpdating) return;
    if (operation && ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status)) return;

    const lastChecked = preferences.ongoingTracking.activity.lastSuccessfulCheckAt;
    const lastCheckedAt = lastChecked ? new Date(lastChecked).getTime() : 0;
    if (lastCheckedAt && Date.now() - lastCheckedAt < TRACKING_FRESHNESS_MS) return;

    const operationKey = lastChecked ?? 'never';
    if (trackingCheckKey.current === operationKey) return;
    trackingCheckKey.current = operationKey;
    void checkOngoingTracking().catch(() => undefined);
  }, [checkOngoingTracking, isUpdating, preferences, operation]);

  useEffect(() => {
    const userId = state.user?.id;
    if (!userId || !operation || operation.status !== 'succeeded' || operation.trigger !== 'user'
      || operation.kind === 'manual_tracking' || operation.kind === 'scheduled_tracking'
      || operation.journeyContext === 'post_onboarding'
      // Add history hosts the same progress screen throughout upload and processing.
      // That screen owns navigation after its visible 100% completion hold.
      || pathname === '/data-setup' || pathname === '/import-progress' || pathname === '/add-history'
      || handledOperation.current === operation.id) return;
    let cancelled = false;
    void experienceApi.getState().then(experience => {
      if (cancelled) return;
      if (resolvePostImportDestination({ experience }) !== 'recap_ready') return;
      const outcome = dispatchExternalNavigation({
        kind: 'import-result',
        source: 'background',
        operationId: operation.id,
        returnTo: 'home',
      });
      if (outcome === 'navigated' || outcome === 'already-current') handledOperation.current = operation.id;
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [dispatchExternalNavigation, operation, pathname, state.user?.id]);

  return null;
}
