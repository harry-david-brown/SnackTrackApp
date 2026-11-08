import { useEffect, useState } from 'react';
import { useUser } from '@contexts/UserContext';
import { finishMailboxAuthorization } from '@services/mailboxAuthorization';
import type { MailboxAuthorizationProvider } from '@utils/mailboxAuthorizationStorage';

export const useMailboxAuthorizationCallback = (
  provider: MailboxAuthorizationProvider | undefined,
  providerStatus: string | undefined,
  completionToken: string | null,
) => {
  const { state } = useUser();
  const userId = state.user?.id;
  const [result, setResult] = useState<{ key: string; status: 'success' | 'error' } | null>(null);
  const key = `${userId}:${provider}:${completionToken}`;
  useEffect(() => {
    // The root route guard owns signed-out navigation; keep the deep link intact during hydration.
    if (!provider || providerStatus !== 'pending' || state.isLoading || !state.isAuthenticated || !userId) return;
    let cancelled = false;
    void finishMailboxAuthorization(provider, userId, completionToken).then(
      () => { if (!cancelled) setResult({ key, status: 'success' }); },
      () => { if (!cancelled) setResult({ key, status: 'error' }); },
    );
    return () => { cancelled = true; };
  }, [provider, providerStatus, completionToken, userId, key, state.isLoading, state.isAuthenticated]);
  if (providerStatus === 'pending') {
    return { completing: result?.key !== key, status: result?.key === key ? result.status : undefined };
  }
  // Old or fabricated success links cannot bypass the authenticated completion boundary.
  return { completing: false, status: providerStatus ? 'error' as const : undefined };
};
