import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import type { ImportTaskState } from '@features/import-flow/importFlowResolver';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { IconSurface } from '@components/ui/IconSurface';
import { StatusBadge } from '@components/ui/StatusBadge';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';

interface GmailImportTaskSectionProps {
  state: ImportTaskState;
  isOpen: boolean;
  gmailConnected?: boolean;
  outlookConnected?: boolean;
  canImportGmail?: boolean;
  canImportOutlook?: boolean;
  gmailNeedsReconnect?: boolean;
  outlookNeedsReconnect?: boolean;
  /** Compatibility aliases for callers during the provider-aware rollout. */
  connected?: boolean;
  canImport?: boolean;
  needsReconnect?: boolean;
  temporarilyUnavailable: boolean;
  busy: boolean;
  gmailButtonLabel?: string;
  outlookButtonLabel?: string;
  buttonLabel?: string;
  title: string;
  description: string;
  disconnectedHelper: string;
  passive: boolean;
  onToggle: (id: ImportTaskId) => void;
  onImportGmail?: () => void;
  onImportOutlook?: () => void;
  onImport?: () => void;
}

export function GmailImportTaskSection(props: GmailImportTaskSectionProps) {
  const gmailConnected = props.gmailConnected ?? props.connected ?? false;
  const outlookConnected = props.outlookConnected ?? false;
  const canImportGmail = props.canImportGmail ?? props.canImport ?? false;
  const gmailNeedsReconnect = props.gmailNeedsReconnect ?? props.needsReconnect ?? false;
  if (props.passive) {
    return (
      <Card
        accessibilityLabel={`${props.title}. ${props.state.label}. ${props.description}`}
        style={styles.completedCard}
      >
        <IconSurface icon="checkmark-circle" color={Colors.secondary} />
        <View style={styles.completedCopy}>
          <View style={styles.completedTitleRow}>
            <Text style={styles.completedTitle}>{props.title}</Text>
            <StatusBadge label={props.state.label} tone={props.state.tone} />
          </View>
          <Text style={styles.completedDescription}>{props.description}</Text>
        </View>
      </Card>
    );
  }

  return (
    <ImportTaskCard
      id="gmail_import"
      title={props.title}
      description={props.description}
      iconName="download-outline"
      statusLabel={props.state.label}
      statusTone={props.state.tone}
      isComplete={props.state.complete}
      isOpen={props.isOpen}
      onPress={props.onToggle}
    >
      {gmailConnected ? (
        <AppButton
          label={props.gmailButtonLabel ?? props.buttonLabel ?? 'Import from Gmail'}
          icon="logo-google"
          pending={props.busy}
          disabled={!canImportGmail || gmailNeedsReconnect}
          onPress={props.onImportGmail ?? props.onImport ?? (() => undefined)}
        />
      ) : null}
      {outlookConnected ? (
        <AppButton
          label={props.outlookButtonLabel ?? 'Import from Outlook'}
          icon="mail-outline"
          pending={props.busy}
          disabled={!props.canImportOutlook || props.outlookNeedsReconnect}
          onPress={props.onImportOutlook ?? (() => undefined)}
        />
      ) : null}
      {!gmailConnected && !outlookConnected ? (
        <Text style={styles.helper}>{props.disconnectedHelper}</Text>
      ) : gmailNeedsReconnect || props.outlookNeedsReconnect ? (
        <Text style={styles.helper}>A connected email account needs attention. Reconnect it from the email task above.</Text>
      ) : props.temporarilyUnavailable ? (
        <Text style={styles.helper}>An email provider could not be verified right now. Try again in a moment; reconnecting is not required.</Text>
      ) : null}
    </ImportTaskCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 12 },
  completedCard: { padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  completedCopy: { flex: 1, paddingTop: 1 },
  completedTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  completedTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  completedDescription: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
