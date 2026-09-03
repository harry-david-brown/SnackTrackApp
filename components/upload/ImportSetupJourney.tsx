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
  onChooseEmail: (provider: 'gmail' | 'outlook') => void;
  onChooseAlternative: () => void;
  onChangeMethod: () => void;
  onImportGmail: () => void;
  onImportOutlook: () => void;
  onChooseProvider: (provider: DataPlatform) => void;
  onDefer: () => void;
  canMarkUberNotUsed: boolean;
  onMarkUberNotUsed: () => void;
}

export function ImportSetupJourney(props: ImportSetupJourneyProps) {
  const journey = resolveInitialImportJourney(props.flow, props.selectedPath);
  if (journey.kind === 'complete' || journey.kind === 'provider_resume') return null;

  if (journey.kind === 'choose_provider') {
    return (
      <View>
        <JourneyHeader
          eyebrow="Another way"
          title="Add history without connecting email"
          body="Choose a delivery app. We’ll walk you through requesting and adding its official order history."
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
              subtitle="Request your history from Uber"
              onPress={() => {
                void trackAdminEvent('mailbox_provider_selected', { provider: 'uber_eats', properties: { provider: 'uber_eats' } }).catch(() => undefined);
                props.onChooseProvider('uber');
              }}
              accent={Colors.uberDark}
            />
            <ChoiceRow
              icon="bag-handle-outline"
              title="DoorDash"
              subtitle="Request your history from DoorDash"
              onPress={() => {
                void trackAdminEvent('mailbox_provider_selected', { provider: 'doordash', properties: { provider: 'doordash' } }).catch(() => undefined);
                props.onChooseProvider('doordash');
              }}
              accent={Colors.doorDash}
            />
          </View>
          <Text style={styles.helper}>
            The delivery app prepares a ZIP file. SnackTrack will show you how to request it, find it when it’s ready, and add it here.
          </Text>
        </Card>
        {props.canMarkUberNotUsed ? (
          <AppButton label="I don’t use Uber Eats" variant="secondary" onPress={props.onMarkUberNotUsed} disabled={props.busy} />
        ) : null}
        <AppButton label="Try connecting email instead" variant="secondary" onPress={props.onChangeMethod} />
        <AppButton label="Do this later" variant="secondary" onPress={props.onDefer} disabled={props.busy} />
        <Text style={styles.deferNote}>You can explore SnackTrack now. We’ll show setup again in 7 days.</Text>
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
          title="Review your email scan"
          body={journey.email
            ? `Connected as ${journey.email}. Nothing has been imported yet.`
            : `Your ${journey.providerName} account is connected. Nothing has been imported yet.`}
          step={2}
        />
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>What SnackTrack will do</Text>
          <View style={styles.reviewList}>
            <ReviewRow icon="search-outline" title="Find supported order receipts" body="Look for Uber Eats and DoorDash purchase emails." />
            <ReviewRow icon="stats-chart-outline" title="Build your delivery history" body="Add matching orders to your SnackTrack stats." />
            <ReviewRow icon="shield-checkmark-outline" title="Keep future access separate" body="This is a one-time scan. Ongoing updates are a later, optional choice." />
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
            label={journey.needsReconnect ? `Reconnect ${journey.providerName}` : `Scan ${journey.providerName}`}
            icon={journey.needsReconnect ? 'link-outline' : 'search-outline'}
            pending={props.busy}
            disabled={blocked}
            onPress={primaryAction}
          />
          <AppButton label="Use a different method" variant="secondary" onPress={props.onChangeMethod} disabled={props.busy} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <JourneyHeader
        eyebrow="Quick setup"
        title="Start with your email receipts"
        body="Choose the email service linked to your Uber Eats or DoorDash account. You can add another one later."
        step={1}
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
          <ChoiceRow
            icon="ellipsis-horizontal"
            title="None of the above"
            subtitle="Phone number, Apple sign-in, or another email service"
            onPress={props.onChooseAlternative}
          />
        </View>
        <Text style={styles.helper}>Connecting an email account does not start a scan. You’ll review it before anything is imported.</Text>
      </Card>
      <AppButton label="Do this later" variant="secondary" onPress={props.onDefer} disabled={props.busy} />
      <Text style={styles.deferNote}>You can explore SnackTrack now. We’ll show setup again in 7 days.</Text>
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
  eyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800', lineHeight: 34, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, lineHeight: 24 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 18 },
  progressSegment: { flex: 1, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.gray250 },
  progressSegmentActive: { backgroundColor: Colors.secondary },
  card: { padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerCopy: { flex: 1 },
  cardTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  cardBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  optionStack: { gap: 10 },
  choice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.button, backgroundColor: Colors.surface },
  choicePressed: { borderColor: Colors.primary, backgroundColor: Colors.infoBg },
  choiceIcon: { width: 42, height: 42, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1 },
  choiceTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  choiceSubtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  helper: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 14 },
  reviewList: { gap: 14, marginTop: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.chipActiveBg, alignItems: 'center', justifyContent: 'center' },
  reviewCopy: { flex: 1 },
  reviewTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  reviewBody: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  consentNote: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 16, paddingTop: 14 },
  warning: { color: Colors.warningDeep, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  actionStack: { gap: 10 },
  deferNote: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
});

export default ImportSetupJourney;
