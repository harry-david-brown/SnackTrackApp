import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function UploadScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const params = useLocalSearchParams();
  const [showLoader, setShowLoader] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const { pendingCount, isSyncing } = useOfflineSync();
  const hasProcessedOAuthParam = useRef(false);
  const hasAutoImportedFromParamRef = useRef(false);
  const showGmailFeature = featureFlags.showGmailImport;
  const totalImportedReceipts = state.analytics?.totalReceipts ?? state.user?.receiptCount ?? 0;
  const isFirstImport = totalImportedReceipts === 0;
  const {
    connectionStatus,
    isLoading: isGmailConnecting,
    isImporting: isGmailImporting,
    isChecking: isGmailStatusChecking,
    connectAndImportGmail,
    importReceipts,
  } = useGmailImport({
    onImportSuccess: () => {
      setShowLoader(true);
    },
  });
  const canImportFromGmail = connectionStatus.canImport !== false;
  const needsReconnectForImport = connectionStatus.connected && !canImportFromGmail;

  useEffect(() => {
    if (showGmailFeature && params.openGmail === 'true' && !hasProcessedOAuthParam.current) {
      hasProcessedOAuthParam.current = true;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('openGmail');
        window.history.replaceState({}, '', url.pathname);
      } else {
        setTimeout(() => {
          router.replace('/(tabs)/upload');
        }, 500);
      }
    }
  }, [params.openGmail, showGmailFeature]);

  useEffect(() => {
    if (
      !showGmailFeature ||
      params.autoImportGmail !== 'true' ||
      hasAutoImportedFromParamRef.current ||
      isGmailStatusChecking
    ) {
      return;
    }

    if (!connectionStatus.connected || !canImportFromGmail) {
      return;
    }

    hasAutoImportedFromParamRef.current = true;

    void importReceipts();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('autoImportGmail');
      window.history.replaceState({}, '', url.pathname);
    } else {
      setTimeout(() => {
        router.replace('/(tabs)/upload');
      }, 500);
    }
  }, [
    connectionStatus.connected,
    canImportFromGmail,
    importReceipts,
    isGmailStatusChecking,
    params.autoImportGmail,
    showGmailFeature,
  ]);

  const handleUploadSuccess = async (_receiptsCount: number) => {
    setShowLoader(true);
  };

  const handleLoaderComplete = async () => {
    if (!state.user) {
      setShowLoader(false);
      router.push('/(tabs)/wrapped-journey');
      return;
    }

    try {
      const summary = await analyticsApi.getUserSummary(state.user.id, true);
      setGlobalAnalytics(summary);
    } catch (error) {
      console.warn('Failed to refresh analytics after upload:', error);
    }

    setShowLoader(false);
    router.push('/(tabs)/wrapped-journey');
  };

  const handleUploadError = (_error: string) => {
    // Error is already shown inside the upload UI.
  };

  const handleGmailImportSuccess = async () => {
    setShowGmailModal(false);
    setShowLoader(true);
  };

  const handlePrimaryGmailAction = async () => {
    if (isGmailStatusChecking) {
      return;
    }

    if (connectionStatus.connected && canImportFromGmail) {
      await importReceipts();
      return;
    }

    await connectAndImportGmail();
  };

  const gmailButtonLabel = (() => {
    if (isGmailImporting) {
      return 'Importing receipts...';
    }

    if (isGmailConnecting) {
      return connectionStatus.connected ? 'Reconnecting Gmail...' : 'Connecting Gmail...';
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
              {isFirstImport ? 'Start with your inbox' : 'Import more delivery receipts'}
            </Text>
            <Text style={styles.subtitle}>
              {isFirstImport
                ? 'Connect Gmail to pull in receipts quickly and get to your first insights faster.'
                : 'Connect Gmail for a quick import, or upload a full export when you want deeper historical coverage.'}
            </Text>
          </View>

          {showGmailFeature && (
            <View style={styles.primaryCard}>
              <View style={styles.primaryCardIcon}>
                <Ionicons name="mail-open-outline" size={28} color="#0f4c81" />
              </View>
              <Text style={styles.primaryCardTitle}>Import from Gmail</Text>
              <Text style={styles.primaryCardSubtitle}>
                Use the inbox tied to your delivery apps to import receipts in minutes.
              </Text>

              <View style={styles.primaryBenefitList}>
                <View style={styles.primaryBenefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  <Text style={styles.primaryBenefitText}>
                    Fastest way to get to your first insights
                  </Text>
                </View>
                <View style={styles.primaryBenefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  <Text style={styles.primaryBenefitText}>
                    No ZIP file or support request needed
                  </Text>
                </View>
                <View style={styles.primaryBenefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  <Text style={styles.primaryBenefitText}>
                    You can upload a full export later for deeper history
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.gmailButton}
                onPress={handlePrimaryGmailAction}
                activeOpacity={0.85}
                disabled={isGmailConnecting || isGmailImporting || isGmailStatusChecking}
              >
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.gmailButtonText}>{gmailButtonLabel}</Text>
              </TouchableOpacity>

              {connectionStatus.connected && (
                <TouchableOpacity
                  style={styles.manageLink}
                  onPress={() => setShowGmailModal(true)}
                  disabled={isGmailConnecting || isGmailImporting}
                >
                  <Text style={styles.manageLinkText}>Manage Gmail connection</Text>
                </TouchableOpacity>
              )}

              <View style={styles.privacyCard}>
                <Ionicons name="shield-checkmark" size={22} color="#0f4c81" />
                <View style={styles.privacyContent}>
                  <Text style={styles.privacyTitle}>Your data stays protected</Text>
                  <Text style={styles.privacyText}>
                    One tap connects Gmail and starts your import automatically. We only use your receipt data to generate your personal spending insights.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.secondarySection}>
            <Text style={styles.secondaryEyebrow}>Need a more complete import?</Text>
            <Text style={styles.secondaryTitle}>Upload a full export</Text>
            <Text style={styles.secondarySubtitle}>
              Best when you already have an Uber Eats export ZIP and want deeper historical detail.
            </Text>

            <View style={styles.exportCard}>
              <View style={styles.exportHeader}>
                <Ionicons name="cloud-upload-outline" size={28} color="#007AFF" />
                <View style={styles.exportHeaderText}>
                  <Text style={styles.exportTitle}>Have an export already?</Text>
                  <Text style={styles.exportSubtitle}>
                    Upload it here, or review the tutorial first if you need help requesting it.
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
  primaryBenefitList: {
    gap: 12,
    marginBottom: 20,
  },
  primaryBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryBenefitText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 21,
    marginLeft: 10,
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
  manageLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  privacyCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
  },
  privacyContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    color: '#0f4c81',
  },
  privacyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  secondarySection: {
    marginBottom: 20,
  },
  secondaryEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  secondaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
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
