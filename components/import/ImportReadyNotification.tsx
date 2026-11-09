import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { useDeviceNotifications } from '@hooks/useDeviceNotifications';

/** Device notifications only: enrolling never grants automatic mailbox access. */
export function ImportReadyNotification({ userId, returningUser = false }: { userId?: string; returningUser?: boolean }) {
  const notifications = useDeviceNotifications(userId);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const enable = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try { await notifications.enable(); }
    catch { /* The shared owner exposes registration failure and its retry state. */ }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  if (!notifications.supported) return <AppText variant="metadata" tone="muted" style={styles.center}>
    Notifications aren’t available on this device. Stay here to see your results when they’re ready.
  </AppText>;
  const denied = notifications.issue === 'denied';
  const failed = notifications.issue === 'registration';
  const enabled = notifications.enabled;
  return <View style={styles.container}>
    <AppText variant="body" tone="muted" style={styles.center} accessibilityLiveRegion="polite">
      {enabled ? 'You can close SnackTrack. Your import will keep going, and we’ll notify you when it’s ready.'
        : denied ? 'Notifications are off for SnackTrack. Enable them in your phone settings, or stay here to see your results.'
        : failed ? 'We couldn’t finish setting up notifications. Try again, or stay here to see your results.'
        : returningUser ? 'You can keep using SnackTrack while we add your orders. We can notify you when they’re ready.'
        : 'No need to keep this screen open. We can notify you when your results are ready.'}
    </AppText>
    <AppButton size="journey" icon={enabled ? 'checkmark-circle-outline' : 'notifications-outline'}
      label={enabled ? 'We’ll notify you when ready' : denied ? 'Open notification settings' : failed ? 'Try notifications again' : 'Notify me when ready'}
      variant={enabled ? 'secondary' : 'primary'} disabled={enabled || !userId} pending={busy}
      onPress={denied ? notifications.openSettings : () => { void enable(); }} />
    <AppText variant="metadata" tone="muted" style={styles.center}>
      You can also stay here and watch your progress. This won’t turn on automatic email imports.
    </AppText>
  </View>;
}
const styles = StyleSheet.create({ container: { width: '100%', gap: 14 }, center: { textAlign: 'center' } });
