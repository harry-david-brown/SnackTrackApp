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

export default function UploadScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const params = useLocalSearchParams();
  const [showLoader, setShowLoader] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const { pendingCount, isSyncing } = useOfflineSync();
  const hasProcessedOAuthParam = useRef(false);
  const showGmailFeature = featureFlags.showGmailImport;

  // Auto-open Gmail modal if coming from OAuth callback (dev only)
  useEffect(() => {
    if (showGmailFeature && params.openGmail === 'true' && !hasProcessedOAuthParam.current) {
      hasProcessedOAuthParam.current = true;
      console.log('📧 Opening Gmail modal after OAuth callback');
      setShowGmailModal(true);
      
      // Clean up URL parameter without triggering navigation
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Use history API on web to avoid re-render
        const url = new URL(window.location.href);
        url.searchParams.delete('openGmail');
        window.history.replaceState({}, '', url.pathname);
      } else {
        // On mobile, use router.replace
        setTimeout(() => {
          router.replace('/(tabs)/upload');
        }, 500);
      }
    }
  }, [params.openGmail, showGmailFeature]);

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('📊 Gmail modal state changed:', showGmailModal);
  }, [showGmailModal]);

  const handleUploadSuccess = async (receiptsCount: number) => {
    // Show processing loader
    // Note: We don't clear analytics here because the wrapped journey will
    // fetch fresh data with includeWrapped=true and update the global context
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
    // Navigate to wrapped journey
    router.push('/(tabs)/wrapped-journey');
  };

  const handleUploadError = (error: string) => {
    // Error is already shown in UI by CSVUpload component
  };

  const handleGmailImportSuccess = async () => {
    setShowGmailModal(false);
    // Show processing loader
    setShowLoader(true);
  };

  if (!state.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>📤 Upload CSV</Text>
          <Text style={styles.subtitle}>Please log in to upload your data</Text>
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
          {/* Pending Uploads Banner */}
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
            <View>
              <Text style={styles.title}>📤 Upload Data</Text>
              <Text style={styles.subtitle}>Import your delivery app order history</Text>
            </View>
          </View>
          
          {/* Import Methods Grid */}
          <View style={styles.methodsContainer}>
            {/* ZIP Upload Card */}
            <View style={styles.uploadCard}>
              <Ionicons name="cloud-upload-outline" size={64} color="#007AFF" />
              <Text style={styles.uploadTitle}>Upload ZIP File</Text>
              <Text style={styles.uploadSubtitle}>
                Upload your Uber Eats data export
              </Text>
              
              <UberDataUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
          </View>
          
          {/* Tutorial Button */}
          <View style={styles.featuresCard}>
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={() => setShowTutorial(true)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#666" />
              <Text style={styles.tutorialButtonText}>View Tutorial</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

            {/* Gmail Import Card (Dev Only) */}
            {showGmailFeature && (
              <View style={styles.uploadCard}>
                <Ionicons name="mail-outline" size={64} color="#4CAF50" />
                <Text style={styles.uploadTitle}>Import from Gmail</Text>
                <Text style={styles.uploadSubtitle}>
                  Connect Gmail to auto-import receipts
                </Text>
                <TouchableOpacity 
                  style={styles.gmailButton}
                  onPress={() => setShowGmailModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={20} color="#4CAF50" />
                  <Text style={styles.gmailButtonText}>Connect Gmail</Text>
                </TouchableOpacity>
            </View>
            )}
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyCard}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>🔒 Your Privacy Matters</Text>
              <Text style={styles.privacyText}>
                Your data is processed securely and never shared. We only use it to generate your personal spending insights.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Tutorial Modal - Full Screen */}
      <Modal
        visible={showTutorial}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTutorial(false)}
      >
        <UberDataTutorial onComplete={() => setShowTutorial(false)} />
      </Modal>

      {/* Gmail Connection Modal (Dev Only) */}
      {showGmailFeature && (
      <Modal
        visible={showGmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGmailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📧 Gmail Import</Text>
            <TouchableOpacity
              onPress={() => setShowGmailModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <GmailConnection onImportSuccess={handleGmailImportSuccess} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      )}

      {/* Processing Loader (after upload) */}
      {showLoader && (
        <WrappedJourneyLoader onComplete={handleLoaderComplete} />
      )}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  methodsContainer: {
    marginBottom: 20,
  },
  uploadCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
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
  gmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  gmailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
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
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  featuresCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
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
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tutorialButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  privacyCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  privacyContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  privacyText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
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
