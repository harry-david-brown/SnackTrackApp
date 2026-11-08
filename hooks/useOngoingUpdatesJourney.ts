import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { resolveOngoingUpdatesState } from '@features/import-flow/ongoingUpdatesState';
import { addHistoryDestination, appDestinations, useAppNavigation } from '@features/navigation';

export function useOngoingUpdatesJourney(reconsider = false) {
  const preferences = useImportPreferences();
  const { refresh } = preferences;
  const navigation = useAppNavigation();
  const focused = useIsFocused();
  const [actionFailure, setActionFailure] = useState<'error' | 'unavailable' | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'granted' | 'declined' | null>(null);
  const [busy, setBusy] = useState(false);
  const [chooseInbox, setChooseInbox] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const state = actionFailure ?? resolveOngoingUpdatesState(preferences.preferences, { unavailable: Boolean(preferences.queryError), saveFailed, reconsider });
  // Poll only while this journey is visible and the first check is still running.
  useEffect(() => {
    if (!focused) return;
    void refresh();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    const timer = state === 'setting_up' ? setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 4000) : undefined;
    return () => { subscription.remove(); if (timer) clearInterval(timer); };
  }, [focused, state, refresh]);
  const run = async (work: () => Promise<void>, failure: 'save_failed' | 'error' | 'unavailable' = 'save_failed') => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await work(); } catch { if (mounted.current) { if (failure === 'save_failed') setSaveFailed(true); else setActionFailure(failure); } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const decide = (decision: 'granted' | 'declined') => {
    setPendingDecision(decision);
    void run(async () => {
      await preferences.setOngoingTrackingConsent(decision);
      if (!mounted.current) return;
      setSaveFailed(false); setActionFailure(null); setPendingDecision(null);
      if (decision === 'declined') navigation.replace(appDestinations.home);
    });
  };
  const primary = () => {
    if (state === 'eligible') { decide('granted'); return; }
    if (state === 'disconnected' || state === 'reconnect') { setChooseInbox(true); return; }
    if (state === 'baseline') { navigation.open(addHistoryDestination()); return; }
    if (state === 'setting_up') { navigation.replace(appDestinations.home); return; }
    if (state === 'active' || state === 'off' || state === 'loading') { navigation.replace(appDestinations.history); return; }
    void run(async () => {
      if (state === 'error') {
        const operation = await preferences.checkOngoingTracking();
        // Acceptance is not completion; use the durable operation's progress screen.
        navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: 'ongoing_updates' } });
        return;
      }
      const current = await preferences.refreshVerified();
      if (!current) throw new Error('Preferences unavailable');
      if (state === 'save_failed' && pendingDecision) {
        const next = resolveOngoingUpdatesState(current, { reconsider });
        if (pendingDecision === 'declined' && current.ongoingTracking.consentState !== 'declined') await preferences.setOngoingTrackingConsent('declined');
        else if (pendingDecision === 'granted' && next === 'eligible') await preferences.setOngoingTrackingConsent('granted');
        if (pendingDecision === 'declined') navigation.replace(appDestinations.home);
      }
      if (mounted.current) { setSaveFailed(false); setActionFailure(null); setPendingDecision(null); }
    }, state === 'error' ? 'error' : state === 'save_failed' ? 'save_failed' : 'unavailable');
  };
  const connect = (mailbox: 'gmail' | 'outlook') => navigation.open(addHistoryDestination({ intent: 'reconnect', mailbox, gmailPurpose: 'ongoing_tracking', returnTo: 'ongoing_updates' }));
  const leave = useCallback(() => navigation.replace(appDestinations.home), [navigation]);
  return { state, busy: busy || preferences.isUpdating, chooseInbox: chooseInbox && (state === 'disconnected' || state === 'reconnect'), primary, connect, leave, decline: () => decide('declined') };
}
