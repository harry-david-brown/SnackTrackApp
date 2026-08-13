import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/theme';
import type { ImportTaskState } from '../../features/import-flow/importFlowResolver';
import { AppButton } from '../ui/AppButton';
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
  onToggle: (id: ImportTaskId) => void;
  onImport: () => void;
}

export function GmailImportTaskSection(props: GmailImportTaskSectionProps) {
  return (
    <ImportTaskCard
      id="gmail_import"
      title="Import delivery data"
      description="Pull delivery receipts from your connected Gmail account."
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
        <Text style={styles.helper}>Connect Gmail first, then come back here to import your receipt history.</Text>
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
});
