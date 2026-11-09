import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { AppButton } from '@components/ui/AppButton';
import { useAppTheme } from '@contexts/AppearanceContext';
import { Spacing } from '@constants/theme';

/** Shared presentation for setup and returning-user mailbox journeys. */
export function EmailJourneyHeading({ providerName, connected, reconnect = false, unavailable = false, email, busy, onChangeAccount }: {
  providerName: string;
  connected: boolean;
  reconnect?: boolean;
  unavailable?: boolean;
  email?: string | null;
  busy?: boolean;
  onChangeAccount?: () => void;
}) {
  const theme = useAppTheme();
  const ready = connected && !reconnect && !unavailable;
  return <View style={styles.hero}>
    <View style={[styles.icon, { backgroundColor: theme.colors.chipActiveBg, borderRadius: theme.radii.card }]}>
      <Ionicons accessible={false} name={unavailable ? 'time-outline' : reconnect ? 'refresh-outline' : ready ? 'checkmark' : 'mail-outline'} size={36} color={theme.colors.primary} />
    </View>
    <PageHeader
      eyebrow={ready ? `${providerName.toUpperCase()} CONNECTED` : undefined}
      title={unavailable ? `${providerName} is temporarily unavailable` : reconnect ? `Reconnect ${providerName}` : ready ? 'You’re connected.\nLet’s find your orders.' : 'Your delivery history\nstarts here.'}
      body={unavailable ? 'Try loading your connection again.' : reconnect ? 'Connect your inbox again to continue.' : ready ? 'Ready to bring your delivery receipts into SnackTrack?' : `Connect the ${providerName} inbox where your Uber Eats and DoorDash receipts arrive.`}
    />
    {connected && email ? <AppText variant="body" style={styles.email}>{email}</AppText> : null}
    {connected && onChangeAccount ? <View style={styles.change}><AppButton label="Use another account" variant="tertiary" disabled={busy} onPress={onChangeAccount} /></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  hero: { paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  icon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  email: { marginTop: Spacing.sm },
  change: { alignSelf: 'flex-start' },
});
