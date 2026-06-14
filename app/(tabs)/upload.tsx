import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { type GmailPrimaryFlowState, useGmailImport } from '@hooks/useGmailImport';
import { useExportUpsell } from '@hooks/useExportUpsell';
import { FadeInView } from '@components/ui/FadeInView';
import { type GmailImportResponse } from '@services/gmailApi';

type ImportTaskId = 'connect_email' | 'gmail_import' | 'uber_export';

const GMAIL_IMPORT_MESSAGES = [
  'This can take up to 1-2 minutes depending on your gluttony.',
  'Questioning every late-night delivery choice with professional courtesy.',
  'Sorting tacos from therapy purchases.',
  'Teaching Gmail what counts as dinner.',
  'Looking for receipts and trying not to judge the sauce math.',
  'Counting fries with unnecessary precision.',
  'Separating real meals from side-quest snacks.',
];

interface ImportTaskCardProps {
  id: ImportTaskId;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  statusLabel: string;
  statusTone: 'complete' | 'recommended' | 'optional';
  isComplete: boolean;
  isOpen: boolean;
  onPress: (id: ImportTaskId) => void;
  children: ReactNode;
}

function ImportTaskCard({
  id,
  title,
  description,
  iconName,
  statusLabel,
  statusTone,
  isComplete,
  isOpen,
  onPress,
  children,
}: ImportTaskCardProps) {
  const statusBadgeStyle = {
    complete: styles.taskStatusBadgeComplete,
    recommended: styles.taskStatusBadgeRecommended,
    optional: styles.taskStatusBadgeOptional,
  }[statusTone];
  const statusTextStyle = {
    complete: styles.taskStatusTextComplete,
    recommended: styles.taskStatusTextRecommended,
    optional: styles.taskStatusTextOptional,
  }[statusTone];

  return (
    <View style={[styles.taskCard, isOpen && styles.taskCardOpen]}>
      <TouchableOpacity
        style={styles.taskCardHeader}
        onPress={() => onPress(id)}
        activeOpacity={0.85}
      >
        <View style={styles.taskIcon}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : iconName}
            size={24}
            color={isComplete ? '#16a34a' : '#0f4c81'}
          />
        </View>
        <View style={styles.taskHeaderText}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{title}</Text>
            <View style={[styles.taskStatusBadge, statusBadgeStyle]}>
              <Text style={[styles.taskStatusText, statusTextStyle]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.taskDescription}>{description}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#94a3b8"
        />
      </TouchableOpacity>

      {isOpen && (
        <FadeInView duration={250} style={styles.taskContent}>
          {children}
        </FadeInView>
      )}
    </View>
  );
}

interface GmailImportLoadingModalProps {
  flowState: GmailPrimaryFlowState;
  importResult: GmailImportResponse | null;
  visible: boolean;
}

function GmailImportLoadingModal({ flowState, importResult, visible }: GmailImportLoadingModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      cardScale.setValue(0.92);
      cardOpacity.setValue(0);
      messageOpacity.setValue(1);
      successScale.setValue(0.7);
      return;
    }

    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (importResult) {
      successScale.setValue(0.7);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 95,
        useNativeDriver: true,
      }).start();
      return;
    }

    const messageTimer = setInterval(() => {
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((current) => (current + 1) % GMAIL_IMPORT_MESSAGES.length);
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, 3200);

    return () => {
      clearInterval(messageTimer);
    };
  }, [cardOpacity, cardScale, importResult, messageOpacity, successScale, visible]);

  const statusText = flowState === 'preparing_import'
    ? 'Warming up the inbox...'
    : 'Importing receipt evidence...';
  const importedReceiptCount = importResult?.totalReceiptsImported ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.loadingModalOverlay}>
        <Animated.View
          style={[
            styles.loadingModalCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {importResult ? (
            <>
              <Animated.View
                style={[
                  styles.successIconWrap,
                  {
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <Ionicons name="checkmark" size={38} color="#ffffff" />
              </Animated.View>

              <Text style={styles.loadingModalTitle}>
                {importedReceiptCount} receipt{importedReceiptCount === 1 ? '' : 's'} found
              </Text>
              <Text style={styles.loadingModalSuccessText}>
                Receipt evidence secured. Preparing your summary...
              </Text>
            </>
          ) : (
            <>
              <View style={styles.loadingIconWrap}>
                <ActivityIndicator size="large" color="#0f4c81" />
              </View>

              <Text style={styles.loadingModalTitle}>Importing from Gmail</Text>
              <Text style={styles.loadingModalStatus}>{statusText}</Text>

              <Animated.Text style={[styles.loadingModalMessage, { opacity: messageOpacity }]}>
                {GMAIL_IMPORT_MESSAGES[messageIndex]}
              </Animated.Text>

              <View style={styles.loadingModalFooter}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.loadingModalFooterText}>
                  Keep this open while SnackTrack does the inbox archaeology.
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

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
    && (gmailImportResult !== null || primaryFlowState === 'preparing_import' || primaryFlowState === 'importing');
  const hasTriggeredAutoImport = useRef(false);
  const hasHandledExportFocus = useRef(false);
  const hasAppliedInitialTask = useRef(false);

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

    const didConnect = await connectGmail();
    if (didConnect) {
      setActiveTaskId('gmail_import');
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
              <Ionicons name="cloud-upload" size={20} color="#FF9800" />
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
                      <Ionicons name="logo-google" size={20} color="#fff" />
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
                    <Ionicons name="logo-google" size={20} color="#fff" />
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
                description="Optional: upload your Uber export for a more complete history."
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
                    <Ionicons name="cloud-upload-outline" size={28} color="#007AFF" />
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
                    <Ionicons name="information-circle-outline" size={20} color="#475569" />
                    <Text style={styles.tutorialButtonText}>How to request your Uber export</Text>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
                <Ionicons name="close" size={28} color="#666" />
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
      />

      {showLoader && <WrappedJourneyLoader onComplete={handleLoaderComplete} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  taskList: {
    gap: 14,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskCardOpen: {
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskHeaderText: {
    flex: 1,
    marginRight: 10,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  taskStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taskStatusBadgeComplete: {
    backgroundColor: '#dcfce7',
  },
  taskStatusBadgeRecommended: {
    backgroundColor: '#e0f2fe',
  },
  taskStatusBadgeOptional: {
    backgroundColor: '#f1f5f9',
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskStatusTextComplete: {
    color: '#15803d',
  },
  taskStatusTextRecommended: {
    color: '#0f4c81',
  },
  taskStatusTextOptional: {
    color: '#64748b',
  },
  taskContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    paddingTop: 14,
  },
  gmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f4c81',
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
    color: '#fff',
    marginLeft: 8,
  },
  manageLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  taskHelperText: {
    fontSize: 13,
    color: '#475569',
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
    color: '#0f172a',
    marginBottom: 4,
  },
  exportSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tutorialButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    marginLeft: 12,
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  loadingModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    padding: 24,
  },
  loadingModalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    marginBottom: 18,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    marginBottom: 18,
  },
  loadingModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  loadingModalStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f4c81',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingModalMessage: {
    minHeight: 56,
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 18,
  },
  loadingModalSuccessText: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  loadingModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  loadingModalFooterText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
});
