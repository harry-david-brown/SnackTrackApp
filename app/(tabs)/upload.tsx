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
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '@contexts/UserContext';
import { analyticsApi } from '@services/analyticsApi';
import { UberDataUpload } from '@components/upload/UberDataUpload';
import UberDataTutorial, { type DataPlatform } from '../../components/upload/UberDataTutorial';
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
import { useImportPreferences } from '@hooks/useImportPreferences';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  type ExportDownloadHandoffState,
  getExportDownloadHandoffState,
  openUberExportEmail,
  setExportDownloadHandoffState,
  UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS,
  UBER_EXPORT_EMAIL_ACTION,
  UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SEARCH_QUERY,
  UBER_EXPORT_EMAIL_SENDER_NAME,
  UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';

export default function UploadScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const params = useLocalSearchParams();
  const shouldAutoImportFromParam = params.autoImportGmail === 'true';
  const autoImportFlowId = typeof params.autoImportFlowId === 'string' ? params.autoImportFlowId : null;
  const shouldShowExportTutorialFromParam = params.showExportTutorial === 'true';
  const shouldFocusExport = params.focus === 'export';
  const downloadedVersionFromParam = typeof params.downloadedVersion === 'string'
    ? params.downloadedVersion
    : null;
  const [showLoader, setShowLoader] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<ImportTaskId | null>(null);
  const [exportSectionY, setExportSectionY] = useState<number | null>(null);
  const [gmailImportResult, setGmailImportResult] = useState<GmailImportResponse | null>(null);
  const [gmailConnectPhase, setGmailConnectPhase] = useState<GmailConnectPhase>('idle');
  const [exportDownloadState, setExportDownloadState] =
    useState<ExportDownloadHandoffState>('not_downloaded');
  const [autoOpenExportPickerToken, setAutoOpenExportPickerToken] = useState<string | null>(null);
  const connectSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localPickerRequestRef = useRef(0);
  const { pendingCount, isSyncing } = useOfflineSync();
  const showGmailFeature = featureFlags.showGmailImport;
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
    onImportSuccess: (result) => {
      setShowGmailModal(false);
      setGmailImportResult(result);
    },
  });
  const { hasCompletedExport, isLoading: isExportUpsellLoading, markCompleted } = useExportUpsell(state.user?.id);
  const {
    preferences: importPreferences,
    isLoading: areImportPreferencesLoading,
    refresh: refreshImportPreferences,
    setMonitoringConsent,
    markExportRequested,
  } = useImportPreferences(Boolean(state.user?.id));
  const hasServerCompletedExport = importPreferences?.export.status === 'completed';
  const isExportComplete = hasCompletedExport || hasServerCompletedExport;
  const hasRequestedExport = importPreferences?.export.status === 'requested_monitoring_enabled'
    || importPreferences?.export.status === 'requested_monitoring_disabled';
  const isExportFileReady = importPreferences?.export.status === 'file_ready';
  const exportReadyVersion = importPreferences?.export.updatedAt ?? 'ready';
  const shouldShowDownloadGuide = Boolean(
    importPreferences
    && !['not_started', 'completed'].includes(importPreferences.export.status)
  );
  const canImportFromGmail = connectionStatus.canImport !== false;
  const needsReconnectForImport = connectionStatus.connected && !canImportFromGmail;
  const hasConnectedEmail = connectionStatus.connected;
  // This task represents the Gmail scan specifically. Export receipts must not
  // make it look complete when the user has never run the Gmail import.
  const hasImportedDeliveryData = Boolean(
    importPreferences?.gmailImport.hasImported || gmailImportResult?.success
  );
  const showGmailImportLoadingModal = showGmailFeature
    && !showLoader
    && (gmailImportResult !== null
      || gmailConnectPhase !== 'idle'
      || primaryFlowState === 'preparing_import'
      || primaryFlowState === 'importing');
  const hasTriggeredAutoImport = useRef(false);
  const handledExportFocusKeyRef = useRef<string | null>(null);
  const hasAppliedInitialTask = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void refreshImportPreferences();
    }, [refreshImportPreferences])
  );

  useEffect(() => {
    let isCancelled = false;
    const userId = state.user?.id;

    if (!userId || !isExportFileReady) {
      setExportDownloadState('not_downloaded');
      return () => {
        isCancelled = true;
      };
    }

    void getExportDownloadHandoffState(userId, exportReadyVersion).then((nextState) => {
      if (!isCancelled) setExportDownloadState(nextState);
    });

    return () => {
      isCancelled = true;
    };
  }, [exportReadyVersion, isExportFileReady, state.user?.id]);

  useEffect(() => {
    if (isExportFileReady && downloadedVersionFromParam === exportReadyVersion) {
      setExportDownloadState('downloaded');
      setAutoOpenExportPickerToken(downloadedVersionFromParam);
    }
  }, [downloadedVersionFromParam, exportReadyVersion, isExportFileReady]);

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
    const focusKey = shouldFocusExport
      ? `${downloadedVersionFromParam ?? 'export'}:${shouldShowExportTutorialFromParam}`
      : null;
    if (
      !focusKey
      || exportSectionY === null
      || handledExportFocusKeyRef.current === focusKey
    ) {
      return;
    }

    handledExportFocusKeyRef.current = focusKey;
    setActiveTaskId('uber_export');

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
  }, [
    downloadedVersionFromParam,
    exportSectionY,
    shouldFocusExport,
    shouldShowExportTutorialFromParam,
  ]);

  useEffect(() => {
    if (
      hasAppliedInitialTask.current
      || isGmailStatusChecking
      || isExportUpsellLoading
      || areImportPreferencesLoading
    ) {
      return;
    }

    hasAppliedInitialTask.current = true;

    if (shouldFocusExport || shouldShowExportTutorialFromParam) {
      setActiveTaskId('uber_export');
      return;
    }

    if (!showGmailFeature) {
      setActiveTaskId(isExportComplete ? null : 'uber_export');
      return;
    }

    if (!hasConnectedEmail || needsReconnectForImport) {
      setActiveTaskId('connect_email');
      return;
    }

    if (!hasImportedDeliveryData) {
      setActiveTaskId('gmail_import');
      return;
    }

    if (!isExportComplete) {
      setActiveTaskId('uber_export');
      return;
    }

    setActiveTaskId(null);
  }, [
    areImportPreferencesLoading,
    hasConnectedEmail,
    hasImportedDeliveryData,
    isExportComplete,
    isExportUpsellLoading,
    isGmailStatusChecking,
    needsReconnectForImport,
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

    // Connecting Gmail includes the initial scan. The OAuth screen and this
    // task's copy make the read access explicit, so a second manual step is
    // unnecessary.
    const didConnect = await connectAndImportGmail();
    if (didConnect) {
      setActiveTaskId(isExportComplete ? null : 'uber_export');
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

  const saveExportRequest = async (decision?: 'granted' | 'declined') => {
    try {
      if (decision) {
        await setMonitoringConsent(decision);
      }
      await markExportRequested();
    } catch {
      showSimpleAlert(
        'Could not save your export status',
        'Your tutorial is complete, but we could not save this status. Please try again from Import.'
      );
    }
  };

  const handleExportTutorialComplete = (platform: DataPlatform) => {
    setShowTutorial(false);

    // Automatic delivery-email monitoring currently supports Uber only.
    // DoorDash requests are still recorded, but must be uploaded manually.
    if (platform === 'doordash') {
      void saveExportRequest();
      return;
    }

    if (importPreferences?.monitoring.consentState === 'granted') {
      void saveExportRequest();
      return;
    }

    showAlert(
      'Notify you when it’s ready?',
      'Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            void saveExportRequest('declined');
          },
        },
        {
          text: 'Notify Me',
          onPress: () => {
            void saveExportRequest('granted');
          },
        },
      ]
    );
  };

  const reportExportDownloaded = useCallback(async (openPicker = false) => {
    const userId = state.user?.id;
    if (!userId || !isExportFileReady) return;

    await setExportDownloadHandoffState(userId, exportReadyVersion, 'downloaded');
    setExportDownloadState('downloaded');
    if (openPicker) {
      localPickerRequestRef.current += 1;
      setAutoOpenExportPickerToken(
        `${exportReadyVersion}:local:${localPickerRequestRef.current}`
      );
    }
  }, [exportReadyVersion, isExportFileReady, state.user?.id]);

  const handleAutoOpenPickerConsumed = useCallback(() => {
    setAutoOpenExportPickerToken(null);
    if (downloadedVersionFromParam) {
      router.setParams({ downloadedVersion: undefined });
    }
  }, [downloadedVersionFromParam]);

  const handleOpenUberEmail = async () => {
    const userId = state.user?.id;
    if (!userId || !isExportFileReady) return;

    setExportDownloadState('checking_email');
    await setExportDownloadHandoffState(userId, exportReadyVersion, 'checking_email');

    try {
      await openUberExportEmail();
    } catch {
      setExportDownloadState('not_downloaded');
      await setExportDownloadHandoffState(userId, exportReadyVersion, 'not_downloaded');
      showAlert(
        'Could not open Gmail',
        `Open your email app and search for ${UBER_EXPORT_EMAIL_SEARCH_QUERY}.`,
        [{ text: 'OK' }]
      );
    }
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
                  statusLabel={hasConnectedEmail && !needsReconnectForImport ? 'Complete' : needsReconnectForImport ? 'Reconnect' : 'Recommended'}
                  statusTone={hasConnectedEmail && !needsReconnectForImport ? 'complete' : 'recommended'}
                  isComplete={hasConnectedEmail && !needsReconnectForImport}
                isOpen={activeTaskId === 'connect_email'}
                onPress={handleTaskPress}
              >
                  {(!hasConnectedEmail || needsReconnectForImport) && (
                    <TouchableOpacity
                      style={styles.gmailButton}
                      onPress={handleConnectEmail}
                      activeOpacity={0.85}
                      disabled={primaryFlowState !== 'idle' || isGmailStatusChecking}
                    >
                      <Ionicons name="logo-google" size={20} color={Colors.white} />
                      <Text style={styles.gmailButtonText}>{needsReconnectForImport ? 'Reconnect Gmail' : 'Connect Gmail'}</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.taskHelperText}>
                    {needsReconnectForImport
                      ? 'Google no longer accepts the saved authorization. Reconnect Gmail to continue.'
                      : hasConnectedEmail
                      ? 'Gmail is connected. You can manage the connection below if needed.'
                      : 'We only use your receipt data to generate your personal spending insights.'}
                  </Text>

                  {hasConnectedEmail && !needsReconnectForImport && (
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
                  statusLabel={hasImportedDeliveryData ? 'Complete' : needsReconnectForImport ? 'Reconnect email first' : hasConnectedEmail ? 'Recommended' : 'Connect email first'}
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
                title="Import a data export"
                description="Optional: upload an Uber Eats or DoorDash export to expand your history."
                iconName="cloud-upload-outline"
                statusLabel={
                  isExportComplete
                    ? 'Complete'
                    : isExportFileReady
                      ? exportDownloadState === 'downloaded'
                        ? 'Ready to upload'
                        : 'Ready to download'
                    : hasRequestedExport
                      ? 'Requested'
                      : hasImportedDeliveryData
                        ? 'Optional next step'
                        : 'Optional'
                }
                statusTone={isExportComplete ? 'complete' : isExportFileReady ? 'recommended' : 'optional'}
                isComplete={isExportComplete}
                isOpen={activeTaskId === 'uber_export'}
                onPress={handleTaskPress}
              >
                <Text style={styles.taskHelperText}>
                  {isExportFileReady
                    ? exportDownloadState === 'downloaded'
                      ? 'You said the Uber ZIP is downloaded. Choose it to finish importing your history.'
                      : `Uber says your export is ready. Its download link is available for ${UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS} days.`
                    : 'Already have a delivery data export? Upload it here.'}
                </Text>

                <View style={styles.exportCard}>
                  <View style={styles.exportHeader}>
                    <Ionicons
                      name={isExportFileReady && exportDownloadState !== 'downloaded'
                        ? 'mail-unread-outline'
                        : 'cloud-upload-outline'}
                      size={28}
                      color={Colors.primary}
                    />
                    <View style={styles.exportHeaderText}>
                      <Text style={styles.exportTitle}>
                        {isExportFileReady && exportDownloadState !== 'downloaded'
                          ? 'Find Uber’s data-ready email'
                          : isExportFileReady
                            ? 'Upload your Uber export'
                            : 'Have an export file?'}
                      </Text>
                      <Text style={styles.exportSubtitle}>
                        {isExportFileReady && exportDownloadState !== 'downloaded'
                          ? `Open the email below and tap “${UBER_EXPORT_EMAIL_ACTION}” to save the original ZIP.`
                          : 'Upload it now, or use the in-app guide if you need help with the next step.'}
                      </Text>
                    </View>
                  </View>

                  {isExportFileReady && exportDownloadState !== 'downloaded' ? (
                    <View style={styles.readyActionStack}>
                      <View style={styles.emailTargetCard}>
                        <View style={styles.emailTargetRow}>
                          <Text style={styles.emailTargetLabel}>From</Text>
                          <View style={styles.emailTargetValueColumn}>
                            <Text style={styles.emailTargetValue}>{UBER_EXPORT_EMAIL_SENDER_NAME}</Text>
                            <Text style={styles.emailTargetMeta}>{UBER_EXPORT_EMAIL_ADDRESS}</Text>
                          </View>
                        </View>
                        <View style={styles.emailTargetDivider} />
                        <View style={styles.emailTargetRow}>
                          <Text style={styles.emailTargetLabel}>Subject</Text>
                          <Text style={[styles.emailTargetValue, styles.emailTargetSubject]}>
                            {UBER_EXPORT_EMAIL_SUBJECT}
                          </Text>
                        </View>
                        <View style={styles.emailTargetDivider} />
                        <View style={styles.emailTargetRow}>
                          <Text style={styles.emailTargetLabel}>Tap</Text>
                          <Text style={[styles.emailTargetValue, styles.emailTargetSubject]}>
                            {UBER_EXPORT_EMAIL_ACTION}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.gmailButton}
                        onPress={() => void handleOpenUberEmail()}
                        accessibilityRole="button"
                        accessibilityLabel="Open Gmail and find the Uber data-ready email"
                      >
                        <Ionicons name="mail-outline" size={20} color={Colors.white} />
                        <Text style={styles.gmailButtonText}>
                          {exportDownloadState === 'checking_email'
                            ? 'Open Gmail Again'
                            : 'Open Gmail and Find This Email'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.downloadedButton}
                        onPress={() => void reportExportDownloaded(true)}
                        accessibilityRole="button"
                        accessibilityLabel="I already downloaded the Uber export"
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                        <Text style={styles.downloadedButtonText}>I Already Downloaded It</Text>
                      </TouchableOpacity>
                      <Text style={styles.downloadLocationHint}>
                        Downloaded it on a computer? Move the ZIP to Files, iCloud Drive, or Google Drive on this device first.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <UberDataUpload
                        onUploadSuccess={handleUploadSuccess}
                        onUploadError={handleUploadError}
                        autoOpenToken={autoOpenExportPickerToken}
                        onAutoOpenConsumed={handleAutoOpenPickerConsumed}
                      />
                      {isExportFileReady ? (
                        <TouchableOpacity
                          style={styles.emailHelpButton}
                          onPress={() => void handleOpenUberEmail()}
                          accessibilityRole="button"
                        >
                          <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                          <Text style={styles.emailHelpButtonText}>Still need to download it? Open Gmail</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.tutorialButton}
                    onPress={() => setShowTutorial(true)}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
                    <Text style={styles.tutorialButtonText}>
                      {shouldShowDownloadGuide ? 'How to download and upload it' : 'How to request your data'}
                    </Text>
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
        <UberDataTutorial
          mode={shouldShowDownloadGuide ? 'download' : 'request'}
          onRequestConfirmed={handleExportTutorialComplete}
          onClose={() => setShowTutorial(false)}
        />
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
  readyActionStack: {
    gap: 12,
  },
  emailTargetCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 12,
    backgroundColor: Colors.slate50,
  },
  emailTargetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emailTargetLabel: {
    width: 58,
    paddingTop: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emailTargetValueColumn: {
    flex: 1,
  },
  emailTargetValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emailTargetSubject: {
    lineHeight: 19,
  },
  emailTargetMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emailTargetDivider: {
    height: 1,
    marginVertical: 11,
    backgroundColor: Colors.slate200,
  },
  downloadedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  downloadedButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  downloadLocationHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  emailHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  emailHelpButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
