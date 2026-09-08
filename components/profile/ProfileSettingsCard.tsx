import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FontFamily, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { CurrencyCode } from '@utils/currency';
import { SUPPORTED_CURRENCIES } from '@utils/currency';
import { Card } from '@components/ui/Card';
import { AppText } from '@components/ui/AppText';

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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accent = destructive ? theme.colors.error : warning ? theme.colors.warningDeep : theme.colors.primary;
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.lastRow]}
      onPress={onActivate}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={[label, value, description].filter(Boolean).join('. ')}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(pending) }}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.alpha(accent, 0.1) }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="rowTitle" style={[styles.label, destructive && styles.destructiveLabel]}>{label}</AppText>
        {description ? <AppText variant="metadata" style={styles.description}>{description}</AppText> : null}
      </View>
      {pending ? <ActivityIndicator size="small" color={accent} /> : (
        <View style={styles.trailing}>
          {value ? <AppText variant="metadata" style={[styles.value, warning && styles.warningValue]} numberOfLines={1}>{value}</AppText> : null}
          <Ionicons name="chevron-forward" size={18} color={theme.colors.gray400} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.group}>
      <AppText variant="sectionLabel" style={styles.groupTitle}>{title}</AppText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

interface ProfileSettingsCardProps {
  currency: CurrencyCode;
  mailboxConnectionsLabel: string;
  importNotificationsLabel: string;
  destructiveActionBusy: boolean;
  showDevelopmentReset: boolean;
  onOpenReceipts: () => void;
  onOpenImport: () => void;
  onToggleImportNotifications: () => void;
  onOpenCurrency: () => void;
  onOpenAppearance: () => void;
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
      <SettingsGroup title="Your SnackTrack">
        <SettingsRow icon="receipt-outline" label="Order history" description="Search and review imported orders." onActivate={props.onOpenReceipts} />
        <SettingsRow icon="shield-checkmark-outline" label="Accounts & permissions" description="Connected inboxes, automatic updates, and data access." value={props.mailboxConnectionsLabel} onActivate={props.onOpenImport} warning={props.mailboxConnectionsLabel === 'Needs attention'} />
        <SettingsRow icon="cash-outline" label="Currency" value={`${SUPPORTED_CURRENCIES[props.currency].symbol} ${props.currency}`} onActivate={props.onOpenCurrency} />
        <SettingsRow icon="contrast-outline" label="Appearance" description="System, light, or dark" onActivate={props.onOpenAppearance} last />
      </SettingsGroup>

      <SettingsGroup title="Support & preferences">
        <SettingsRow icon="help-circle-outline" label="Help & privacy" description="Answers, privacy details, and support." onActivate={props.onOpenHelp} />
        <SettingsRow icon="notifications-circle-outline" label="Import completion notifications" description="Get a device notification when a background import finishes." value={props.importNotificationsLabel} onActivate={props.onToggleImportNotifications} last />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  group: { marginBottom: 22 },
  groupTitle: { marginBottom: 9, marginLeft: 4 },
  card: { overflow: 'hidden' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  lastRow: { borderBottomWidth: 0 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, marginLeft: 12 },
  label: { fontFamily: FontFamily.medium },
  destructiveLabel: { color: theme.colors.error },
  description: { marginTop: 3 },
  trailing: { maxWidth: '42%', marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { flexShrink: 1, fontFamily: FontFamily.medium, textAlign: 'right' },
  warningValue: { color: theme.colors.warningDeep },
});
