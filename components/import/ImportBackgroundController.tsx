import { useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useImportPreferences } from '../../hooks/useImportPreferences';

const TRACKING_FRESHNESS_MS = 15 * 60 * 1000;

/**
 * Owns import work that should follow the signed-in session rather than a
 * particular route. It renders nothing and remains mounted across tab changes.
 */
export function ImportBackgroundController() {
  const { state } = useUser();
  const initialScanKey = useRef<string | null>(null);
  const trackingCheckKey = useRef<string | null>(null);
  const {
    preferences,
    isUpdating,
    importGmailReceipts,
    checkOngoingTracking,
  } = useImportPreferences(Boolean(state.user?.id));

  useEffect(() => {
    initialScanKey.current = null;
    trackingCheckKey.current = null;
  }, [state.user?.id]);

  useEffect(() => {
    if (
      !preferences
      || preferences.export.status !== 'completed'
      || preferences.gmailImport.hasImported
      || preferences.gmailImport.status === 'importing'
      || !preferences.ongoingTracking.capability.canTrack
      || isUpdating
    ) return;

    const operationKey = preferences.export.updatedAt ?? 'completed-export';
    if (initialScanKey.current === operationKey) return;
    initialScanKey.current = operationKey;
    void importGmailReceipts().catch(() => undefined);
  }, [importGmailReceipts, isUpdating, preferences]);

  useEffect(() => {
    if (preferences?.ongoingTracking.effectiveState !== 'active' || isUpdating) return;

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
