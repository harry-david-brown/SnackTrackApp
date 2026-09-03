import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@constants/theme';
import { parseImportRouteParams } from '@features/import-flow/importRouteParams';
import { useImportFlowController } from '@hooks/useImportFlowController';
import { ConnectEmailTaskSection } from '@components/upload/ConnectEmailTaskSection';
import { GmailImportTaskSection } from '@components/upload/GmailImportTaskSection';
import { ExportImportTaskSection } from '@components/upload/ExportImportTaskSection';
import { ImportWorkflowModals } from '@components/upload/ImportWorkflowModals';
import { OngoingUpdatesSection } from '@components/upload/OngoingUpdatesSection';
import { ImportSetupJourney } from '@components/upload/ImportSetupJourney';
import { resolveInitialImportJourney } from '@features/import-flow/initialImportJourney';
import { ImportCompletionPanel } from '@components/upload/ImportCompletionPanel';
import { SectionHeader } from '@components/ui/SectionHeader';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { resolveHomeDataGuidance } from '@components/dashboard/dashboardTrackingState';
import { useImportOperation } from '@hooks/useImportOperation';
import { ImportOperationCard } from '@components/import/ImportOperationCard';

export default function UploadScreen() {
  const rawParams = useLocalSearchParams();
  const route = parseImportRouteParams(rawParams);
  const controller = useImportFlowController(route);
  const operationId = typeof rawParams.operationId === 'string' ? rawParams.operationId : undefined;
  const { operation } = useImportOperation(Boolean(controller.user), false, operationId);
  const initialJourney = resolveInitialImportJourney(controller.flow, controller.selectedSetupPath);
  const hubGuidance = resolveHomeDataGuidance(controller.importPreferences, false);
  const managingNotUsed = controller.importPreferences?.export.providers.uberEats.relevance === 'not_used';
  const showGuidedSetup = !managingNotUsed && (initialJourney.kind === 'choose_method'
    || initialJourney.kind === 'choose_provider'
    || initialJourney.kind === 'review_email_scan');

  if (!controller.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ImportOperationCard operation={operation} />
          <Text style={styles.title}>Add & manage data</Text>
          <Text style={styles.subtitle}>Please log in to connect email or add your delivery-app history.</Text>
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
          {controller.completionSummary ? (
            <ImportCompletionPanel
              summary={controller.completionSummary}
              onHome={controller.goHome}
              onNext={controller.continueAfterCompletion}
              onMarkUberNotUsed={controller.confirmUberNotUsed}
              onTryAnotherEmail={controller.tryAnotherEmail}
              onDefer={controller.deferInitialSetup}
            />
          ) : showGuidedSetup ? (
            <ImportSetupJourney
              flow={controller.flow}
              selectedPath={controller.selectedSetupPath}
              busy={controller.busy}
              onChooseEmail={controller.chooseSetupEmail}
              onChooseAlternative={controller.chooseAlternativeSetup}
              onChangeMethod={controller.changeSetupMethod}
              onImportGmail={controller.importEmail}
              onImportOutlook={controller.importOutlook}
              onChooseProvider={controller.openProviderTutorial}
              onDefer={controller.deferInitialSetup}
              canMarkUberNotUsed={controller.uberNotUsedEligible}
              onMarkUberNotUsed={controller.confirmUberNotUsed}
            />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>ADD & MANAGE DATA</Text>
                <Text style={styles.title}>Add & manage data</Text>
                <Text style={styles.subtitle}>See what is connected, what has been added, and the single best next step for your order history.</Text>
              </View>

              <View style={styles.taskList}>
            <SectionHeader title="Recommended next step" />
            <Card style={styles.recommendationCard} accessibilityLabel={`${hubGuidance.title}. ${hubGuidance.body}`}>
              <Text style={styles.relevanceTitle}>{hubGuidance.title}</Text>
              <Text style={styles.relevanceBody}>{hubGuidance.body}</Text>
              <Text style={styles.recommendationHint}>Use the matching source below to continue.</Text>
            </Card>
            <SectionHeader title="Order-history sources" subtitle="Add each source separately. Connections, scans, and downloaded files have their own status." />
            {(initialJourney.kind === 'complete' || managingNotUsed) && controller.gmailFeatureEnabled ? (
              <>
                <ConnectEmailTaskSection
                  state={controller.flow.connectEmail}
                  isOpen={controller.activeTaskId === 'connect_email'}
                  gmailConnected={controller.flow.gmailConnected}
                  outlookConnected={controller.flow.outlookConnected}
                  gmailNeedsReconnect={controller.flow.gmailNeedsReconnect}
                  outlookNeedsReconnect={controller.flow.outlookNeedsReconnect}
                  busy={controller.busy}
                  onToggle={controller.toggleTask}
                  onConnectGmail={controller.connectEmail}
                  onConnectOutlook={controller.connectOutlook}
                  onManageGmail={controller.openGmailSettings}
                  onManageOutlook={controller.disconnectOutlook}
                />
                {controller.flow.showGmailImportSection ? (
                  <GmailImportTaskSection
                    state={controller.flow.gmailImport}
                    isOpen={controller.activeTaskId === 'gmail_import'}
                    gmailConnected={controller.flow.gmailConnected}
                    outlookConnected={controller.flow.outlookConnected}
                    canImportGmail={controller.flow.canImportFromGmail}
                    canImportOutlook={controller.flow.canImportFromOutlook}
                    gmailNeedsReconnect={controller.flow.gmailNeedsReconnect}
                    outlookNeedsReconnect={controller.flow.outlookNeedsReconnect}
                    temporarilyUnavailable={controller.flow.gmailTemporarilyUnavailable || controller.flow.outlookTemporarilyUnavailable}
                    busy={controller.busy}
                    gmailButtonLabel={controller.gmailButtonLabel}
                    outlookButtonLabel={controller.outlookButtonLabel}
                    title={controller.flow.gmailImportPresentation.title}
                    description={controller.flow.gmailImportPresentation.description}
                    disconnectedHelper={controller.flow.gmailImportPresentation.disconnectedHelper}
                    passive={controller.flow.gmailImportPresentation.passive}
                    onToggle={controller.toggleTask}
                    onImportGmail={controller.importEmail}
                    onImportOutlook={controller.importOutlook}
                  />
                ) : null}
              </>
            ) : null}
            <ExportImportTaskSection
              state={controller.flow.exportImport}
              providerProgress={controller.flow.exportProviderProgress}
              isOpen={controller.activeTaskId === 'uber_export'}
              fileReady={controller.flow.exportFileReady}
              readyProvider={controller.flow.exportReadyProvider}
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
            {controller.importPreferences?.export.providers.uberEats.relevance === 'not_used' ? (
              <Card style={styles.relevanceCard}>
                <View style={styles.relevanceCopy}>
                  <Text style={styles.relevanceTitle}>Uber Eats recommendations are off</Text>
                  <Text style={styles.relevanceBody}>This changes guidance only. You can add Uber Eats history whenever you need it.</Text>
                </View>
                <AppButton label="Add Uber Eats after all" variant="secondary" onPress={controller.restoreUberRelevance} />
              </Card>
            ) : null}
            {(initialJourney.kind === 'complete' || managingNotUsed) && controller.gmailFeatureEnabled ? (
              <>
                <SectionHeader title="Automatic updates" subtitle="Optional periodic email checks are separate from one-time scans and downloaded history." />
                <OngoingUpdatesSection
                  presentation={controller.ongoingUpdatesPresentation}
                  busy={controller.busy}
                  onSetup={controller.setupOngoingUpdates}
                />
              </>
            ) : null}
            <SectionHeader title="Help" />
            <Card style={styles.helpCard}>
              <Text style={styles.relevanceTitle}>How your data is handled</Text>
              <Text style={styles.relevanceBody}>SnackTrack only starts a scan, request tutorial, or file import after you choose it. Existing history stays visible if a connection needs repair.</Text>
            </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <ImportWorkflowModals
        tutorialVisible={controller.showTutorial}
        tutorialMode={controller.tutorialMode}
        tutorialInitialPlatform={controller.tutorialPlatform}
        tutorialProviderStatuses={{
          uber: controller.flow.exportProviderProgress.uberEats.status,
          doordash: controller.flow.exportProviderProgress.doorDash.status,
        }}
        tutorialEntryJob={controller.tutorialEntryJob}
        gmailFeatureEnabled={controller.gmailFeatureEnabled}
        gmailVisible={controller.showGmailModal}
        loadingVisible={controller.showGmailImportLoadingModal}
        primaryFlowState={controller.primaryFlowState}
        gmailConnectPhase={controller.gmailConnectPhase}
        gmailConnectionStatus={controller.gmailConnectionStatus}
        isGmailLoading={controller.isGmailLoading}
        isGmailChecking={controller.isGmailChecking}
        canCheckForNewOrders={controller.canCheckForNewOrders}
        onCheckForNewOrders={controller.checkForNewOrders}
        onCloseTutorial={controller.closeTutorial}
        onTutorialComplete={controller.completeTutorial}
        onTutorialStillWaiting={controller.tutorialStillWaiting}
        onTutorialArchiveDownloaded={controller.tutorialArchiveDownloaded}
        onTutorialReadyConfirmed={controller.tutorialReadyConfirmed}
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
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  taskList: { gap: 14 },
  relevanceCard: { padding: 16, gap: 14 },
  relevanceCopy: { gap: 4 },
  relevanceTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  relevanceBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  helpCard: { padding: 16, gap: 6, marginBottom: 28 },
  recommendationCard: { padding: 18, gap: 6, backgroundColor: Colors.infoBg },
  recommendationHint: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginTop: 4 },
});
