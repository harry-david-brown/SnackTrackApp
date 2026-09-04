import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@constants/theme';
import type { ImportFlowState } from '@features/import-flow/importFlowResolver';
import {
  resolveInitialImportJourney,
  type ImportSetupPath,
} from '@features/import-flow/initialImportJourney';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { IconSurface } from '@components/ui/IconSurface';
import type { DataPlatform } from './UberDataTutorial';
import { trackAdminEvent } from '@services/adminAnalytics';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';

interface ImportSetupJourneyProps {
  flow: ImportFlowState;
  selectedPath: ImportSetupPath;
  busy: boolean;
  onChooseEmailPath: () => void;
  onChooseEmail: (provider: 'gmail' | 'outlook') => void;
  onChooseAlternative: () => void;
  onChangeMethod: () => void;
  onImportGmail: () => void;
  onImportOutlook: () => void;
  onChooseProvider: (provider: DataPlatform) => void;
}

export function ImportSetupJourney(props: ImportSetupJourneyProps) {
  const journey = resolveInitialImportJourney(props.flow, props.selectedPath);
  if (journey.kind === 'complete' || journey.kind === 'provider_resume') return null;

  if (journey.kind === 'choose_provider') {
    return (
      <View>
        <JourneyHeader
          eyebrow="GET THE FULL PICTURE"
          title="Where do most of your orders live?"
          body="Choose a delivery app and we’ll walk you through bringing your complete history into SnackTrack."
          step={2}
        />
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSurface icon="document-text-outline" />
            <View style={styles.headerCopy}>
              <Text style={styles.cardTitle}>Which app should we start with?</Text>
              <Text style={styles.cardBody}>You can add the other app later.</Text>
            </View>
          </View>
          <View style={styles.optionStack}>
            <ChoiceRow
              icon="car-outline"
              title="Uber Eats"
              subtitle="Fill in missing orders and unlock deeper stats"
              onPress={() => {
                void trackAdminEvent('mailbox_provider_selected', { provider: 'uber_eats', properties: { provider: 'uber_eats' } }).catch(() => undefined);
                props.onChooseProvider('uber');
              }}
              accent={Colors.uberDark}
            />
            <ChoiceRow
              icon="bag-handle-outline"
              title="DoorDash"
              subtitle="Fill in missing orders and unlock deeper stats"
              onPress={() => {
                void trackAdminEvent('mailbox_provider_selected', { provider: 'doordash', properties: { provider: 'doordash' } }).catch(() => undefined);
                props.onChooseProvider('doordash');
              }}
              accent={Colors.doorDash}
            />
          </View>
          <Text style={styles.helper}>We’ll explain the provider-specific steps only after you choose.</Text>
        </Card>
        <AppButton label="Try connecting email instead" variant="secondary" onPress={props.onChangeMethod} />
      </View>
    );
  }

  if (journey.kind === 'review_email_scan') {
    const importAction = journey.provider === 'gmail' ? props.onImportGmail : props.onImportOutlook;
    const blocked = journey.temporarilyUnavailable || (!journey.canImport && !journey.needsReconnect);
    const primaryAction = journey.needsReconnect
      ? () => props.onChooseEmail(journey.provider)
      : importAction;
    return (
      <View>
        <JourneyHeader
          eyebrow={`${journey.providerName} connected`}
          title="Ready to find your orders?"
          body={journey.email
            ? `Connected as ${journey.email}. Review this one-time scan, then start when you’re ready.`
            : `Review this one-time scan, then start when you’re ready.`}
          step={2}
        />
        <Card style={styles.card}>
          <Text style={styles.cardEyebrow}>ONE-TIME RECEIPT SCAN</Text>
          <View style={styles.reviewList}>
            <ReviewRow icon="search-outline" title="Find supported receipts" body="Looks only for Uber Eats and DoorDash purchase emails." />
            <ReviewRow icon="stats-chart-outline" title="Build your stats" body="Adds matching orders to your private SnackTrack history." />
            <ReviewRow icon="shield-checkmark-outline" title="Stay in control" body="Future email checks are a separate choice." />
          </View>
          <Text style={styles.consentNote}>The scan starts only when you tap the button below.</Text>
        </Card>
        {journey.needsReconnect ? (
          <Text style={styles.warning}>This connection needs to be authorized again before it can be scanned.</Text>
        ) : journey.temporarilyUnavailable ? (
          <Text style={styles.warning}>This email service is temporarily unavailable. Your connection is still saved.</Text>
        ) : null}
        <View style={styles.actionStack}>
          <AppButton
            label={journey.needsReconnect ? `Reconnect ${journey.providerName}` : 'Find my orders'}
            icon={journey.needsReconnect ? 'link-outline' : 'search-outline'}
            pending={props.busy}
            disabled={blocked}
            onPress={primaryAction}
          />
          <AppButton label="Choose another method" variant="secondary" onPress={props.onChangeMethod} disabled={props.busy} />
        </View>
      </View>
    );
  }

  if (journey.kind === 'choose_email_provider') return (
    <View>
      <JourneyHeader
        eyebrow="Quick setup"
        title="Where do your receipts land?"
        body="Choose the inbox linked to your delivery accounts. Nothing is scanned until you approve it."
        step={2}
      />
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <IconSurface icon="mail-outline" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Which email service is linked?</Text>
            <Text style={styles.cardBody}>Select the service for the email registered with your delivery apps.</Text>
          </View>
        </View>
        <View style={styles.optionStack}>
          <ChoiceRow
            icon="logo-google"
            title="Gmail"
            subtitle={props.flow.gmailConnected ? 'Connected — review the scan' : 'Continue with Google'}
            onPress={() => {
              void trackAdminEvent('mailbox_provider_selected', { provider: 'gmail', properties: { provider: 'gmail' } }).catch(() => undefined);
              props.onChooseEmail('gmail');
            }}
          />
          <ChoiceRow
            icon="mail-outline"
            title="Outlook"
            subtitle={props.flow.outlookConnected ? 'Connected — review the scan' : 'Continue with Microsoft'}
            onPress={() => {
              void trackAdminEvent('mailbox_provider_selected', { provider: 'microsoft', properties: { provider: 'microsoft' } }).catch(() => undefined);
              props.onChooseEmail('outlook');
            }}
          />
        </View>
        <Text style={styles.helper}>Connecting an email account does not start a scan. You’ll review it before anything is imported.</Text>
      </Card>
      <AppButton label="Choose another method" variant="secondary" onPress={props.onChangeMethod} />
    </View>
  );

  return (
    <View>
      <JourneyHeader eyebrow="QUICK SETUP" title="Let’s build your first SnackTrack" body="Start with the place most likely to have your delivery history." step={1} />
      <Pressable accessibilityRole="button" accessibilityLabel="Find orders in my email. Recommended, usually takes 2 to 3 minutes." onPress={props.onChooseEmailPath} style={({ pressed }) => [styles.recommendedChoice, pressed && styles.choicePressed]}>
        <View style={styles.recommendedTopline}>
          <View style={styles.choiceIcon}><Ionicons name="mail-open-outline" size={22} color={Colors.primary} /></View>
          <Text style={styles.recommendedBadge}>RECOMMENDED</Text>
        </View>
        <Text style={styles.recommendedTitle}>Find orders in my email</Text>
        <Text style={styles.recommendedSubtitle}>Usually takes 2–3 minutes</Text>
        <View style={styles.recommendedArrow}><Ionicons name="arrow-forward" size={20} color={Colors.white} /></View>
      </Pressable>
      <Text style={styles.anotherLabel}>ANOTHER OPTION</Text>
      <ChoiceRow icon="download-outline" title="Use a history download" subtitle="Best for phone, Apple, or another sign-in" onPress={props.onChooseAlternative} accent={Colors.textSecondary} />
      <Text style={styles.footerNote}>You’ll review what SnackTrack can access before anything is imported.</Text>
    </View>
  );
}

function JourneyHeader({ eyebrow, title, body, step }: { eyebrow: string; title: string; body: string; step: 1 | 2 }) {
  return (
    <View style={styles.journeyHeader}>
      <View style={styles.mascot}><MascotPlaceholder pose="prop-receipt" size={82} /></View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
      <View style={styles.progress} accessibilityLabel={`Step ${step} of 3`}>
        {[1, 2, 3].map((value) => <View key={value} style={[styles.progressSegment, value <= step && styles.progressSegmentActive]} />)}
      </View>
    </View>
  );
}

function ChoiceRow({ icon, title, subtitle, onPress, accent = Colors.primary }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: Colors.alpha(accent, 0.12) }]}>
        <Ionicons name={icon} size={21} color={accent} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
    </Pressable>
  );
}

function ReviewRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewIcon}><Ionicons name={icon} size={18} color={Colors.primary} /></View>
      <View style={styles.reviewCopy}>
        <Text style={styles.reviewTitle}>{title}</Text>
        <Text style={styles.reviewBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  journeyHeader: { marginBottom: Spacing.lg },
  mascot: { alignItems: 'center', marginBottom: 10 },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  title: { color: Colors.textPrimary, fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, lineHeight: 24 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18 },
  progressSegment: { flex: 1, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.gray250 },
  progressSegmentActive: { backgroundColor: Colors.secondary },
  card: { padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerCopy: { flex: 1 },
  cardTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  cardEyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.1 },
  cardBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  optionStack: { gap: 10 },
  choice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.button, backgroundColor: Colors.surface },
  choicePressed: { borderColor: Colors.primary, backgroundColor: Colors.infoBg },
  choiceIcon: { width: 42, height: 42, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1 },
  choiceTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  choiceSubtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  helper: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 14 },
  reviewList: { gap: 14, marginTop: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.chipActiveBg, alignItems: 'center', justifyContent: 'center' },
  reviewCopy: { flex: 1 },
  reviewTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  reviewBody: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  consentNote: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 16, paddingTop: 14 },
  warning: { color: Colors.warningDeep, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  actionStack: { gap: 10 },
  recommendedChoice: { minHeight: 190, borderRadius: 26, backgroundColor: '#E8F4E7', borderWidth: 1, borderColor: Colors.alpha(Colors.primary, 0.24), padding: 20, marginBottom: 22, overflow: 'hidden' },
  recommendedTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recommendedBadge: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  recommendedTitle: { color: Colors.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: '700', marginTop: 22, maxWidth: '80%' },
  recommendedSubtitle: { color: Colors.primary, fontSize: 14, fontWeight: '600', marginTop: 7 },
  recommendedArrow: { position: 'absolute', right: 18, bottom: 18, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  anotherLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 9, marginLeft: 2 },
  footerNote: { color: Colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 20, paddingHorizontal: 18 },
});

export default ImportSetupJourney;
