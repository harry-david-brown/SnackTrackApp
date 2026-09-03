import { StyleSheet, Text } from 'react-native';
import { Colors } from '@constants/theme';
import type { ImportTaskState } from '@features/import-flow/importFlowResolver';
import { AppButton } from '@components/ui/AppButton';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';

interface ConnectEmailTaskSectionProps {
  state: ImportTaskState;
  isOpen: boolean;
  gmailConnected: boolean;
  outlookConnected: boolean;
  gmailNeedsReconnect: boolean;
  outlookNeedsReconnect: boolean;
  busy: boolean;
  onToggle: (id: ImportTaskId) => void;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onManageGmail: () => void;
  onManageOutlook: () => void;
}

export function ConnectEmailTaskSection(props: ConnectEmailTaskSectionProps) {
  return (
    <ImportTaskCard
      id="connect_email"
      title="Connect email"
      description="Authorize Gmail, Outlook, or both. Nothing is imported until you start the next step."
      iconName="mail-outline"
      statusLabel={props.state.label}
      statusTone={props.state.tone}
      isComplete={props.state.complete}
      isOpen={props.isOpen}
      onPress={props.onToggle}
    >
      {(!props.gmailConnected || props.gmailNeedsReconnect) ? (
        <AppButton
          label={props.gmailNeedsReconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
          icon="logo-google"
          pending={props.busy}
          onPress={props.onConnectGmail}
        />
      ) : null}
      {(!props.outlookConnected || props.outlookNeedsReconnect) ? (
        <AppButton
          label={props.outlookNeedsReconnect ? 'Reconnect Outlook' : 'Connect Outlook'}
          icon="mail-outline"
          pending={props.busy}
          onPress={props.onConnectOutlook}
        />
      ) : null}
      <Text style={styles.helper}>
        {props.gmailNeedsReconnect || props.outlookNeedsReconnect
          ? 'One of your saved email authorizations needs attention before it can be used.'
          : props.gmailConnected || props.outlookConnected
            ? 'Your connected accounts can be managed separately below.'
            : 'Connecting an account does not start a receipt scan. You choose when to import in the next step.'}
      </Text>
      {props.gmailConnected && !props.gmailNeedsReconnect ? (
        <AppButton label="Manage Gmail connection" variant="secondary" disabled={props.busy} onPress={props.onManageGmail} />
      ) : null}
      {props.outlookConnected && !props.outlookNeedsReconnect ? (
        <AppButton label="Disconnect Outlook" variant="secondary" disabled={props.busy} onPress={props.onManageOutlook} />
      ) : null}
    </ImportTaskCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 13, lineHeight: 19, marginVertical: 12, color: Colors.textSecondary },
});
