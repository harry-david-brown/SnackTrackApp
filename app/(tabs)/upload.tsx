import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { FadeInView } from '@components/ui/FadeInView';

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
  const [isExportSectionExpanded, setIsExportSectionExpanded] = useState(false);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const { pendingCount, isSyncing } = useOfflineSync();
  const showGmailFeature = featureFlags.showGmailImport;
  const totalImportedReceipts = state.analytics?.totalReceipts ?? state.user?.receiptCount ?? 0;
  const isFirstImport = totalImportedReceipts === 0;
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    connectionStatus,
    isChecking: isGmailStatusChecking,
    primaryFlowState,
    connectAndImportGmail,
    importReceipts,
    resumeAutoImport,
    refreshConnectionStatus,
  } = useGmailImport({
    onImportSuccess: () => {
      setShowLoader(true);
    },
  });
  const { markCompleted } = useExportUpsell(state.user?.id);
  const canImportFromGmail = connectionStatus.canImport !== false;
  const needsReconnectForImport = connectionStatus.connected && !canImportFromGmail;
  const hasTriggeredAutoImport = useRef(false);
  const hasHandledExportFocus = useRef(false);

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
    if (shouldFocusExport || shouldShowExportTutorialFromParam) {
      setIsExportSectionExpanded(true);
    }
  }, [shouldFocusExport, shouldShowExportTutorialFromParam]);

  const handleUploadSuccess = async (_receiptsCount: number) => {
    await markCompleted();
    setShowLoader(true);
  };

  const handleLoaderComplete = async () => {
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
  };

  const handleUploadError = (_error: string) => {
    // Error is already shown inside the upload UI.
  };

  const handleGmailImportSuccess = async () => {
    setShowGmailModal(false);
    setShowLoader(true);
  };

  const handlePrimaryGmailAction = async () => {
    if (isGmailStatusChecking || primaryFlowState !== 'idle') {
      return;
    }

    if (connectionStatus.connected && canImportFromGmail) {
      await importReceipts();
      return;
    }

    await connectAndImportGmail();
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
      return 'Import from Gmail';
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
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles-outline" size={16} color="#0f4c81" />
              <Text style={styles.headerBadgeText}>
                {isFirstImport ? 'Recommended first step' : 'Recommended quick import'}
              </Text>
            </View>
            <Text style={styles.title}>
              {isFirstImport ? 'Start with Gmail' : 'Import more from Gmail'}
            </Text>
            <Text style={styles.subtitle}>
              {isFirstImport
                ? 'Import your delivery receipts in minutes.'
                : 'Pull in more delivery receipts automatically.'}
            </Text>
          </View>

          {showGmailFeature && (
            <View style={styles.primaryCard}>
              <View style={styles.primaryCardIcon}>
                <Ionicons name="mail-open-outline" size={28} color="#0f4c81" />
              </View>
              <Text style={styles.primaryCardTitle}>Import from Gmail</Text>
              <Text style={styles.primaryCardSubtitle}>
                The fastest way to get your first insights.
              </Text>

              <TouchableOpacity
                style={styles.gmailButton}
                onPress={handlePrimaryGmailAction}
                activeOpacity={0.85}
                disabled={primaryFlowState !== 'idle' || isGmailStatusChecking}
              >
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.gmailButtonText}>{gmailButtonLabel}</Text>
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                We only use your receipt data to generate your personal spending insights.
              </Text>

              {connectionStatus.connected && (
                <TouchableOpacity
                  style={styles.manageLink}
                  onPress={() => setShowGmailModal(true)}
                  disabled={primaryFlowState !== 'idle'}
                >
                  <Text style={styles.manageLinkText}>Manage Gmail connection</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.secondarySection} onLayout={handleExportSectionLayout}>
            <TouchableOpacity
              style={styles.secondaryToggle}
              onPress={() => setIsExportSectionExpanded(prev => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryToggleText}>
                {isExportSectionExpanded ? 'Hide other ways to import' : 'Other ways to import'}
              </Text>
            </TouchableOpacity>

            {isExportSectionExpanded && (
              <FadeInView style={styles.secondaryContent}>
                <Text style={styles.secondarySubtitle}>
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
              </FadeInView>
            )}
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
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  headerBadgeText: {
    color: '#0f4c81',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
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
  primaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  primaryCardSubtitle: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 23,
    marginBottom: 18,
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
  gmailButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  privacyNote: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginTop: 12,
    textAlign: 'center',
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
  secondarySection: {
    marginBottom: 20,
  },
  secondaryToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  secondaryToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  secondaryContent: {
    marginTop: 10,
  },
  secondarySubtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 14,
  },
  exportCard: {
    backgroundColor: '#ffffff',
    padding: 20,
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
});
