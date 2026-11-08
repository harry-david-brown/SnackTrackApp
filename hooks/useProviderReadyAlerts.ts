import { useDeviceNotifications } from '@hooks/useDeviceNotifications';
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useImportPreferences } from "@hooks/useImportPreferences";
import { supportsImportNotifications } from "@services/importNotifications";
import {
  alertDismissalKey,
} from "@utils/importJourneyStorage";
import type { ExportProvider } from "@features/import-flow/contracts";

export function useProviderReadyAlerts({
  userId,
  provider,
  goHome,
  connectGmail,
  connectOutlook,
}: {
  userId?: string;
  provider: ExportProvider | null;
  goHome: () => void;
  connectGmail: () => Promise<boolean>;
  connectOutlook: () => Promise<boolean>;
}) {
  const preferences = useImportPreferences();
  const selected =
    provider === "uber_eats"
      ? preferences.preferences?.export.providers.uberEats
      : provider === "doordash"
        ? preferences.preferences?.export.providers.doorDash
        : null;
  const alert = selected?.readyAlert;
  const cycle = selected?.requestId ?? selected?.requestedAt ?? "new";
  const device = useDeviceNotifications(userId);
  const deviceEnabled = device.enabled;
  const [issue, setIssue] = useState<'denied' | 'registration' | 'connection' | 'save' | null>(null);
  useEffect(() => { if (device.enabled) setIssue(null); }, [device.enabled]);
  const [chooseInbox, setChooseInbox] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const identityKey = `${userId}:${provider}:${cycle}`;
  const identity = useRef(identityKey);
  identity.current = identityKey;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () => mounted.current && identity.current === identityKey;
  const enabled = Boolean(
    alert?.backgroundAvailable &&
    alert.canMonitor &&
    alert.effectiveState !== "error" &&
    alert.effectiveState !== "unavailable" &&
    alert.consentState === "granted" &&
    alert.consentVersion === "export-ready-background-v1" &&
    deviceEnabled,
  );
  const monitoringGranted =
    alert?.consentState === "granted" &&
    alert.consentVersion === "export-ready-background-v1";
  const finishEnrollment = async () => {
    if (!isCurrent() || !userId || !provider || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    let savingConsent = true;
    try {
      const current = issue === 'save' ? await preferences.refreshVerified() : preferences.preferences;
      const saved = provider === 'uber_eats' ? current?.export.providers.uberEats.readyAlert : current?.export.providers.doorDash.readyAlert;
      if (!(saved?.consentState === 'granted' && saved.consentVersion === 'export-ready-background-v1'))
        await preferences.setProviderReadyAlertConsent({
          provider,
          decision: "granted",
        });
      if (!isCurrent()) return;
      savingConsent = false;
      const allowed = await device.enable();
      if (!isCurrent()) return;
      setIssue(allowed ? null : 'denied');
    } catch {
      if (isCurrent()) setIssue(savingConsent ? 'save' : 'registration');
    } finally {
      inFlight.current = false;
      if (isCurrent()) setBusy(false);
    }
  };
  const connect = async (mailbox: 'gmail' | 'outlook') => {
    if (!isCurrent() || inFlight.current) return;
    inFlight.current = true; setBusy(true); setChooseInbox(false);
    try {
      const connected = await (mailbox === 'gmail' ? connectGmail() : connectOutlook());
      if (!isCurrent()) return;
      if (connected) { await preferences.refresh(); setIssue(null); }
      else setIssue('connection');
      // OAuth only connects email. Review the connected address before Notify me.
    } catch { if (isCurrent()) setIssue('connection'); }
    finally { inFlight.current = false; if (isCurrent()) setBusy(false); }
  };
  const enroll = () => {
    if (!isCurrent() || !userId || !provider || !alert?.backgroundAvailable || busy || !supportsImportNotifications()) return;
    if (!alert.canMonitor) setChooseInbox(true);
    else void finishEnrollment();
  };
  // Leaving never enrolls, prompts, or changes consent.
  const leave = () => { if (isCurrent()) goHome(); };
  const disable = async () => {
    if (!provider || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await preferences.setProviderReadyAlertConsent({ provider, decision: 'revoked' }); if (isCurrent()) setIssue(null); }
    catch { if (isCurrent()) setIssue('registration'); }
    finally { inFlight.current = false; if (isCurrent()) setBusy(false); }
  };
  useEffect(() => {
    setIssue(null); setChooseInbox(false); setDismissed(false);
    if (!userId || !provider) return;
    let live = true;
    void AsyncStorage.getItem(alertDismissalKey(userId, provider, cycle)).then(value => { if (live) setDismissed(value === 'true'); }).catch(() => undefined);
    return () => { live = false; };
  }, [userId, provider, cycle]);
  const dismiss = async () => {
    if (!userId || !provider) return;
    setDismissed(true);
    await AsyncStorage.setItem(alertDismissalKey(userId, provider, cycle), 'true').catch(() => undefined);
  };
  return {
    enabled,
    busy,
    notificationsSupported: supportsImportNotifications(),
    monitoringGranted,
    disable,
    issue,
    chooseInbox,
    connect: (mailbox: 'gmail' | 'outlook') => { void connect(mailbox); },
    dismiss,
    openSettings: () => { void Linking.openSettings(); },
    actionLabel: issue === 'denied' ? 'Open device settings' : issue === 'registration' || issue === 'save' || issue === 'connection' ? 'Try again' : !alert?.canMonitor ? (preferences.preferences?.gmailConnection.needsReconnect || preferences.preferences?.outlookConnection.needsReconnect ? 'Reconnect email' : 'Connect email') : 'Notify me when it’s ready',

    available: Boolean(alert?.backgroundAvailable && (monitoringGranted || (!dismissed && supportsImportNotifications()))),
    enroll,
    leave,
    label: enabled
      ? "Notifications on"
      : alert?.effectiveState === "error"
        ? "Ready checks need attention"
        : alert?.effectiveState === "unavailable"
          ? "Ready checks temporarily unavailable"
          : alert?.consentState === "granted" && !alert.canMonitor
            ? "Reconnect email for alerts"
            : alert?.consentState === "granted" && !deviceEnabled
              ? "Enable device notifications"
              : "Notify me when it’s ready",
    inboxLabel: [preferences.preferences?.gmailConnection, preferences.preferences?.outlookConnection].filter(connection => connection?.connected && !connection.needsReconnect).map(connection => connection?.email).filter(Boolean).join(', '),
    description: issue === 'connection' ? 'The inbox connection wasn’t completed. Try again or check the provider’s email yourself.' : issue === 'save' ? 'We couldn’t confirm your monitoring choice. Check and try again.' : issue === 'denied'
      ? 'Device notifications are off. Your ready-email monitoring choice is saved.'
      : issue === 'registration'
      ? 'We couldn’t finish saving this change. Check your connection and try again.'
      : enabled
      ? "We’ll give you a heads-up."
      : alert?.effectiveState === "error"
        ? "We’ll retry automatically. Your place is saved."
        : alert?.consentState === "granted" && !deviceEnabled
          ? "Ready status is still available in Add orders."
          : "Get a heads-up from SnackTrack.",
  };
}
