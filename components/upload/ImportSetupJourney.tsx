import { ReceiptInboxChoice } from '@components/import/ReceiptInboxChoice';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ImportJourneyHeader } from '@components/import/ImportJourneyHeader';
import { EmailJourneyHeading } from '@components/import/EmailJourneyHeading';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import type { ImportFlowState } from '@features/import-flow/importFlowResolver';
import { resolveInitialImportJourney, type ImportSetupPath, type MailboxOAuthReturnState } from '@features/import-flow/initialImportJourney';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import type { DataPlatform } from './UberDataTutorial';
import { trackAdminEvent } from '@services/adminAnalytics';
import { Mascot } from '@components/mascot/Mascot';
import { useAppTheme } from '@contexts/AppearanceContext';

interface ImportSetupJourneyProps {
  flow: ImportFlowState;
  selectedPath: ImportSetupPath;
  oauthReturn?: MailboxOAuthReturnState | null;
  busy: boolean;
  connectionBusy?: boolean;
  onBack?: () => void;
  onChooseEmailPath: () => void;
  onChooseEmail: (provider: 'gmail' | 'outlook') => void;
  onChooseAlternative: () => void;
  onChangeAccount: (provider: 'gmail' | 'outlook') => void;
  onChangeMethod: () => void;
  onImportGmail: () => void;
  onImportOutlook: () => void;
  onChooseProvider: (provider: DataPlatform) => void;
  onRetryOAuthConnection: () => void;
}

export function ImportSetupJourney(props: ImportSetupJourneyProps) {
  const theme = useAppTheme();
  const journey = resolveInitialImportJourney(props.flow, props.selectedPath, props.oauthReturn);
  const disabled = props.busy || Boolean(props.connectionBusy);
  const onBack = journey.kind === 'choose_provider' || journey.kind === 'choose_email_provider'
    || journey.kind === 'review_email_scan' || journey.kind === 'oauth_return_failed'
    ? props.onChangeMethod : props.onBack;
  const handleBack = useCallback(() => {
    if (disabled || journey.kind === 'oauth_returning') return true;
    if (!onBack) return false;
    onBack();
    return true;
  }, [disabled, journey.kind, onBack]);
  useFocusEffect(useCallback(() => {
    if (journey.kind === 'complete' || journey.kind === 'provider_resume') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack, journey.kind]));
  if (journey.kind === 'complete' || journey.kind === 'provider_resume') return null;

  if (journey.kind === 'oauth_returning') return <View style={[styles.journey, styles.oauthStatus]}>
    <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel={`Completing ${journey.providerName} connection`} />
    <JourneyHeading eyebrow="SECURE CONNECTION" title={`Completing ${journey.providerName} connection`} body="We’re confirming that your inbox is ready before showing the next step." />
  </View>;

  if (journey.kind === 'oauth_return_failed') return <View style={styles.journey}>
    <JourneyHeading eyebrow="CONNECTION NEEDS ATTENTION" title={`We couldn’t finish connecting ${journey.providerName}`} body="Your existing SnackTrack data is safe. Try the connection again or choose another method." />
    <View style={styles.actions}>
      <AppButton size="journey" label={`Try ${journey.providerName} again`} onPress={props.onRetryOAuthConnection} />
      <AppButton label="Use another method" variant="tertiary" onPress={props.onChangeMethod} />
    </View>
  </View>;

  if (journey.kind === 'choose_provider') return <View style={styles.journey}>
    <ImportJourneyHeader backLabel="Back to email options" onBack={handleBack} disabled={disabled} />
    <Mascot pose="prop-first-receipt" size={118} style={styles.mascot} accessibilityLabel="SnackTrack holding a receipt" />
    <JourneyHeading eyebrow="GET THE FULL PICTURE" title="Add orders using a downloaded file" body="Request your order history, download the file when it’s ready, then upload it here. We’ll guide you through each step." />
    <View style={styles.choiceStack}>
      <ChoiceRow icon="car-outline" title="Uber Eats" subtitle="Add orders and details that email may miss" accent={theme.colors.uberDark} onPress={() => {
        void trackAdminEvent('mailbox_provider_selected', { provider: 'uber_eats', properties: { provider: 'uber_eats' } }).catch(() => undefined);
        props.onChooseProvider('uber');
      }} />
      <ChoiceRow icon="bag-handle-outline" title="DoorDash" subtitle="Add orders and details that email may miss" accent={theme.colors.doorDash} onPress={() => {
        void trackAdminEvent('mailbox_provider_selected', { provider: 'doordash', properties: { provider: 'doordash' } }).catch(() => undefined);
        props.onChooseProvider('doordash');
      }} />
    </View>
  </View>;

  if (journey.kind === 'review_email_scan') {
    const blocked = journey.temporarilyUnavailable || (!journey.canImport && !journey.needsReconnect);
    const primaryAction = journey.needsReconnect ? () => props.onChooseEmail(journey.provider) : journey.provider === 'gmail' ? props.onImportGmail : props.onImportOutlook;
    return <View style={styles.journey}>
      <EmailJourneyHeading providerName={journey.providerName} connected reconnect={journey.needsReconnect} unavailable={journey.temporarilyUnavailable} email={journey.email} busy={props.busy || props.connectionBusy} onChangeAccount={() => props.onChangeAccount(journey.provider)} />
      {journey.needsReconnect || journey.temporarilyUnavailable ? <View style={[styles.warning, { backgroundColor: theme.colors.warningSurface }]}><AppText variant="surfaceBody" style={{ color: theme.colors.warningDeep }}>{journey.needsReconnect ? 'Reconnect this inbox before starting the scan. Your existing history is safe.' : 'This email service is temporarily unavailable. Your connection is still saved.'}</AppText></View> : null}
      <View style={styles.actions}>
        <AppButton size="journey" label={journey.needsReconnect ? `Reconnect ${journey.providerName}` : 'Find my orders'} pending={journey.needsReconnect ? props.connectionBusy : props.busy} disabled={blocked} onPress={primaryAction} />
        <AppButton label="Use another method" variant="tertiary" onPress={props.onChangeMethod} disabled={props.busy || props.connectionBusy} />
      </View>
    </View>;
  }

  return <ReceiptInboxChoice
    disabled={props.busy || Boolean(props.connectionBusy)}
    onBack={onBack ? handleBack : undefined}
    onChooseEmail={props.onChooseEmail}
    onChooseAlternative={props.onChooseAlternative}
  />;
}

function JourneyHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <View style={styles.heading}><AppText variant="eyebrow" tone="brand">{eyebrow}</AppText><AppText variant="pageTitle" style={styles.title}>{title}</AppText><AppText tone="muted" style={styles.body}>{body}</AppText></View>;
}
function ChoiceRow({ icon, title, subtitle, onPress, accent }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; accent?: string }) {
  const theme = useAppTheme();
  const color = accent ?? theme.colors.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={({ pressed }) => [styles.choice, { backgroundColor: theme.colors.surface, borderColor: theme.colors.slate200 }, pressed && { backgroundColor: theme.colors.infoBg }]}>
    <View style={[styles.choiceIcon, { backgroundColor: theme.colors.chipActiveBg }]}><Ionicons name={icon} size={20} color={color} /></View>
    <View style={styles.choiceCopy}><AppText variant="rowTitle">{title}</AppText><AppText variant="metadata" tone="muted" style={styles.rowMeta}>{subtitle}</AppText></View>
    <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  journey: { flex: 1 }, oauthStatus: { justifyContent: 'center', gap: 24 }, mascot: { alignSelf: 'center', marginBottom: 4 }, heading: { marginBottom: 18 }, title: { marginTop: 5 }, body: { marginTop: 9 },
  choiceStack: { gap: 10 }, choice: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }, recommended: { minHeight: 78, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }, pressed: { opacity: 0.76 },
  choiceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, choiceCopy: { flex: 1 }, rowMeta: { marginTop: 3 },
  another: { marginTop: 19, marginBottom: 8 }, note: { marginTop: 10, textAlign: 'center' }, actions: { marginTop: 'auto', paddingTop: 18, gap: 10 },
  reviewList: { marginTop: 4 }, reviewRow: { paddingVertical: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, reviewIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, warning: { marginTop: 12, padding: 14, borderRadius: 18 },
});
export default ImportSetupJourney;
