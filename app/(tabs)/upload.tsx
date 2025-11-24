import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { analyticsApi } from '../../services/analyticsApi';
import { UberDataUpload } from '../../components/UberDataUpload';
import UberDataTutorial from '../../components/UberDataTutorial';
import WrappedJourneyLoader from '../../components/WrappedJourneyLoader';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function UploadScreen() {
  const { state, setAnalytics: setGlobalAnalytics } = useUser();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const { pendingCount, isSyncing } = useOfflineSync();

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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
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
              <Text style={styles.subtitle}>Import your Uber Eats order history</Text>
            </View>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => setShowTutorial(true)}
            >
              <Ionicons name="help-circle-outline" size={32} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          {/* Upload Section */}
          <View style={styles.uploadCard}>
            <Ionicons name="cloud-upload-outline" size={64} color="#007AFF" />
            <Text style={styles.uploadTitle}>Upload Your Data</Text>
            <Text style={styles.uploadSubtitle}>
              Upload your Uber Eats ZIP file to analyze your spending patterns
            </Text>
            
            <UberDataUpload 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </View>
          
          {/* Instructions */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 How to get your data:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>Go to Uber Eats website or app</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>Navigate to Account → Privacy → Download Your Data</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>Download the ZIP file from Uber</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>Upload the ZIP file above</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>✨ What you&apos;ll get:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={20} color="#34C759" />
              <Text style={styles.featureText}>Beautiful spending analytics and charts</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="restaurant" size={20} color="#34C759" />
              <Text style={styles.featureText}>Top restaurants and spending breakdown</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="calendar" size={20} color="#34C759" />
              <Text style={styles.featureText}>Monthly and yearly spending trends</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="share-social" size={20} color="#34C759" />
              <Text style={styles.featureText}>Shareable spending summaries</Text>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyCard}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <Text style={styles.privacyTitle}>🔒 Your Privacy Matters</Text>
            <Text style={styles.privacyText}>
              Your data is processed securely and never shared. We only use it to generate your personal spending insights.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Uber Tutorial Modal */}
      <Modal
        visible={showTutorial}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTutorial(false)}
      >
        <UberDataTutorial 
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      </Modal>

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
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  helpButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
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
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
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
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
    marginLeft: 12,
  },
  privacyText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
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
});
