import { useCallback } from 'react';
import type { ImportPreferencesResponse } from '@features/import-flow/contracts';

type SetOngoingTrackingConsent = (decision: 'granted' | 'declined' | 'revoked') => Promise<ImportPreferencesResponse>;

/** Consent and device notifications are independent. Callers render the returned server state. */
export function useOngoingTrackingActivation(
  _userId: string | undefined,
  setOngoingTrackingConsent: SetOngoingTrackingConsent,
  _onNotificationStatusChange?: (enabled: boolean) => void,
) {
  const enableOngoingTracking = useCallback(() => setOngoingTrackingConsent('granted'), [setOngoingTrackingConsent]);
  return { enableOngoingTracking };
}
