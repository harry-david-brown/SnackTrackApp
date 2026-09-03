import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@constants/theme';
import type { CurrencyCode } from '@utils/currency';
import { SUPPORTED_CURRENCIES } from '@utils/currency';
import { Card } from '@components/ui/Card';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IconName;
  label: string;
  description?: string;
  onActivate: () => void;
  value?: string;
  disabled?: boolean;
  destructive?: boolean;
  warning?: boolean;
  pending?: boolean;
  last?: boolean;
}

function SettingsRow({ icon, label, description, onActivate, value, disabled, destructive, warning, pending, last }: SettingsRowProps) {
  const accent = destructive ? Colors.error : warning ? Colors.warningDeep : Colors.primary;
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.lastRow]}
      onPress={onActivate}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={[label, value, description].filter(Boolean).join('. ')}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(pending) }}
    >
      <View style={[styles.iconWrap, { backgroundColor: Colors.alpha(accent, 0.1) }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, destructive && styles.destructiveLabel]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {pending ? <ActivityIndicator size="small" color={accent} /> : (
        <View style={styles.trailing}>
          {value ? <Text style={[styles.value, warning && styles.warningValue]} numberOfLines={1}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

interface ProfileSettingsCardProps {
  currency: CurrencyCode;
  mailboxConnectionsLabel: string;
  exportAlertsLabel: string;
  ongoingTrackingLabel: string;
  providerExportLabel: string;
  importNotificationsLabel: string;
  importPreferencesBusy: boolean;
  destructiveActionBusy: boolean;
  showDevelopmentReset: boolean;
  onOpenReceipts: () => void;
  onOpenImport: () => void;
  onToggleExportAlerts: () => void;
  onToggleOngoingTracking: () => void;
  onToggleImportNotifications: () => void;
  onOpenTutorial: () => void;
  onOpenCurrency: () => void;
  onOpenHelp: () => void;
  onDevelopmentReset: () => void;
  onClearReceipts: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
}

export function ProfileSettingsCard(props: ProfileSettingsCardProps) {
  const destructiveDisabled = props.destructiveActionBusy;
  return (
    <View>
      <SettingsGroup title="Your data">
        <SettingsRow icon="layers-outline" label="Add & manage data" description="Manage email connections, scans, and delivery-app history files." value={props.mailboxConnectionsLabel === 'Needs attention' ? 'Needs attention' : props.providerExportLabel} onActivate={props.onOpenImport} warning={props.mailboxConnectionsLabel === 'Needs attention'} />
        <SettingsRow icon="receipt-outline" label="Order history" description="Search and review imported orders." onActivate={props.onOpenReceipts} />
        <SettingsRow icon="pulse-outline" label="Automatic updates" description="Check connected email accounts for new supported orders." value={props.ongoingTrackingLabel} onActivate={props.onToggleOngoingTracking} disabled={props.importPreferencesBusy} pending={props.importPreferencesBusy} last />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow icon="notifications-circle-outline" label="Import completion notifications" description="Get a device notification when a background import finishes." value={props.importNotificationsLabel} onActivate={props.onToggleImportNotifications} />
        <SettingsRow icon="notifications-outline" label="History-file alerts" description="Get notified when a requested Uber file is ready." value={props.exportAlertsLabel} onActivate={props.onToggleExportAlerts} disabled={props.importPreferencesBusy} pending={props.importPreferencesBusy} />
        <SettingsRow icon="cash-outline" label="Currency" value={`${SUPPORTED_CURRENCIES[props.currency].symbol} ${props.currency}`} onActivate={props.onOpenCurrency} />
        <SettingsRow icon="book-outline" label="Import guide" onActivate={props.onOpenTutorial} />
        <SettingsRow icon="help-circle-outline" label="Help & support" onActivate={props.onOpenHelp} last />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow icon="log-out-outline" label="Sign out" onActivate={props.onLogout} />
        {props.showDevelopmentReset ? (
          <SettingsRow icon="refresh-outline" label={props.destructiveActionBusy ? 'Resetting account…' : 'Reset onboarding (development)'} onActivate={props.onDevelopmentReset} disabled={destructiveDisabled} warning />
        ) : null}
        <SettingsRow icon="trash-outline" label={props.destructiveActionBusy ? 'Working…' : 'Reset imported data'} description="Permanently remove imports and disconnect email accounts." onActivate={props.onClearReceipts} disabled={destructiveDisabled} pending={props.destructiveActionBusy} destructive />
        <SettingsRow icon="person-remove-outline" label="Delete account" description="Permanently delete your SnackTrack account and all data." onActivate={props.onDeleteAccount} disabled={destructiveDisabled} destructive last />
      </SettingsGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 22 },
  groupTitle: { marginBottom: 9, marginLeft: 4, fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', color: Colors.textSecondary },
  card: { overflow: 'hidden' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  lastRow: { borderBottomWidth: 0 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, marginLeft: 12 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  destructiveLabel: { color: Colors.error },
  description: { marginTop: 3, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  trailing: { maxWidth: '42%', marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right' },
  warningValue: { color: Colors.warningDeep },
});
