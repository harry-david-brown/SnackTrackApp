import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '@constants/theme';
import type { CurrencyCode } from '@utils/currency';
import { SUPPORTED_CURRENCIES } from '@utils/currency';
import { Card } from '@components/ui/Card';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IconName;
  label: string;
  onActivate: () => void;
  value?: string;
  disabled?: boolean;
  destructive?: boolean;
  warning?: boolean;
  pending?: boolean;
  last?: boolean;
}

function SettingsRow({ icon, label, onActivate, value, disabled, destructive, warning, pending, last }: SettingsRowProps) {
  const color = destructive ? Colors.error : warning ? Colors.warning : Colors.textSecondary;
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.lastRow]}
      onPress={onActivate}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(pending) }}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.label, (destructive || warning) && { color }]}>{label}</Text>
      {pending ? <ActivityIndicator size="small" color={color} /> : (
        <>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          {!warning && <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />}
        </>
      )}
    </TouchableOpacity>
  );
}

interface ProfileSettingsCardProps {
  currency: CurrencyCode;
  exportAlertsLabel: string;
  ongoingTrackingLabel: string;
  providerExportLabel: string;
  importPreferencesBusy: boolean;
  destructiveActionBusy: boolean;
  showDevelopmentReset: boolean;
  onOpenReceipts: () => void;
  onOpenImport: () => void;
  onToggleExportAlerts: () => void;
  onToggleOngoingTracking: () => void;
  onOpenTutorial: () => void;
  onOpenCurrency: () => void;
  onOpenHelp: () => void;
  onDevelopmentReset: () => void;
  onClearReceipts: () => void;
  onLogout: () => void;
}

export function ProfileSettingsCard(props: ProfileSettingsCardProps) {
  const destructiveDisabled = props.destructiveActionBusy;
  return (
    <Card style={styles.card}>
      <SettingsRow icon="receipt-outline" label="My Receipts" onActivate={props.onOpenReceipts} />
      <SettingsRow icon="cloud-upload-outline" label="Import Receipts" value={props.providerExportLabel} onActivate={props.onOpenImport} />
      <SettingsRow icon="sync-outline" label="Export-Ready Alerts" value={props.exportAlertsLabel} onActivate={props.onToggleExportAlerts} disabled={props.importPreferencesBusy} pending={props.importPreferencesBusy} />
      <SettingsRow icon="pulse-outline" label="Ongoing Order Tracking" value={props.ongoingTrackingLabel} onActivate={props.onToggleOngoingTracking} disabled={props.importPreferencesBusy} />
      <SettingsRow icon="information-circle-outline" label="View Tutorial" onActivate={props.onOpenTutorial} />
      <SettingsRow icon="cash-outline" label="Currency" value={`${SUPPORTED_CURRENCIES[props.currency].symbol} ${props.currency}`} onActivate={props.onOpenCurrency} />
      <SettingsRow icon="help-circle-outline" label="Help & Support" onActivate={props.onOpenHelp} />
      {props.showDevelopmentReset ? (
        <SettingsRow icon="refresh-outline" label={props.destructiveActionBusy ? 'Resetting Account...' : 'Reset Onboarding (Dev)'} onActivate={props.onDevelopmentReset} disabled={destructiveDisabled} warning />
      ) : null}
      <SettingsRow icon="trash-outline" label={props.destructiveActionBusy ? 'Resetting Account...' : 'Reset Imported Data'} onActivate={props.onClearReceipts} disabled={destructiveDisabled} pending={props.destructiveActionBusy} destructive />
      <SettingsRow icon="log-out-outline" label="Sign Out" onActivate={props.onLogout} destructive last />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 20, overflow: 'hidden' },
  row: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  lastRow: { borderBottomWidth: 0 },
  label: { flex: 1, fontSize: 16, marginLeft: 16, color: Colors.textPrimary },
  value: { flexShrink: 1, fontSize: 14, color: Colors.gray500, marginRight: 8, textAlign: 'right' },
});
