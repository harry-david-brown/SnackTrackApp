import { useQueryClient } from '@tanstack/react-query';
import { importPreferenceKeys } from '@lib/queryKeys';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useUser } from '@contexts/UserContext';
import { beginAdForegroundSession } from '@features/ads/adSession';
import { gmailApi } from '@services/gmailApi';
import type { ImportPreferencesResponse } from '@features/import-flow/contracts';
import { parseImportNotification } from '@features/import-flow/importNotification';
import { useAppNavigation } from '@features/navigation';

export {
  registerImportNotificationDevice,
  requestImportNotifications,
} from '@services/importNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function ImportNotificationController() {
  const { state } = useUser();
  const userId = state.user?.id;
  const queryClient=useQueryClient();
  const { dispatchExternalNavigation } = useAppNavigation();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') backgroundedAt.current = Date.now();
      if (next === 'active' && userId && backgroundedAt.current && Date.now() - backgroundedAt.current >= 30_000) {
        beginAdForegroundSession(userId);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [userId]);

  // Refresh saved ready status even when this device has declined notifications.
  useEffect(()=>{
    if(!userId || !state.isAuthenticated)return;
    const refresh=()=>{
      if(AppState.currentState!=='active')return;
      const queryKey=importPreferenceKeys.current(userId);
      const cached=queryClient.getQueryData<ImportPreferencesResponse>(queryKey);
      if(Object.values(cached?.export.providers ?? {}).some(provider=>provider.status==='requested' && provider.readyAlert?.consentState==='granted')) {
        void queryClient.fetchQuery({queryKey,queryFn:gmailApi.getImportPreferences,staleTime:60_000}).catch(()=>undefined);
      }
    };
    const interval=setInterval(refresh,60_000);
    const subscription=AppState.addEventListener('change',next=>{if(next==='active')refresh();});
    return()=>{clearInterval(interval);subscription.remove();};
  },[userId,state.isAuthenticated,queryClient]);
  const handled = useRef(new Set<string>());
  useEffect(() => {
    if (!userId || !state.isAuthenticated) return;
    let live = true;
    const receive = async (event: Notifications.NotificationResponse) => {
      const identifier = event.notification.request.identifier;
      const key = `${userId}:${identifier}`;
      if (handled.current.has(key)) return;
      const intent = parseImportNotification(event.notification.request.content.data);
      if (!intent) return;
      handled.current.add(key);
      try {
        if (intent.type === 'import_operation') {
          dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: intent.operationId });
        } else {
          const preferences = await queryClient.fetchQuery({queryKey:importPreferenceKeys.current(userId),queryFn:gmailApi.getImportPreferences,staleTime:0});
          if (!live) { handled.current.delete(key); return; }
          const provider = intent.provider === 'uber_eats' ? preferences.export.providers.uberEats : preferences.export.providers.doorDash;
          // Old request notifications must never reopen a completed or replacement request.
          if (provider.requestId === intent.requestId && provider.status === 'file_ready') {
            dispatchExternalNavigation({ kind: 'resume-export', source: 'export-ready', provider: intent.provider, showDownloadSteps: true });
          }
        }
        await Notifications.clearLastNotificationResponseAsync();
      } catch {
        // Keep the response available for a later foreground retry after a network failure.
        handled.current.delete(key);
      }
    };
    const delivered=Notifications.addNotificationReceivedListener(notification=>{
      if(parseImportNotification(notification.request.content.data)?.type==='export_ready') {
        void queryClient.invalidateQueries({queryKey:importPreferenceKeys.current(userId)});
      }
    });
    const response = Notifications.addNotificationResponseReceivedListener(event => { void receive(event); });
    const restore = () => { void Notifications.getLastNotificationResponseAsync().then(event => { if (live && event) void receive(event); }).catch(() => undefined); };
    restore();
    const foreground = AppState.addEventListener('change', next => { if (next === 'active') restore(); });
    return () => { live = false; response.remove(); delivered.remove(); foreground.remove(); };
  }, [userId, state.isAuthenticated, dispatchExternalNavigation,queryClient]);

  return null;
}
