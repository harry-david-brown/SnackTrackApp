import { Colors } from '@/constants/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import { analyticsApi } from '@services/analyticsApi';
import { UberDataUpload } from '@components/upload/UberDataUpload';
import UberDataTutorial from '../../components/upload/UberDataTutorial';
import WrappedJourneyLoader from '../../components/wrapped/WrappedJourneyLoader';
import { useOfflineSync } from '@hooks/useOfflineSync';
import { GmailConnection } from '@/components';
import { featureFlags } from '@config/featureFlags';
import { useGmailImport } from '@hooks/useGmailImport';
import { useExportUpsell } from '@hooks/useExportUpsell';
import { type GmailImportResponse } from '@services/gmailApi';
import {
  GmailImportLoadingModal,
  type GmailConnectPhase,
} from '@components/gmail/GmailImportLoadingModal';
import { ImportTaskCard, type ImportTaskId } from '@components/upload/ImportTaskCard';

export default function UploadScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const params = useLocalSearchParams();
  const shouldAutoImportFromParam = params.autoImportGmail === 'true';
  const autoImportFlowId = typeof params.autoImportFlowId === 'string' ? params.autoImportFlowId : null;
  const shouldShowExportTutorialFromParam = params.showExportTutorial === 'true';
  const shouldFocusExport = params.focus === 'export';
  const [showLoader, setShowLoader] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailImportResult, setGmailImportResult] = useState<GmailImportResponse | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] = useState<GmailConnectPhase>('idle');
  const connectSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pendingCount, isSyncing } = useOfflineSync();
  const showGmailFeature = featureFlags.showGmailImport;
  const totalImportedReceipts = state.analytics?.totalReceipts ?? state.user?.receiptCount ?? 0;
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    connectionStatus,
    isChecking: isGmailStatusChecking,
    primaryFlowState,
    connectGmail,
    importReceipts,
    resumeAutoImport,
    refreshConnectionStatus,
  } = useGmailImport({
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      setGmailImportResult(result);
    },
  });
  const { hasCompletedExport, isLoading: isExportUpsellLoading, markCompleted } = useExportUpsell(state.user?.id);
  const canImportFromGmail = connectionStatus.canImport !== false;
  const needsReconnectForImport = connectionStatus.connected && !canImportFromGmail;
  const hasConnectedEmail = connectionStatus.connected;
  const hasImportedDeliveryData = totalImportedReceipts > 0;
  const showGmailImportLoadingModal = showGmailFeature
    && !showLoader
    && (gmailImportResult !== null
      || gmailConnectPhase !== 'idle'
      || primaryFlowState === 'preparing_import'
      || primaryFlowState === 'importing');
  const hasTriggeredAutoImport = useRef(false);
  const hasHandledExportFocus = useRef(false);
  const hasAppliedInitialTask = useRef(false);

  useEffect(() => {
    return () => {
      if (connectSuccessTimerRef.current) {
        clearTimeout(connectSuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showGmailFeature || !shouldAutoImportFromParam || !autoImportFlowId) {
      return;
    }

    if (isGmailStatusChecking) {
      return;
    }

    // Only trigger auto-import once per component mount
    if (hasTriggeredAutoImport.current) {
      return;
    }

    hasTriggeredAutoImport.current = true;
    void resumeAutoImport(autoImportFlowId);
  }, [
    isGmailStatusChecking,
    showGmailFeature,
    shouldAutoImportFromParam,
    autoImportFlowId,
    resumeAutoImport,
  ]);

  useEffect(() => {
    if (!showGmailFeature || !showGmailModal) {
      return;
    }

    void refreshConnectionStatus();
  }, [refreshConnectionStatus, showGmailFeature, showGmailModal]);

  useEffect(() => {
    if (!shouldFocusExport || exportSectionY === null || hasHandledExportFocus.current) {
      return;
    }

    hasHandledExportFocus.current = true;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, exportSectionY - 16),
        animated: true,
      });
    });

    if (shouldShowExportTutorialFromParam) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 300);
    }
  }, [exportSectionY, shouldFocusExport, shouldShowExportTutorialFromParam]);

  useEffect(() => {
    if (hasAppliedInitialTask.current || isGmailStatusChecking || isExportUpsellLoading) {
      return;
    }

    hasAppliedInitialTask.current = true;

    if (shouldFocusExport || shouldShowExportTutorialFromParam) {
      setActiveTaskId('uber_export');
      return;
    }

    if (!showGmailFeature) {
      setActiveTaskId(hasCompletedExport ? null : 'uber_export');
      return;
    }

    if (!hasConnectedEmail) {
      setActiveTaskId('connect_email');
      return;
    }

    if (!hasImportedDeliveryData) {
      setActiveTaskId('gmail_import');
      return;
    }

    if (!hasCompletedExport) {
      setActiveTaskId('uber_export');
      return;
    }

    setActiveTaskId(null);
  }, [
    hasCompletedExport,
    hasConnectedEmail,
    hasImportedDeliveryData,
    isExportUpsellLoading,
    isGmailStatusChecking,
    shouldFocusExport,
    shouldShowExportTutorialFromParam,
    showGmailFeature,
  ]);

  const handleUploadSuccess = async (_receiptsCount: number) => {
    await markCompleted();
    setShowLoader(true);
  };

  const handleLoaderComplete = useCallback(async () => {
    try {
      if (!state.user) {
        router.replace('/(tabs)/wrapped-journey');
        return;
      }

      const summary = await analyticsApi.getUserSummary(state.user.id, true);
      setGlobalAnalytics(summary);
      router.replace('/(tabs)/wrapped-journey');
    } catch (error) {
      console.error('Failed to complete import flow:', error);
    } finally {
      setShowLoader(false);
    }
  }, [setGlobalAnalytics, state.user]);

  useEffect(() => {
    if (!gmailImportResult) {
      return;
    }

    const summaryTimer = setTimeout(() => {
      void (async () => {
        await handleLoaderComplete();
        setGmailImportResult(null);
      })();
    }, 1000);

    return () => {
      clearTimeout(summaryTimer);
    };
  }, [gmailImportResult, handleLoaderComplete]);

  const handleUploadError = (_error: string) => {
    // Error is already shown inside the upload UI.
  };

  const handleGmailImportSuccess = async (result: GmailImportResponse) => {
    setShowGmailModal(false);
    setGmailImportResult(result);
  };

  const handleTaskPress = (taskId: ImportTaskId) => {
    setActiveTaskId(current => current === taskId ? null : taskId);
  };

  const handleConnectEmail = async () => {
    if (isGmailStatusChecking || primaryFlowState !== 'idle') {
      return;
    }

    // Keep the mascot modal mounted across the whole connect flow (connecting
    // → connected) so there's no visibility gap when the hook resets to idle.
    if (connectSuccessTimerRef.current) {
      clearTimeout(connectSuccessTimerRef.current);
      connectSuccessTimerRef.current = null;
    }
    setGmailConnectPhase('connecting');

    const didConnect = await connectGmail();
    if (didConnect) {
      setActiveTaskId('gmail_import');
      setGmailConnectPhase('connected');
      connectSuccessTimerRef.current = setTimeout(() => {
        setGmailConnectPhase('idle');
        connectSuccessTimerRef.current = null;
      }, 2200);
    } else {
      setGmailConnectPhase('idle');
    }
  };

  const handlePrimaryGmailAction = async () => {
    if (isGmailStatusChecking || primaryFlowState !== 'idle') {
      return;
    }

    if (!connectionStatus.connected || !canImportFromGmail) {
      return;
    }

    await importReceipts();
  };

  const handleExportSectionLayout = (event: LayoutChangeEvent) => {
    setExportSectionY(event.nativeEvent.layout.y);
  };

  const gmailButtonLabel = (() => {
    if (primaryFlowState === 'connecting') {
      return 'Connecting Gmail...';
    }

    if (primaryFlowState === 'preparing_import' || primaryFlowState === 'importing') {
      return 'Importing receipts...';
    }

    if (connectionStatus.connected && canImportFromGmail) {
      return hasImportedDeliveryData ? 'Re-import from Gmail' : 'Import from Gmail';
    }

    if (needsReconnectForImport) {
      return 'Reconnect Gmail and Import';
    }

    return 'Connect Gmail and Import';
  })();

  if (!state.user) {
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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        bounces={true}
      >
        <View style={styles.content}>
          {pendingCount > 0 && (
            <View style={styles.pendingBanner}>
              <Ionicons name="cloud-upload" size={20} color={Colors.warningBright} />
              <Text style={styles.pendingText}>
                {isSyncing
                  ? `Syncing ${pendingCount} pending upload${pendingCount > 1 ? 's' : ''}...`
                  : `${pendingCount} upload${pendingCount > 1 ? 's' : ''} queued for retry`}
              </Text>
            </View>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>Build your SnackTrack history</Text>
            <Text style={styles.subtitle}>
              Start with email, then add an optional Uber export for more complete insights.
            </Text>
          </View>

          <View style={styles.taskList}>
            {showGmailFeature && (
              <>
                <ImportTaskCard
                  id="connect_email"
                  title="Connect email"
                  description="Connect Gmail so SnackTrack can find delivery receipts."
                  iconName="mail-outline"
                  statusLabel={hasConnectedEmail ? 'Complete' : 'Recommended'}
                  statusTone={hasConnectedEmail ? 'complete' : 'recommended'}
                  isComplete={hasConnectedEmail}
                isOpen={activeTaskId === 'connect_email'}
                onPress={handleTaskPress}
              >
                  {!hasConnectedEmail && (
                    <TouchableOpacity
                      style={styles.gmailButton}
                      onPress={handleConnectEmail}
                      activeOpacity={0.85}
                      disabled={primaryFlowState !== 'idle' || isGmailStatusChecking}
                    >
                      <Ionicons name="logo-google" size={20} color={Colors.white} />
                      <Text style={styles.gmailButtonText}>Connect Gmail</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.taskHelperText}>
                    {hasConnectedEmail
                      ? 'Gmail is connected. You can manage the connection below if needed.'
                      : 'We only use your receipt data to generate your personal spending insights.'}
                  </Text>

                  {hasConnectedEmail && (
                    <TouchableOpacity
                      style={styles.manageLink}
                      onPress={() => setShowGmailModal(true)}
                      disabled={primaryFlowState !== 'idle'}
                    >
                      <Text style={styles.manageLinkText}>Manage Gmail connection</Text>
                    </TouchableOpacity>
                  )}
                </ImportTaskCard>

                <ImportTaskCard
                  id="gmail_import"
                  title="Import delivery data"
                  description="Pull delivery receipts from your connected Gmail account."
                  iconName="download-outline"
                  statusLabel={hasImportedDeliveryData ? 'Complete' : hasConnectedEmail ? 'Recommended' : 'Connect email first'}
                  statusTone={hasImportedDeliveryData ? 'complete' : 'recommended'}
                  isComplete={hasImportedDeliveryData}
                  isOpen={activeTaskId === 'gmail_import'}
                  onPress={handleTaskPress}
                >
                  <TouchableOpacity
                    style={[
                      styles.gmailButton,
                      !hasConnectedEmail && styles.disabledButton,
                    ]}
                    onPress={handlePrimaryGmailAction}
                    activeOpacity={0.85}
                    disabled={!hasConnectedEmail || !canImportFromGmail || primaryFlowState !== 'idle' || isGmailStatusChecking}
                  >
                    <Ionicons name="logo-google" size={20} color={Colors.white} />
                    <Text style={styles.gmailButtonText}>{gmailButtonLabel}</Text>
                  </TouchableOpacity>

                  {!hasConnectedEmail ? (
                    <Text style={styles.taskHelperText}>
                      Connect Gmail first, then come back here to import your receipt history.
                    </Text>
                  ) : needsReconnectForImport && (
                    <Text style={styles.taskHelperText}>
                      Gmail needs attention before importing. Manage your Gmail connection from the email task.
                    </Text>
                  )}
                </ImportTaskCard>
              </>
            )}

            <View onLayout={handleExportSectionLayout}>
              <ImportTaskCard
                id="uber_export"
                title="Import via Uber"
                description="Optional: upload your Uber export to expand your imported history."
                iconName="cloud-upload-outline"
                statusLabel={hasCompletedExport ? 'Complete' : hasImportedDeliveryData ? 'Optional next step' : 'Optional'}
                statusTone={hasCompletedExport ? 'complete' : 'optional'}
                isComplete={hasCompletedExport}
                isOpen={activeTaskId === 'uber_export'}
                onPress={handleTaskPress}
              >
                <Text style={styles.taskHelperText}>
                  Already have a delivery data export? Upload it here.
                </Text>

                <View style={styles.exportCard}>
                  <View style={styles.exportHeader}>
                    <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
                    <View style={styles.exportHeaderText}>
                      <Text style={styles.exportTitle}>Have an export file?</Text>
                      <Text style={styles.exportSubtitle}>
                        Upload it now, or review the tutorial if you need help requesting one.
                      </Text>
                    </View>
                  </View>

                  <UberDataUpload
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />

                  <TouchableOpacity
                    style={styles.tutorialButton}
                    onPress={() => setShowTutorial(true)}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
                    <Text style={styles.tutorialButtonText}>How to request your Uber export</Text>
                    <Ionicons name="chevron-forward" size={18} color={Colors.slate500} />
                  </TouchableOpacity>
                </View>
              </ImportTaskCard>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showTutorial}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTutorial(false)}
      >
        <UberDataTutorial onComplete={() => setShowTutorial(false)} />
      </Modal>

      {showGmailFeature && showGmailModal && (
        <Modal
          visible={showGmailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowGmailModal(false)}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import from Gmail</Text>
              <TouchableOpacity
                onPress={() => setShowGmailModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <GmailConnection
                onImportSuccess={handleGmailImportSuccess}
                onDisconnectSuccess={() => {
                  setShowGmailModal(false);
                  void refreshConnectionStatus();
                }}
                onClose={() => setShowGmailModal(false)}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      <GmailImportLoadingModal
        visible={showGmailImportLoadingModal}
        flowState={primaryFlowState}
        importResult={gmailImportResult}
        connectPhase={gmailConnectPhase}
      />

      {showLoader && <WrappedJourneyLoader onComplete={handleLoaderComplete} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  taskList: {
    gap: 14,
  },
  gmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  gmailButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 8,
  },
  manageLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  taskHelperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 12,
  },
  exportCard: {
    marginTop: 14,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exportHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  exportSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  tutorialButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    marginLeft: 12,
  },
  pendingBanner: {
    backgroundColor: Colors.warningSurface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warningBright,
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    color: Colors.warningDark,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
});
