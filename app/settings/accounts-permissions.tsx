import { parseImportReturnTo, importReturnDestination } from '@features/import-flow/importNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { ImportRouteParams } from '@features/import-flow/importRouteParams';
import { useImportFlowController } from '@hooks/useImportFlowController';
import { addHistoryDestination, appDestinations, useAppNavigation } from '@features/navigation';
import { useUser } from '@contexts/UserContext';
import { useProviderReadyAlerts } from '@hooks/useProviderReadyAlerts';
import { useImportPreferences } from '@hooks/useImportPreferences';
import type { ExportProvider } from '@features/import-flow/contracts';
import { useProfileController } from '@hooks/useProfileController';

const neutralRoute: ImportRouteParams = { sourcePicker: false, showExportTutorial: false, focus: null, downloadedVersion: null, action: null, intentId: null, provider: null, gmailPurpose: null };

export default function AccountsPermissionsScreen() {
  const navigation = useAppNavigation();
  const params = useLocalSearchParams();
  const returnTo = parseImportReturnTo(params.returnTo);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const imports = useImportFlowController({ ...neutralRoute, returnTo: 'settings' }, 'manage');
  const profile = useProfileController();
  const gmail = imports.importPreferences?.gmailConnection;
  const outlook = imports.importPreferences?.outlookConnection;

  const lastCheck = imports.importPreferences?.ongoingTracking.activity.lastSuccessfulCheckAt;
  const setupMailbox = (mailbox: 'gmail' | 'outlook', reconnect = false) => navigation.open(addHistoryDestination({ intent: reconnect ? 'reconnect' : 'email', mailbox, returnTo: 'settings' }));
  if (imports.importPreferencesLoading || imports.importPreferencesError) return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}><PageHeader title={imports.importPreferencesError ? 'We couldn’t load account settings' : 'Loading account settings'} body="Your saved connections and permissions have not changed." /><AppButton label="Reload settings" onPress={() => { void imports.refreshImportPreferences(); }} /><AppButton label="Back" variant="secondary" onPress={() => navigation.backOr(appDestinations.profile)} /></ScrollView></SafeAreaView>;
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <AppButton label="Back" icon="arrow-back" variant="tertiary" onPress={() => navigation.replace(params.returnTo && returnTo !== 'settings' ? importReturnDestination(returnTo) : appDestinations.profile)} />
      <PageHeader eyebrow="YOU" title={params.mailbox === 'gmail' ? 'Gmail and automatic updates' : params.mailbox === 'outlook' ? 'Outlook and automatic updates' : 'Accounts & permissions'} body="Manage the connections that find orders and the permissions that keep your history current." />

      <AppText variant="sectionLabel">CONNECTED INBOXES</AppText>
      <Surface style={styles.group}>
        <AccountRow icon="logo-google" title="Gmail" detail={gmail?.email ?? (gmail?.connected ? 'Connected' : 'Not connected')} warning={gmail?.connectionHealth === 'reconnect_required'} action={gmail?.connectionHealth === 'unavailable' ? 'Reload' : gmail?.connected ? (gmail.connectionHealth === 'reconnect_required' ? 'Reconnect' : !imports.importPreferences?.gmailBaseline.hasCompleted ? 'Set up imports' : 'Disconnect') : 'Connect'} onPress={gmail?.connectionHealth === 'unavailable' ? () => { void imports.refreshImportPreferences(); } : gmail?.connected && gmail.connectionHealth !== 'reconnect_required' && imports.importPreferences?.gmailBaseline.hasCompleted ? imports.disconnectGmail : () => setupMailbox('gmail', gmail?.connectionHealth === 'reconnect_required')} />
        <View style={styles.divider} />
        <AccountRow icon="logo-microsoft" title="Outlook" detail={outlook?.email ?? (outlook?.connected ? 'Connected' : 'Not connected')} warning={outlook?.connectionHealth === 'reconnect_required'} action={outlook?.connectionHealth === 'unavailable' ? 'Reload' : outlook?.connected ? (outlook.connectionHealth === 'reconnect_required' ? 'Reconnect' : !imports.importPreferences?.outlookBaseline.hasCompleted ? 'Set up imports' : 'Disconnect') : 'Connect'} onPress={outlook?.connectionHealth === 'unavailable' ? () => { void imports.refreshImportPreferences(); } : outlook?.connected && outlook.connectionHealth !== 'reconnect_required' && imports.importPreferences?.outlookBaseline.hasCompleted ? imports.disconnectOutlook : () => setupMailbox('outlook', outlook?.connectionHealth === 'reconnect_required')} />
      </Surface>

      <AppText variant="sectionLabel">PERMISSIONS</AppText>
      <Surface style={styles.group}>
        <PermissionRow icon="pulse-outline" title="Automatic email updates" detail="Add new delivery receipts automatically. Turn this off or on anytime; your saved orders stay here." value={imports.importPreferences?.ongoingTracking.effectiveState === 'active' ? 'On' : imports.importPreferences?.ongoingTracking.effectiveState === 'setting_up' ? 'Starting' : imports.importPreferences?.ongoingTracking.effectiveState === 'reconnect_required' ? 'Reconnect' : imports.importPreferences?.ongoingTracking.effectiveState === 'error' ? 'Needs attention' : profile.settings.ongoingTrackingLabel} onPress={profile.toggleOngoingTracking} disabled={profile.arePreferencesBusy} />
        <View style={styles.divider} />
        {imports.importPreferences?.export.providers.uberEats.readyAlert?.backgroundAvailable ? <>
          <ReadyAlertPermission provider="uber_eats" imports={imports} />
          <View style={styles.divider} />
          <ReadyAlertPermission provider="doordash" imports={imports} />
        </> : <PermissionRow icon="notifications-outline" title="Uber ready-email checks" detail="Check for Uber’s ready email while SnackTrack is open. You still download the file yourself." value={profile.settings.exportAlertsLabel} onPress={profile.toggleExportAlerts} disabled={profile.arePreferencesBusy} />}
      </Surface>

      {imports.importPreferences?.ongoingTracking.effectiveState === 'error' ? <AppButton label="Retry automatic updates" variant="secondary" disabled={imports.connectionBusy} onPress={imports.setupOngoingUpdates} /> : null}
      {lastCheck && !Number.isNaN(Date.parse(lastCheck)) ? <AppText variant="metadata" tone="muted">Last successful email check: {new Date(lastCheck).toLocaleString()}</AppText> : null}
      {profile.deviceNotifications.supported ? <Surface><PermissionRow icon="notifications-outline" title="Notifications" detail="" value={profile.importNotificationsLabel} onPress={profile.toggleImportNotifications} disabled={profile.arePreferencesBusy} />
        {profile.deviceNotifications.issue ? <><AppText variant="metadata" tone="muted">{profile.deviceNotifications.issue === 'denied' ? 'Notifications are off in device settings.' : 'Couldn’t register this device. Try again.'}</AppText><AppButton label={profile.deviceNotifications.issue === 'denied' ? 'Open device settings' : 'Try again'} variant="secondary" onPress={profile.toggleImportNotifications} /></> : null}
      </Surface> : null}
      <Surface style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={25} color={theme.colors.primary} /><View style={styles.flex}><AppText variant="rowTitle">Your imported history stays yours</AppText><AppText variant="metadata" tone="muted">Disconnecting an inbox stops future access. Orders already imported remain until you reset imported data.</AppText></View></Surface>
      <AppButton label="Add orders" variant="secondary" onPress={() => navigation.open(addHistoryDestination({ returnTo: 'settings' }))} />
    </ScrollView>
  </SafeAreaView>;
}


function ReadyAlertPermission({ provider, imports }: { provider: ExportProvider; imports: ReturnType<typeof useImportFlowController> }) {
  const { state } = useUser();
  const preferences = useImportPreferences();
  const alerts = useProviderReadyAlerts({
    userId: state.user?.id, provider, goHome: () => undefined,
    connectGmail: imports.connectGmailForReadyAlerts, connectOutlook: imports.connectOutlookForReadyAlerts,
  });
  const selected = provider === 'uber_eats' ? preferences.preferences?.export.providers.uberEats : preferences.preferences?.export.providers.doorDash;
  const granted = selected?.readyAlert?.consentState === 'granted';
  const title = provider === 'uber_eats' ? 'Uber Eats ready alerts' : 'DoorDash ready alerts';
  return <View>
    <AppText variant="rowTitle">{title}</AppText>
    {alerts.inboxLabel ? <AppText variant="metadata" tone="muted">Connected: {alerts.inboxLabel}</AppText> : null}
    <AppText variant="metadata" tone="muted">Check connected email for this provider’s ready message while SnackTrack is closed. This does not import receipts or download the archive.</AppText>
    <AppText variant="metadata" tone="muted" accessibilityLiveRegion="polite">{alerts.description}</AppText>
    {alerts.chooseInbox ? <>
      <AppText variant="metadata" tone="muted">Choose the inbox used by your delivery-app account.</AppText>
      <AppButton label="Gmail" variant="secondary" pending={alerts.busy} onPress={() => alerts.connect('gmail')} />
      <AppButton label="Outlook" variant="secondary" pending={alerts.busy} onPress={() => alerts.connect('outlook')} />
    </> : !alerts.enabled && alerts.notificationsSupported ? <AppButton label={alerts.actionLabel} variant="secondary" pending={alerts.busy} onPress={() => alerts.issue === 'denied' ? alerts.openSettings() : alerts.enroll()} /> : null}
    {granted ? <AppButton label="Turn off ready-email monitoring" variant="tertiary" pending={alerts.busy} onPress={() => { void alerts.disable(); }} /> : null}
  </View>;
}

function AccountRow({ icon, title, detail, warning, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; warning?: boolean; action: string; onPress: () => void }) { const theme = useAppTheme(); return <View style={stylesStatic.row}><Ionicons name={warning ? 'warning-outline' : icon} size={24} color={warning ? theme.colors.warningDeep : theme.colors.primary} /><View style={stylesStatic.copy}><AppText variant="rowTitle">{title}</AppText><AppText variant="metadata" tone="muted" >{warning ? `${detail} · Reconnect required` : detail}</AppText></View><AppButton label={action} variant="tertiary" onPress={onPress} /></View>; }
function PermissionRow({ icon, title, detail, value, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; value: string; onPress: () => void; disabled: boolean }) { const theme = useAppTheme(); return <View style={stylesStatic.row}><Ionicons name={icon} size={24} color={theme.colors.primary} /><View style={stylesStatic.copy}><AppText variant="rowTitle">{title}</AppText><AppText variant="metadata" tone="muted">{detail}</AppText></View><AppButton label={value} variant="tertiary" onPress={onPress} disabled={disabled} /></View>; }
const stylesStatic = StyleSheet.create({ row: { minHeight: 76, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, copy: { flex: 1, minWidth: 140 } });
const createStyles = (theme: AppTheme) => StyleSheet.create({ container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 20, paddingBottom: 42, gap: 14 }, group: { gap: 2 }, divider: { height: 1, backgroundColor: theme.colors.divider }, privacy: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 } });
