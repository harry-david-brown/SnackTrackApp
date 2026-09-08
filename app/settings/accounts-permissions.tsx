import { parseImportReturnTo, importReturnDestination } from '@features/import-flow/importNavigation';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useProfileController } from '@hooks/useProfileController';

const neutralRoute: ImportRouteParams = { sourcePicker: false, showExportTutorial: false, focus: null, downloadedVersion: null, action: null, intentId: null, provider: null, gmailPurpose: null };

export default function AccountsPermissionsScreen() {
  const params = useLocalSearchParams();
  const returnTo = parseImportReturnTo(params.returnTo);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const imports = useImportFlowController({ ...neutralRoute, returnTo: 'settings' }, 'manage');
  const profile = useProfileController();
  const gmail = imports.importPreferences?.gmailConnection;
  const outlook = imports.importPreferences?.outlookConnection;

  const lastCheck = imports.importPreferences?.ongoingTracking.activity.lastSuccessfulCheckAt;
  const setupMailbox = (mailbox: 'gmail' | 'outlook', reconnect = false) => router.push({ pathname: '/add-history', params: { intent: reconnect ? 'reconnect' : 'email', mailbox, returnTo: 'settings' } });
  if (imports.importPreferencesLoading || imports.importPreferencesError) return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}><PageHeader title={imports.importPreferencesError ? 'We couldn’t load account settings' : 'Loading account settings'} body="Your saved connections and permissions have not changed." /><AppButton label="Reload settings" onPress={() => { void imports.refreshImportPreferences(); }} /><AppButton label="Back" variant="secondary" onPress={() => router.back()} /></ScrollView></SafeAreaView>;
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <AppButton label="Back" icon="arrow-back" variant="tertiary" onPress={() => router.replace(params.returnTo && returnTo !== 'settings' ? importReturnDestination(returnTo) : '/(tabs)/profile')} />
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
        <PermissionRow icon="notifications-outline" title="Uber ready-email checks" detail="Check for Uber’s ready email while SnackTrack is open. You still download the file yourself." value={profile.settings.exportAlertsLabel} onPress={profile.toggleExportAlerts} disabled={profile.arePreferencesBusy} />
      </Surface>

      {imports.importPreferences?.ongoingTracking.effectiveState === 'error' ? <AppButton label="Retry automatic updates" variant="secondary" disabled={imports.connectionBusy} onPress={imports.setupOngoingUpdates} /> : null}
      {lastCheck && !Number.isNaN(Date.parse(lastCheck)) ? <AppText variant="metadata" tone="muted">Last successful email check: {new Date(lastCheck).toLocaleString()}</AppText> : null}
      <Surface><PermissionRow icon="notifications-outline" title="Import completion notifications" detail="Get a device notification when SnackTrack finishes adding your orders. This does not check for Uber’s email." value={profile.importNotificationsLabel} onPress={profile.toggleImportNotifications} disabled={profile.arePreferencesBusy} /></Surface>
      <Surface style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={25} color={theme.colors.primary} /><View style={styles.flex}><AppText variant="rowTitle">Your imported history stays yours</AppText><AppText variant="metadata" tone="muted">Disconnecting an inbox stops future access. Orders already imported remain until you reset imported data.</AppText></View></Surface>
      <AppButton label="Add orders" variant="secondary" onPress={() => router.push('/add-history?returnTo=settings')} />
    </ScrollView>
  </SafeAreaView>;
}

function AccountRow({ icon, title, detail, warning, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; warning?: boolean; action: string; onPress: () => void }) { const theme = useAppTheme(); return <View style={stylesStatic.row}><Ionicons name={warning ? 'warning-outline' : icon} size={24} color={warning ? theme.colors.warningDeep : theme.colors.primary} /><View style={stylesStatic.copy}><AppText variant="rowTitle">{title}</AppText><AppText variant="metadata" tone="muted" >{warning ? `${detail} · Reconnect required` : detail}</AppText></View><AppButton label={action} variant="tertiary" onPress={onPress} /></View>; }
function PermissionRow({ icon, title, detail, value, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; value: string; onPress: () => void; disabled: boolean }) { const theme = useAppTheme(); return <View style={stylesStatic.row}><Ionicons name={icon} size={24} color={theme.colors.primary} /><View style={stylesStatic.copy}><AppText variant="rowTitle">{title}</AppText><AppText variant="metadata" tone="muted">{detail}</AppText></View><AppButton label={value} variant="tertiary" onPress={onPress} disabled={disabled} /></View>; }
const stylesStatic = StyleSheet.create({ row: { minHeight: 76, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, copy: { flex: 1, minWidth: 140 } });
const createStyles = (theme: AppTheme) => StyleSheet.create({ container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 20, paddingBottom: 42, gap: 14 }, group: { gap: 2 }, divider: { height: 1, backgroundColor: theme.colors.divider }, privacy: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 } });
