import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { Colors, FontFamily, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
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
import { useEffect, useMemo, useRef } from 'react';
import { trackAdminEvent } from '@services/adminAnalytics';
import { Mascot } from '@components/mascot/Mascot';
import UberDataTutorial from '@components/upload/UberDataTutorial';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';

export function ImportExperienceScreen({ mode = 'auto' }: { mode?: 'auto' | 'setup' | 'manage' }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rawParams = useLocalSearchParams();
  const route = parseImportRouteParams(rawParams);
  const controller = useImportFlowController(route, mode);
  const operationId = typeof rawParams.operationId === 'string' ? rawParams.operationId : undefined;
  const showManagementDetail = mode === 'manage' && Boolean(rawParams.focus || rawParams.action || rawParams.downloadedVersion);
  const { operation } = useImportOperation(Boolean(controller.user), false, operationId);
  const trackedOperationPresentation = useRef<string | null>(null);
  const initialJourney = resolveInitialImportJourney(controller.flow, controller.selectedSetupPath);
  const hubGuidance = resolveHomeDataGuidance(controller.importPreferences, false);
  const coverageSources = controller.importPreferences ? [
    ...Object.values(controller.importPreferences.coverage.emailProviders),
    ...Object.values(controller.importPreferences.coverage.exportProviders),
  ].filter(source => source.hasData) : [];
  const coverageDates = coverageSources.flatMap(source => [source.earliestOrderDate, source.latestOrderDate]).filter((value): value is string => Boolean(value)).sort();
  const coverageRange = coverageDates.length
    ? `${new Date(coverageDates[0]).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} – ${new Date(coverageDates[coverageDates.length - 1]).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
    : 'No covered dates yet';
  const showGuidedSetup = mode !== 'manage' && (mode === 'setup' || initialJourney.kind === 'choose_method'
    || initialJourney.kind === 'choose_email_provider'
    || initialJourney.kind === 'choose_provider'
    || initialJourney.kind === 'review_email_scan');

  useEffect(() => {
    if (mode === 'setup') void trackAdminEvent('quick_setup_viewed').catch(() => undefined);
    if (mode === 'manage') void trackAdminEvent('data_tracking_viewed').catch(() => undefined);
  }, [mode]);
  useEffect(() => {
    const active = controller.activeImportOperation;
    if (!active?.presentation || !['pending_dispatch','queued','running','retrying'].includes(active.status)) return;
    const key = `${active.id}:${active.presentation.mode}`;
    if (trackedOperationPresentation.current === key) return;
    trackedOperationPresentation.current = key;
    void trackAdminEvent(active.presentation.mode === 'delayed' ? 'delayed_import_shown' : 'foreground_import_shown', {
      properties: { operationKind: active.kind, reason: active.presentation.reason },
    }).catch(() => undefined);
  }, [controller.activeImportOperation]);

  if (!controller.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ImportOperationCard operation={operation} />
          <AppText variant="pageTitle" style={styles.title}>Data & tracking</AppText>
          <AppText variant="body" style={styles.subtitle}>Please log in to connect email or add your delivery-app history.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (controller.showTutorial) {
    return <UberDataTutorial
      mode={controller.tutorialMode}
      initialPlatform={controller.tutorialPlatform}
      providerStatuses={{
        uber: controller.flow.exportProviderProgress.uberEats.status,
        doordash: controller.flow.exportProviderProgress.doorDash.status,
      }}
      entryJob={controller.tutorialEntryJob}
      onRequestConfirmed={controller.completeTutorial}
      onStillWaiting={controller.tutorialStillWaiting}
      onArchiveDownloaded={controller.tutorialArchiveDownloaded}
      onReadyConfirmed={controller.tutorialReadyConfirmed}
      onClose={controller.closeTutorial}
    />;
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
          {controller.activeImportOperation && controller.activeImportOperation.presentation?.mode === 'delayed' ? (
            <ImportOperationCard operation={controller.activeImportOperation} />
          ) : null}
          {controller.completionSummary ? (
            <ImportCompletionPanel
              summary={controller.completionSummary}
              onHome={controller.goHome}
              onNext={controller.continueAfterCompletion}
              onTryAnotherEmail={controller.tryAnotherEmail}
            />
          ) : showGuidedSetup ? (
            <ImportSetupJourney
              flow={controller.flow}
              selectedPath={controller.selectedSetupPath}
              busy={controller.busy}
              onChooseEmailPath={controller.chooseEmailSetup}
              onChooseEmail={controller.chooseSetupEmail}
              onChooseAlternative={controller.chooseAlternativeSetup}
              onChangeMethod={controller.changeSetupMethod}
              onImportGmail={controller.importEmail}
              onImportOutlook={controller.importOutlook}
              onChooseProvider={controller.openProviderTutorial}
            />
          ) : mode === 'manage' && !showManagementDetail ? (
            <>
              <View style={styles.headerRow}>
                <AppButton label="Back" variant="icon" icon="arrow-back" onPress={() => router.back()} />
                <Mascot pose="sunglasses" size={58} />
              </View>
              <PageHeader eyebrow="DATA & TRACKING" title="Your data, in one place" body="See what’s covered, fill the gaps, and decide how SnackTrack stays current." />

              <View style={styles.coverageHero}>
                <AppText variant="eyebrow" style={styles.coverageEyebrow}>YOUR COVERAGE</AppText>
                <AppText variant="heroValue" style={styles.coverageValue}>{(controller.importPreferences?.coverage.emailReceiptCount ?? 0) + (controller.importPreferences?.coverage.exportReceiptCount ?? 0)} orders</AppText>
                <AppText variant="body" style={styles.coverageRange}>{coverageRange}</AppText>
                <View style={styles.coverageChip}><AppText variant="eyebrow" style={styles.coverageChipText}>{coverageSources.length ? 'HISTORY CONNECTED' : 'READY TO START'}</AppText></View>
              </View>

              <AppText variant="surfaceTitle" style={styles.groupTitle}>History sources</AppText>
              <Card style={styles.settingsCard}>
                <ManagementRow icon="mail-outline" title="Email receipts" subtitle={controller.flow.hasImportedEmailData ? `${controller.importPreferences?.coverage.emailReceiptCount ?? 0} orders found` : 'Find supported delivery receipts'} onPress={controller.openGmailSettings} />
                <View style={styles.rowDivider} />
                <ManagementRow icon="albums-outline" title="Detailed order history" subtitle={controller.flow.hasAnyExportData ? `${controller.importPreferences?.coverage.exportReceiptCount ?? 0} detailed orders` : 'Fill gaps and unlock deeper stats'} onPress={controller.openTutorial} />
              </Card>

              <AppText variant="surfaceTitle" style={styles.groupTitle}>Automatic updates</AppText>
              <Card style={styles.settingsCard}>
                <ManagementRow icon="sync-outline" title="Keep my stats current" subtitle={controller.ongoingUpdatesPresentation.body || 'Choose whether SnackTrack checks for new supported receipts.'} onPress={controller.setupOngoingUpdates} />
              </Card>

              <AppText variant="surfaceTitle" style={styles.groupTitle}>Privacy and control</AppText>
              <Card style={styles.settingsCard}>
                <ManagementRow icon="shield-checkmark-outline" title="How SnackTrack uses my data" subtitle="Private by default, with controls for every source" onPress={() => router.push('/(tabs)/profile')} />
              </Card>
            </>
          ) : (
            <>
              <View style={styles.header}>
                {mode === 'manage' ? <AppButton label="Back" variant="icon" icon="arrow-back" onPress={() => router.replace('/data-tracking')} /> : null}
                <PageHeader eyebrow="DATA & TRACKING" title="Source details" body="Manage this source, its history, and how it keeps your stats current." />
              </View>

              <View style={styles.taskList}>
            <SectionHeader title="Coverage" subtitle="What SnackTrack can currently see across your connected and imported sources." />
            <Card style={styles.recommendationCard}>
              <AppText variant="surfaceTitle" style={styles.relevanceTitle}>
                {(controller.importPreferences?.coverage.emailReceiptCount ?? 0) + (controller.importPreferences?.coverage.exportReceiptCount ?? 0)} orders covered
              </AppText>
              <AppText variant="surfaceBody" style={styles.relevanceBody}>
                {[
                  controller.importPreferences?.coverage.emailProviders.uberEats.hasData || controller.importPreferences?.coverage.exportProviders.uberEats.hasData ? 'Uber Eats' : null,
                  controller.importPreferences?.coverage.emailProviders.doorDash.hasData || controller.importPreferences?.coverage.exportProviders.doorDash.hasData ? 'DoorDash' : null,
                ].filter(Boolean).join(' and ') || 'No providers represented yet'}
              </AppText>
              <AppText variant="surfaceBody" style={styles.relevanceBody}>{coverageRange}</AppText>
              <AppText variant="metadata" style={styles.recommendationHint}>Missing periods or providers will appear as the best next action below.</AppText>
            </Card>
            <SectionHeader title="Recommended next step" />
            <Card style={styles.recommendationCard} accessibilityLabel={`${hubGuidance.title}. ${hubGuidance.body}`}>
              <AppText variant="surfaceTitle" style={styles.relevanceTitle}>{hubGuidance.title}</AppText>
              <AppText variant="surfaceBody" style={styles.relevanceBody}>{hubGuidance.body}</AppText>
              <AppText variant="metadata" style={styles.recommendationHint}>Use the matching source below to continue.</AppText>
            </Card>
            <SectionHeader title="Sources" subtitle="Connections, one-time scans, and imported files keep their own status." />
            {(initialJourney.kind === 'complete' || mode === 'manage') && controller.gmailFeatureEnabled ? (
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
            {(initialJourney.kind === 'complete' || mode === 'manage') && controller.gmailFeatureEnabled ? (
              <>
                <SectionHeader title="Automatic updates" subtitle="Optional periodic email checks are separate from one-time scans and downloaded history." />
                <OngoingUpdatesSection
                  presentation={controller.ongoingUpdatesPresentation}
                  busy={controller.busy}
                  onSetup={controller.setupOngoingUpdates}
                />
              </>
            ) : null}
            <SectionHeader title="Privacy and control" />
            <Card style={styles.helpCard}>
              <AppText variant="surfaceTitle" style={styles.relevanceTitle}>How your data is handled</AppText>
              <AppText variant="surfaceBody" style={styles.relevanceBody}>SnackTrack only scans supported delivery receipts after you explicitly start it. Disconnecting an inbox preserves imported history; reset and deletion controls remain under your account settings.</AppText>
            </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <ImportWorkflowModals
        tutorialVisible={false}
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
        operation={controller.activeImportOperation}
        onExploreDelayed={controller.exploreDelayedImport}
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

export default function UploadScreen() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/data-tracking', params }} />;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flexGrow: 1, padding: 18 },
  header: { marginBottom: 20 },
  title: { marginBottom: 8 },
  subtitle: {},
  taskList: { gap: 14 },
  relevanceCard: { padding: 16, gap: 14 },
  relevanceCopy: { gap: 4 },
  relevanceTitle: {},
  relevanceBody: {},
  helpCard: { padding: 16, gap: 6, marginBottom: 28 },
  recommendationCard: { padding: 18, gap: 6, backgroundColor: theme.colors.infoBg },
  recommendationHint: { color: theme.colors.primary, fontFamily: FontFamily.medium, marginTop: 4 },
  headerRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  coverageHero: { minHeight: 190, borderRadius: 28, padding: 22, marginTop: 22, backgroundColor: Colors.forest850 },
  coverageEyebrow: { color: Colors.leaf300 },
  coverageValue: { color: Colors.white, fontFamily: FontFamily.semibold, marginTop: 17 },
  coverageRange: { color: Colors.alpha(Colors.white, 0.72), marginTop: 5 },
  coverageChip: { alignSelf: 'flex-start', backgroundColor: Colors.alpha(Colors.leaf300, 0.15), borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginTop: 20 },
  coverageChipText: { color: Colors.leaf300, fontSize: 10, lineHeight: 13 },
  groupTitle: { marginTop: 24, marginBottom: 9 },
  settingsCard: { padding: 0, overflow: 'hidden' },
  managementRow: { minHeight: 76, paddingHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  managementIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.alpha(theme.colors.primary, 0.1), alignItems: 'center', justifyContent: 'center' },
  managementCopy: { flex: 1 },
  managementTitle: { fontFamily: FontFamily.medium },
  managementSubtitle: { marginTop: 3 },
  rowDivider: { height: 1, backgroundColor: theme.colors.divider, marginLeft: 69 },
});

function ManagementRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={({ pressed }) => [styles.managementRow, pressed && { backgroundColor: theme.colors.infoBg }]}>
      <View style={styles.managementIcon}><Ionicons name={icon} size={20} color={theme.colors.primary} /></View>
      <View style={styles.managementCopy}><AppText variant="rowTitle" style={styles.managementTitle}>{title}</AppText><AppText variant="metadata" style={styles.managementSubtitle}>{subtitle}</AppText></View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.slate500} />
    </Pressable>
  );
}
