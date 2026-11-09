import { useUser } from '@contexts/UserContext';
import { useFlowAttemptScope } from './useFlowAttemptScope';
import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { resolveOngoingUpdatesState } from '@features/import-flow/ongoingUpdatesState';
import { addHistoryDestination, appDestinations, useAppNavigation } from '@features/navigation';

type ConsentDecision = 'granted' | 'declined';
type ConsentAction =
  | { phase: 'idle' }
  | { phase: 'saving' | 'reconciling' | 'uncertain'; decision: ConsentDecision }
  | { phase: 'checking' | 'retrying' }
  | { phase: 'failed'; reason: 'error' | 'unavailable' };

export function useOngoingUpdatesJourney(reconsider = false) {
  const preferences = useImportPreferences();
  const { refresh } = preferences;
  const navigation = useAppNavigation();
  const focused = useIsFocused();
  const { state: user } = useUser();
  const scope = useFlowAttemptScope(user.user?.id ?? 'signed-out');
  const [snapshot, setSnapshot] = useState<{ scope: typeof scope; action: ConsentAction }>({ scope, action: { phase: 'idle' } });
  const action = snapshot.scope === scope ? snapshot.action : { phase: 'idle' } as const;
  const update = (next: ConsentAction) => setSnapshot({ scope, action: next });
  const [chooseInbox, setChooseInbox] = useState(false);
  useEffect(() => { setChooseInbox(false); }, [scope]);
  const busy = ['saving', 'reconciling', 'checking', 'retrying'].includes(action.phase);
  const state = action.phase === 'failed' ? action.reason : resolveOngoingUpdatesState(preferences.preferences, {
    unavailable: Boolean(preferences.queryError), saveFailed: action.phase === 'uncertain', reconsider,
  });
  // Poll only while this journey is visible and the first check is still running.
  useEffect(() => {
    if (!focused) return;
    void refresh();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    const timer = state === 'setting_up' ? setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 4000) : undefined;
    return () => { subscription.remove(); if (timer) clearInterval(timer); };
  }, [focused, state, refresh]);
  const run = async (next: ConsentAction, work: (isCurrent: () => boolean) => Promise<void>, failure: ConsentAction) => {
    const attempt = scope.begin();
    if (attempt === null) return;
    update(next);
    const isCurrent = () => scope.owns(attempt);
    try {
      await work(isCurrent);
      if (isCurrent()) update({ phase: 'idle' });
    } catch { if (isCurrent()) update(failure); }
    finally { scope.finish(attempt); }
  };
  const decide = (decision: ConsentDecision) => {
    void run({ phase: 'saving', decision }, async isCurrent => {
      await preferences.setOngoingTrackingConsent(decision);
      if (isCurrent() && decision === 'declined') navigation.replace(appDestinations.home);
    }, { phase: 'uncertain', decision });
  };
  const primary = () => {
    if (state === 'eligible') { decide('granted'); return; }
    if (state === 'disconnected' || state === 'reconnect') { setChooseInbox(true); return; }
    if (state === 'baseline') { navigation.open(addHistoryDestination()); return; }
    if (state === 'setting_up') { navigation.replace(appDestinations.home); return; }
    if (state === 'active' || state === 'off' || state === 'loading') { navigation.replace(appDestinations.history); return; }
    const pendingDecision = action.phase === 'uncertain' ? action.decision : null;
    void run(pendingDecision ? { phase: 'reconciling', decision: pendingDecision } : { phase: state === 'error' ? 'retrying' : 'checking' }, async isCurrent => {
      if (state === 'error') {
        const operation = await preferences.checkOngoingTracking();
        if (!isCurrent()) return;
        // Acceptance is not completion; use the durable operation's progress screen.
        navigation.replace({ pathname: '/import-progress', params: { operationId: operation.id, returnTo: 'ongoing_updates' } });
        return;
      }
      const current = await preferences.refreshVerified();
      if (!isCurrent()) return;
      if (!current) throw new Error('Preferences unavailable');
      if (state === 'save_failed' && pendingDecision) {
        const next = resolveOngoingUpdatesState(current, { reconsider });
        if (pendingDecision === 'declined' && current.ongoingTracking.consentState !== 'declined') await preferences.setOngoingTrackingConsent('declined');
        else if (pendingDecision === 'granted' && next === 'eligible') await preferences.setOngoingTrackingConsent('granted');
        if (isCurrent() && pendingDecision === 'declined') navigation.replace(appDestinations.home);
      }
    }, pendingDecision ? { phase: 'uncertain', decision: pendingDecision } : { phase: 'failed', reason: state === 'error' ? 'error' : 'unavailable' });
  };
  const connect = (mailbox: 'gmail' | 'outlook') => navigation.open(addHistoryDestination({ intent: 'reconnect', mailbox, gmailPurpose: 'ongoing_tracking', returnTo: 'ongoing_updates' }));
  const leave = useCallback(() => navigation.replace(appDestinations.home), [navigation]);
  return { state, actionPhase: action.phase, busy: busy || preferences.isUpdating, chooseInbox: chooseInbox && (state === 'disconnected' || state === 'reconnect'), primary, connect, leave, decline: () => decide('declined') };
}
