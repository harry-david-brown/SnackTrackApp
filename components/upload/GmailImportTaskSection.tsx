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
  connected: boolean;
  canImport: boolean;
  needsReconnect: boolean;
  temporarilyUnavailable: boolean;
  busy: boolean;
  buttonLabel: string;
  title: string;
  description: string;
  disconnectedHelper: string;
  passive: boolean;
  onToggle: (id: ImportTaskId) => void;
  onImport: () => void;
}

export function GmailImportTaskSection(props: GmailImportTaskSectionProps) {
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
      <AppButton
        label={props.buttonLabel}
        icon="logo-google"
        pending={props.busy}
        disabled={!props.connected || !props.canImport}
        onPress={props.onImport}
      />
      {!props.connected ? (
        <Text style={styles.helper}>{props.disconnectedHelper}</Text>
      ) : props.needsReconnect ? (
        <Text style={styles.helper}>Gmail needs attention before importing. Manage your Gmail connection from the email task.</Text>
      ) : props.temporarilyUnavailable ? (
        <Text style={styles.helper}>Gmail could not be verified right now. Try again in a moment; reconnecting is not required.</Text>
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
