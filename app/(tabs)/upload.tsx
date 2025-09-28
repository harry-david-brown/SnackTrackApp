import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import CSVUpload from '../../components/CSVUpload';

export default function UploadScreen() {
  const { state, refreshUserData } = useUser();

  const handleUploadSuccess = async (receiptsCount: number) => {
    // Refresh user data to show updated spending
    await refreshUserData();
    
    Alert.alert(
      'Upload Complete! 🎉',
      `Successfully imported ${receiptsCount} receipts. Your spending data has been updated!`,
      [{ text: 'Awesome!', style: 'default' }]
    );
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>📤 Upload CSV</Text>
          <Text style={styles.subtitle}>Import your Uber Eats order history</Text>
          
          {/* Upload Section */}
          <View style={styles.uploadCard}>
            <Ionicons name="cloud-upload-outline" size={64} color="#007AFF" />
            <Text style={styles.uploadTitle}>Upload Your CSV File</Text>
            <Text style={styles.uploadSubtitle}>
              Upload your Uber Eats CSV export to analyze your spending patterns
            </Text>
            
            <CSVUpload 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </View>
          
          {/* Instructions */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 How to get your CSV:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>Go to Uber Eats website or app</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>Navigate to Account → Order History</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>Click "Download Order History"</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>Upload the CSV file using the button above</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>✨ What you'll get:</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
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
});
