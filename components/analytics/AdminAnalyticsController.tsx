import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useUser } from '@contexts/UserContext';
import { flushAdminEvents, trackAdminEvent } from '@services/adminAnalytics';

export function AdminAnalyticsController() {
  const { state } = useUser();
  const userId = state.user?.id;
  const activeUser = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || activeUser.current === userId) return;
    activeUser.current = userId;
    void trackAdminEvent('app_session_started').then(() => flushAdminEvents(userId)).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void trackAdminEvent('app_session_started').then(() => flushAdminEvents(userId)).catch(() => undefined);
    });
    const network = NetInfo.addEventListener((next) => {
      if (next.isConnected) void flushAdminEvents(userId).catch(() => undefined);
    });
    return () => { appState.remove(); network(); };
  }, [userId]);

  return null;
}
