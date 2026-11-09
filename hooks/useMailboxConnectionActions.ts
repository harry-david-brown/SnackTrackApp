import { useCallback, useEffect, useRef, useState } from 'react';
import type { GmailConnectPhase } from '@components/gmail/GmailImportLoadingModal';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';
import { resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';
import { useAppNavigation } from '@features/navigation';
import { showSimpleAlert } from '@utils/platformAlert';
import type { ImportResources } from './useImportResources';
import { useFlowAttemptScope } from './useFlowAttemptScope';

export type MailboxConnectionOutcome = {
  provider: 'gmail' | 'outlook';
  purpose: GmailConnectionPurpose;
  connected: boolean;
  needsBaseline: boolean;
};

export function useMailboxConnectionActions(
  { userId, gmail, outlook, preferences, connectionBusy }: ImportResources,
  onOutcome: (outcome: MailboxConnectionOutcome) => void,
) {
  const navigation = useAppNavigation();
  const scope = useFlowAttemptScope(userId ?? 'signed-out');
  const [gmailConnectPhase, setGmailConnectPhase] =
    useState<GmailConnectPhase>('idle');
  const connectSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    setGmailConnectPhase('idle');
    return () => {
      if (connectSuccessTimer.current)
        clearTimeout(connectSuccessTimer.current);
    };
  }, [scope]);

  const connect = useCallback(
    async (
      provider: 'gmail' | 'outlook',
      requestedPurpose: GmailConnectionPurpose,
    ) => {
      if (connectionBusy) return false;
      const attempt = scope.begin();
      if (attempt === null) return false;
      if (provider === 'gmail' && connectSuccessTimer.current)
        clearTimeout(connectSuccessTimer.current);
      if (provider === 'gmail') setGmailConnectPhase('connecting');
      try {
        const result =
          provider === 'gmail'
            ? await gmail.connectGmail(requestedPurpose)
            : await outlook.connectOutlook(requestedPurpose);
        if (!scope.owns(attempt)) return false;
        if (!result) {
          onOutcome({
            provider,
            purpose: requestedPurpose,
            connected: false,
            needsBaseline: false,
          });
          if (provider === 'gmail') setGmailConnectPhase('idle');
          return false;
        }
        const purpose =
          provider === 'gmail' &&
          typeof result === 'object' &&
          'purpose' in result
            ? result.purpose
            : requestedPurpose;
        const current = await preferences.refresh();
        if (!scope.owns(attempt)) return false;
        const needsBaseline =
          purpose === 'ongoing_tracking' &&
          resolveTrackingRecovery(current).kind !== 'eligible';
        onOutcome({ provider, purpose, connected: true, needsBaseline });
        if (purpose === 'ongoing_tracking') {
          if (!needsBaseline)
            navigation.replace({
              pathname: '/ongoing-updates',
              params: { manage: 'true' },
            });
          else
            showSimpleAlert(
              provider === 'gmail' ? 'Gmail is ready' : 'Outlook is ready',
              provider === 'gmail'
                ? 'Check your email history once to establish a starting point. SnackTrack will ask separately before enabling ongoing updates.'
                : 'Check your email history once. SnackTrack will ask separately before enabling ongoing updates.',
            );
        } else if (provider === 'gmail' && purpose === 'connection_recovery') {
          showSimpleAlert(
            'Gmail reconnected',
            'Your Gmail connection is ready. You can continue where you left off.',
          );
        }
        if (provider === 'gmail') {
          setGmailConnectPhase('connected');
          connectSuccessTimer.current = setTimeout(() => {
            setGmailConnectPhase('idle');
            connectSuccessTimer.current = null;
          }, 2200);
        }
        return true;
      } catch {
        if (scope.owns(attempt)) {
          if (provider === 'gmail') setGmailConnectPhase('idle');
          showSimpleAlert(
            'Could not confirm your inbox',
            'Try again to check the connection.',
          );
        }
        return false;
      } finally {
        scope.finish(attempt);
      }
    },
    [connectionBusy, gmail, outlook, preferences, navigation, onOutcome, scope],
  );

  return {
    connectEmail: useCallback(
      (purpose: GmailConnectionPurpose = 'receipt_import') =>
        connect('gmail', purpose),
      [connect],
    ),
    connectOutlook: useCallback(
      (purpose: GmailConnectionPurpose = 'receipt_import') =>
        connect('outlook', purpose),
      [connect],
    ),
    gmailConnectPhase,
  };
}
