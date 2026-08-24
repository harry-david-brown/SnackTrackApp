import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@constants/theme';
import type { GmailConnectionStatus } from '@services/gmailApi';
import { GmailConnection } from '@components/gmail/GmailConnection';
import { GmailImportLoadingModal, type GmailConnectPhase } from '@components/gmail/GmailImportLoadingModal';
import { AppButton } from '@components/ui/AppButton';
import UberDataTutorial, { type DataPlatform } from './UberDataTutorial';
import type { GmailPrimaryFlowState } from '@hooks/useGmailImport';

interface ImportWorkflowModalsProps {
  tutorialVisible: boolean;
  tutorialMode: 'request' | 'download';
  tutorialInitialPlatform?: DataPlatform;
  gmailFeatureEnabled: boolean;
  gmailVisible: boolean;
  loadingVisible: boolean;
  primaryFlowState: GmailPrimaryFlowState;
  gmailConnectPhase: GmailConnectPhase;
  gmailConnectionStatus: GmailConnectionStatus;
  isGmailLoading: boolean;
  isGmailChecking: boolean;
  onCloseTutorial: () => void;
  onTutorialComplete: (platform: DataPlatform) => void;
  onTutorialStillWaiting: (platform: DataPlatform) => void;
  onTutorialArchiveDownloaded: (platform: DataPlatform) => void;
  onCloseGmail: () => void;
  onGmailDisconnect: () => void;
}

export function ImportWorkflowModals(props: ImportWorkflowModalsProps) {
  return (
    <>
      <Modal visible={props.tutorialVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onCloseTutorial}>
        <UberDataTutorial
          mode={props.tutorialMode}
          initialPlatform={props.tutorialInitialPlatform}
          onRequestConfirmed={props.onTutorialComplete}
          onStillWaiting={props.onTutorialStillWaiting}
          onArchiveDownloaded={props.onTutorialArchiveDownloaded}
          onClose={props.onCloseTutorial}
        />
      </Modal>
      {props.gmailFeatureEnabled && props.gmailVisible ? (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCloseGmail}>
          <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
              <Text style={styles.title}>Import from Gmail</Text>
              <AppButton label="Close Gmail settings" variant="icon" icon="close" onPress={props.onCloseGmail} />
            </View>
            <ScrollView style={styles.content}>
              <GmailConnection
                connectionStatus={props.gmailConnectionStatus}
                isLoading={props.isGmailLoading}
                isChecking={props.isGmailChecking}
                onDisconnect={props.onGmailDisconnect}
                onClose={props.onCloseGmail}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}
      <GmailImportLoadingModal
        visible={props.loadingVisible}
        flowState={props.primaryFlowState}
        connectPhase={props.gmailConnectPhase}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  content: { flex: 1, padding: 20 },
});
