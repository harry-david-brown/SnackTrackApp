import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/theme';
import type { ImportTaskState } from '../../features/import-flow/importFlowResolver';
import { AppButton } from '../ui/AppButton';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';

interface ConnectEmailTaskSectionProps {
  state: ImportTaskState;
  isOpen: boolean;
  connected: boolean;
  needsReconnect: boolean;
  busy: boolean;
  onToggle: (id: ImportTaskId) => void;
  onConnect: () => void;
  onManage: () => void;
}

export function ConnectEmailTaskSection(props: ConnectEmailTaskSectionProps) {
  return (
    <ImportTaskCard
      id="connect_email"
      title="Connect email"
      description="Connect Gmail so SnackTrack can find delivery receipts."
      iconName="mail-outline"
      statusLabel={props.state.label}
      statusTone={props.state.tone}
      isComplete={props.state.complete}
      isOpen={props.isOpen}
      onPress={props.onToggle}
    >
      {(!props.connected || props.needsReconnect) ? (
        <AppButton
          label={props.needsReconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
          icon="logo-google"
          pending={props.busy}
          onPress={props.onConnect}
        />
      ) : null}
      <Text style={styles.helper}>
        {props.needsReconnect
          ? 'Google no longer accepts the saved authorization. Reconnect Gmail to continue.'
          : props.connected
            ? 'Gmail is connected. You can manage the connection below if needed.'
            : 'We only use your receipt data to generate your personal spending insights.'}
      </Text>
      {props.connected && !props.needsReconnect ? (
        <AppButton label="Manage Gmail connection" variant="secondary" disabled={props.busy} onPress={props.onManage} />
      ) : null}
    </ImportTaskCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 13, lineHeight: 19, marginVertical: 12, color: Colors.textSecondary },
});
