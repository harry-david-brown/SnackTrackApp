import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@constants/theme';
import { parseImportRouteParams } from '@features/import-flow/importRouteParams';
import { useImportFlowController } from '@hooks/useImportFlowController';
import { ConnectEmailTaskSection } from '@components/upload/ConnectEmailTaskSection';
import { GmailImportTaskSection } from '@components/upload/GmailImportTaskSection';
import { ExportImportTaskSection } from '@components/upload/ExportImportTaskSection';
import { ImportWorkflowModals } from '@components/upload/ImportWorkflowModals';

export default function UploadScreen() {
  const rawParams = useLocalSearchParams();
  const route = parseImportRouteParams(rawParams);
  const controller = useImportFlowController(route);

  if (!controller.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Import your data</Text>
          <Text style={styles.subtitle}>Please log in to connect Gmail or upload an export.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={controller.scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        bounces
      >
        <View style={styles.content}>
          {controller.offline.pendingCount > 0 ? (
            <View style={styles.pendingBanner} accessibilityRole="alert">
              <Ionicons name="cloud-upload" size={20} color={Colors.warningBright} />
              <Text style={styles.pendingText}>
                {controller.offline.isSyncing
                  ? `Syncing ${controller.offline.pendingCount} pending upload${controller.offline.pendingCount > 1 ? 's' : ''}…`
                  : `${controller.offline.pendingCount} upload${controller.offline.pendingCount > 1 ? 's' : ''} queued for retry`}
              </Text>
            </View>
          ) : null}

          <View style={styles.header}>
            <Text style={styles.title}>Build your SnackTrack history</Text>
            <Text style={styles.subtitle}>Start with email, then optionally add Uber Eats or DoorDash exports for more complete insights.</Text>
          </View>

          <View style={styles.taskList}>
            {controller.gmailFeatureEnabled ? (
              <>
                <ConnectEmailTaskSection
                  state={controller.flow.connectEmail}
                  isOpen={controller.activeTaskId === 'connect_email'}
                  connected={controller.flow.hasConnectedEmail}
                  needsReconnect={controller.flow.needsReconnect}
                  busy={controller.busy}
                  onToggle={controller.toggleTask}
                  onConnect={controller.connectEmail}
                  onManage={controller.openGmailSettings}
                />
                <GmailImportTaskSection
                  state={controller.flow.gmailImport}
                  isOpen={controller.activeTaskId === 'gmail_import'}
                  connected={controller.flow.hasConnectedEmail}
                  canImport={controller.flow.canImportFromGmail}
                  needsReconnect={controller.flow.needsReconnect}
                  temporarilyUnavailable={controller.flow.gmailTemporarilyUnavailable}
                  busy={controller.busy}
                  buttonLabel={controller.gmailButtonLabel}
                  onToggle={controller.toggleTask}
                  onImport={controller.importEmail}
                />
              </>
            ) : null}
            <ExportImportTaskSection
              state={controller.flow.exportImport}
              providerProgress={controller.flow.exportProviderProgress}
              isOpen={controller.activeTaskId === 'uber_export'}
              fileReady={controller.flow.exportFileReady}
              exportRequested={controller.flow.exportRequested}
              downloadState={controller.exportDownloadState}
              autoOpenToken={controller.autoOpenExportPickerToken}
              onToggle={controller.toggleTask}
              onLayout={controller.recordExportLayout}
              onOpenEmail={controller.openExportEmail}
              onDownloaded={controller.reportDownloaded}
              onShowTutorial={controller.openTutorial}
              onImportProvider={controller.openProviderTutorial}
              onAutoOpenConsumed={controller.autoOpenConsumed}
              onUploadSuccess={controller.uploadSucceeded}
              onUploadError={controller.uploadFailed}
            />
          </View>
        </View>
      </ScrollView>

      <ImportWorkflowModals
        tutorialVisible={controller.showTutorial}
        tutorialMode={controller.flow.exportFileReady ? 'download' : 'request'}
        tutorialInitialPlatform={controller.tutorialPlatform}
        gmailFeatureEnabled={controller.gmailFeatureEnabled}
        gmailVisible={controller.showGmailModal}
        loadingVisible={controller.showGmailImportLoadingModal}
        primaryFlowState={controller.primaryFlowState}
        gmailConnectPhase={controller.gmailConnectPhase}
        gmailConnectionStatus={controller.gmailConnectionStatus}
        isGmailLoading={controller.isGmailLoading}
        isGmailChecking={controller.isGmailChecking}
        onCloseTutorial={controller.closeTutorial}
        onTutorialComplete={controller.completeTutorial}
        onTutorialStillWaiting={controller.tutorialStillWaiting}
        onTutorialArchiveDownloaded={controller.tutorialArchiveDownloaded}
        onCloseGmail={controller.closeGmailSettings}
        onGmailDisconnect={controller.disconnectGmail}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  taskList: { gap: 14 },
  pendingBanner: { backgroundColor: Colors.warningSurface, borderLeftWidth: 4, borderLeftColor: Colors.warningBright, padding: 12, marginBottom: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  pendingText: { fontSize: 14, color: Colors.warningDark, marginLeft: 8, flex: 1, fontWeight: '500' },
});
