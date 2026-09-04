import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GmailConnectionStatus, ImportOperation } from '@features/import-flow/contracts';
import { GmailConnection } from '@components/gmail/GmailConnection';
import { GmailImportLoadingModal, type GmailConnectPhase } from '@components/gmail/GmailImportLoadingModal';
import { AppButton } from '@components/ui/AppButton';
import UberDataTutorial, { type DataPlatform } from './UberDataTutorial';
import type { GmailPrimaryFlowState } from '@hooks/useGmailImport';
import type { ProviderTutorialJob } from '@features/import-flow/providerTutorialEntry';
import { useAppTheme } from '@contexts/AppearanceContext';

interface ImportWorkflowModalsProps {
  tutorialVisible: boolean;
  tutorialMode: 'request' | 'download';
  tutorialInitialPlatform?: DataPlatform;
  tutorialProviderStatuses?: Partial<Record<DataPlatform, string>>;
  tutorialEntryJob?: ProviderTutorialJob;
  gmailFeatureEnabled: boolean;
  gmailVisible: boolean;
  loadingVisible: boolean;
  operation: ImportOperation | null;
  onExploreDelayed: () => void;
  primaryFlowState: GmailPrimaryFlowState;
  gmailConnectPhase: GmailConnectPhase;
  gmailConnectionStatus: GmailConnectionStatus;
  isGmailLoading: boolean;
  isGmailChecking: boolean;
  canCheckForNewOrders: boolean;
  onCheckForNewOrders: () => void;
  onCloseTutorial: () => void;
  onTutorialComplete: (platform: DataPlatform) => void;
  onTutorialStillWaiting: (platform: DataPlatform) => void;
  onTutorialArchiveDownloaded: (platform: DataPlatform) => void;
  onTutorialReadyConfirmed: (platform: DataPlatform) => void;
  onCloseGmail: () => void;
  onGmailDisconnect: () => void;
}

export function ImportWorkflowModals(props: ImportWorkflowModalsProps) {
  const theme = useAppTheme();
  return (
    <>
      <Modal visible={props.tutorialVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onCloseTutorial}>
        <UberDataTutorial
          mode={props.tutorialMode}
          initialPlatform={props.tutorialInitialPlatform}
          providerStatuses={props.tutorialProviderStatuses}
          entryJob={props.tutorialEntryJob}
          onRequestConfirmed={props.onTutorialComplete}
          onStillWaiting={props.onTutorialStillWaiting}
          onArchiveDownloaded={props.onTutorialArchiveDownloaded}
          onReadyConfirmed={props.onTutorialReadyConfirmed}
          onClose={props.onCloseTutorial}
        />
      </Modal>
      {props.gmailFeatureEnabled && props.gmailVisible ? (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCloseGmail}>
          <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Gmail settings</Text>
              <AppButton label="Close Gmail settings" variant="icon" icon="close" onPress={props.onCloseGmail} />
            </View>
            <ScrollView style={styles.content}>
              <GmailConnection
                connectionStatus={props.gmailConnectionStatus}
                isLoading={props.isGmailLoading}
                isChecking={props.isGmailChecking}
                canCheckForNewOrders={props.canCheckForNewOrders}
                onCheckForNewOrders={props.onCheckForNewOrders}
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
        operation={props.operation}
        onExplore={props.onExploreDelayed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
});
