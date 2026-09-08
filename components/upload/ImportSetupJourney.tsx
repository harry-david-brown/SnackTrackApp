import { EmailImportReview } from '@components/import/EmailImportReview';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ImportFlowState } from '@features/import-flow/importFlowResolver';
import { resolveInitialImportJourney, type ImportSetupPath } from '@features/import-flow/initialImportJourney';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import type { DataPlatform } from './UberDataTutorial';
import { trackAdminEvent } from '@services/adminAnalytics';
import { Mascot } from '@components/mascot/Mascot';
import { useAppTheme } from '@contexts/AppearanceContext';

interface ImportSetupJourneyProps {
  flow: ImportFlowState;
  selectedPath: ImportSetupPath;
  busy: boolean;
  connectionBusy?: boolean;
  automaticImportsDisabled?: boolean;
  automaticUpdatesLabel?: string;
  automaticUpdatesDescription?: string;
  onChooseEmailPath: () => void;
  onChooseEmail: (provider: 'gmail' | 'outlook') => void;
  onChooseAlternative: () => void;
  onChangeMethod: () => void;
  onImportGmail: () => void;
  onImportOutlook: () => void;
  onChooseProvider: (provider: DataPlatform) => void;
}

export function ImportSetupJourney(props: ImportSetupJourneyProps) {
  const theme = useAppTheme();
  const journey = resolveInitialImportJourney(props.flow, props.selectedPath);
  if (journey.kind === 'complete' || journey.kind === 'provider_resume') return null;

  if (journey.kind === 'choose_provider') return <View style={styles.journey}>
    <Progress step={2} />
    <Mascot pose="prop-receipt" size={118} style={styles.mascot} accessibilityLabel="SnackTrack holding a receipt" />
    <JourneyHeading eyebrow="GET THE FULL PICTURE" title="Where do most of your orders live?" body="Choose a delivery app and we’ll guide you through bringing your complete history into SnackTrack." />
    <View style={styles.choiceStack}>
      <ChoiceRow icon="car-outline" title="Uber Eats" subtitle="Full available history, including recent orders and more detail" accent={theme.colors.uberDark} onPress={() => {
        void trackAdminEvent('mailbox_provider_selected', { provider: 'uber_eats', properties: { provider: 'uber_eats' } }).catch(() => undefined);
        props.onChooseProvider('uber');
      }} />
      <ChoiceRow icon="bag-handle-outline" title="DoorDash" subtitle="Full available history, including recent orders and more detail" accent={theme.colors.doorDash} onPress={() => {
        void trackAdminEvent('mailbox_provider_selected', { provider: 'doordash', properties: { provider: 'doordash' } }).catch(() => undefined);
        props.onChooseProvider('doordash');
      }} />
    </View>
    <AppText variant="surfaceBody" tone="muted" style={styles.note}>We’ll explain the provider-specific steps only after you choose.</AppText>
    <View style={styles.actions}><AppButton label="Try connecting email instead" variant="secondary" onPress={props.onChangeMethod} /></View>
  </View>;

  if (journey.kind === 'review_email_scan') {
    const blocked = journey.temporarilyUnavailable || (!journey.canImport && !journey.needsReconnect);
    const primaryAction = journey.needsReconnect ? () => props.onChooseEmail(journey.provider) : journey.provider === 'gmail' ? props.onImportGmail : props.onImportOutlook;
    return <View style={styles.journey}>
      <Progress step={2} />
      <JourneyHeading eyebrow={`${journey.providerName.toUpperCase()} CONNECTED`} title="Ready to find your orders?" body={journey.email ? `Connected as ${journey.email}. Review what SnackTrack will look for.` : 'Review what SnackTrack will look for.'} />
      <EmailImportReview automaticUpdatesDescription={props.automaticUpdatesDescription ?? (props.automaticImportsDisabled ? 'Automatic updates are off. You can turn them on anytime in Settings.' : 'Import your delivery receipts and automatically add new ones. You can turn this off anytime in Settings.')} />
      {journey.needsReconnect || journey.temporarilyUnavailable ? <View style={[styles.warning, { backgroundColor: theme.colors.warningSurface }]}><AppText variant="surfaceBody" style={{ color: theme.colors.warningDeep }}>{journey.needsReconnect ? 'Reconnect this inbox before starting the scan. Your existing history is safe.' : 'This email service is temporarily unavailable. Your connection is still saved.'}</AppText></View> : null}
      <View style={styles.actions}>
        <AppButton label={journey.needsReconnect ? `Reconnect ${journey.providerName}` : props.automaticUpdatesLabel ?? (props.automaticImportsDisabled ? 'Import my receipts' : 'Import & enable automatic updates')} pending={journey.needsReconnect ? props.connectionBusy : props.busy} disabled={blocked} onPress={primaryAction} />
        <AppButton label="Choose another method" variant="secondary" onPress={props.onChangeMethod} disabled={props.busy} />
      </View>
    </View>;
  }

  if (journey.kind === 'choose_email_provider') return <View style={styles.journey}>
    <Progress step={2} />
    <Mascot pose="prop-receipt" size={118} style={styles.mascot} accessibilityLabel="SnackTrack holding a receipt" />
    <JourneyHeading eyebrow="QUICK SETUP" title="Where do your receipts land?" body="Choose the inbox linked to your delivery accounts. You’ll review its address and automatic-update setting before importing." />
    <View style={styles.choiceStack}>
      <ChoiceRow icon="logo-google" title="Gmail" subtitle={props.flow.gmailConnected ? 'Connected · review the scan' : 'Continue with Google'} onPress={() => props.onChooseEmail('gmail')} />
      <ChoiceRow icon="mail-outline" title="Outlook" subtitle={props.flow.outlookConnected ? 'Connected · review the scan' : 'Continue with Microsoft'} onPress={() => props.onChooseEmail('outlook')} />
    </View>
    <View style={styles.actions}><AppButton label="Choose another method" variant="secondary" onPress={props.onChangeMethod} /></View>
  </View>;

  return <View style={styles.journey}>
    <Mascot pose="prop-receipt" size={118} style={styles.mascot} accessibilityLabel="SnackTrack holding a receipt" />
    <JourneyHeading eyebrow="QUICK SETUP" title="Let’s build your first SnackTrack" body="Start with the place most likely to have your delivery history." />
    <Progress step={1} />
    <Pressable accessibilityRole="button" accessibilityLabel="Find orders in my email. Recommended, usually takes 2 to 3 minutes." onPress={props.onChooseEmailPath} style={({ pressed }) => [styles.recommended, { backgroundColor: theme.colors.chipActiveBg, borderColor: theme.colors.primary }, pressed && styles.pressed]}>
      <View style={[styles.choiceIcon, { backgroundColor: theme.colors.surface }]}><Ionicons name="mail-open-outline" size={21} color={theme.colors.primary} /></View>
      <View style={styles.choiceCopy}><AppText variant="rowTitle">Find orders in my email</AppText><AppText variant="metadata" tone="brand" style={styles.rowMeta}>Recommended · usually takes 2–3 minutes</AppText></View>
      <Ionicons name="arrow-forward" size={19} color={theme.colors.primary} />
    </Pressable>
    <AppText variant="sectionLabel" tone="muted" style={styles.another}>Another option</AppText>
    <ChoiceRow icon="download-outline" title="Use a history download" subtitle="Best for phone, Apple, or another sign-in" onPress={props.onChooseAlternative} />
    <AppText variant="surfaceBody" tone="muted" style={styles.footerNote}>You’ll review what SnackTrack can access before anything is imported.</AppText>
  </View>;
}

function JourneyHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <View style={styles.heading}><AppText variant="eyebrow" tone="brand">{eyebrow}</AppText><AppText variant="pageTitle" style={styles.title}>{title}</AppText><AppText tone="muted" style={styles.body}>{body}</AppText></View>;
}
function Progress({ step }: { step: number }) {
  const theme = useAppTheme();
  return <View style={styles.progress} accessibilityLabel={`Step ${step} of 3`}>{[1, 2, 3].map(value => <View key={value} style={[styles.progressSegment, { backgroundColor: value <= step ? theme.colors.progressFill : theme.colors.progressTrack }]} />)}</View>;
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
  journey: { flex: 1 }, mascot: { alignSelf: 'center', marginBottom: 4 }, heading: { marginBottom: 18 }, title: { marginTop: 5 }, body: { marginTop: 9 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 3, marginBottom: 21 }, progressSegment: { flex: 1, height: 5, borderRadius: 999 },
  choiceStack: { gap: 10 }, choice: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }, recommended: { minHeight: 78, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }, pressed: { opacity: 0.76 },
  choiceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, choiceCopy: { flex: 1 }, rowMeta: { marginTop: 3 },
  another: { marginTop: 19, marginBottom: 8 }, note: { marginTop: 10, textAlign: 'center' }, footerNote: { marginTop: 20, textAlign: 'center', paddingHorizontal: 12 }, actions: { marginTop: 'auto', paddingTop: 18, gap: 10 },
  reviewList: { marginTop: 4 }, reviewRow: { paddingVertical: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, reviewIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, warning: { marginTop: 12, padding: 14, borderRadius: 18 },
});
export default ImportSetupJourney;
