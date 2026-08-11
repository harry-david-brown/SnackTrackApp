import { Colors } from '@/constants/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  InteractionManager,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { csvApi } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { parseApiError } from '../../utils/errorUtils';
import { captureException } from '../../utils/sentry';
import { showAlert } from '../../utils/alerts';

interface UberDataUploadProps {
  onUploadSuccess?: (receiptsCount: number) => void;
  onUploadError?: (error: string) => void;
  autoOpenToken?: string | null;
  onAutoOpenConsumed?: () => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  fileSize: number | null;
  fileUri: string | null;
}

export const UberDataUpload: React.FC<UberDataUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  autoOpenToken = null,
  onAutoOpenConsumed,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    fileName: null,
    fileSize: null,
    fileUri: null,
  });
  const [showModal, setShowModal] = useState(false);
  const lastAutoOpenTokenRef = useRef<string | null>(null);
  const { state } = useUser();
  const networkHookStatus = useNetworkStatus();
  
  // Use hook status directly - it updates immediately via event listener
  // Also check connection type for immediate offline detection (type: 'none' means offline)
  const isOffline = networkHookStatus.type === 'none' || 
                    networkHookStatus.isConnected === false || 
                    networkHookStatus.isInternetReachable === false;
  
  const isConnected = !isOffline;
  const isInternetReachable = networkHookStatus.isInternetReachable ?? true;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = useCallback((file: DocumentPicker.DocumentPickerResult): boolean => {
    if (file.canceled || !file.assets || file.assets.length === 0) {
      return false;
    }

    const asset = file.assets[0];
    const fileName = asset.name.toLowerCase();
    
    // Check file extension - accept both CSV and ZIP
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.zip')) {
      showAlert('Wrong file!', 'Please select a delivery export file in ZIP or CSV format.');
      return false;
    }

    // Check file size (max 50MB for ZIP, 10MB for CSV)
    const maxSize = fileName.endsWith('.zip') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (asset.size && asset.size > maxSize) {
      showAlert(
        'File Too Large',
        `Please select a ${fileName.endsWith('.zip') ? 'ZIP' : 'CSV'} file smaller than ${fileName.endsWith('.zip') ? '50' : '10'}MB.`
      );
      return false;
    }

    return true;
  }, []);

  const handleFilePicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/csv', 'application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (validateFile(result)) {
        const asset = result.assets![0];
        setUploadState(prev => ({
          ...prev,
          fileName: asset.name,
          fileSize: asset.size || 0,
          fileUri: asset.uri,
        }));
        
        setShowModal(true);
      }
    } catch {
      showAlert('Error', 'Failed to select file. Please try again.');
    }
  }, [validateFile]);

  useEffect(() => {
    if (!autoOpenToken || lastAutoOpenTokenRef.current === autoOpenToken) return;

    lastAutoOpenTokenRef.current = autoOpenToken;
    const task = InteractionManager.runAfterInteractions(() => {
      onAutoOpenConsumed?.();
      void handleFilePicker();
    });

    return () => task.cancel();
  }, [autoOpenToken, handleFilePicker, onAutoOpenConsumed]);

  const handleUpload = async () => {
    console.log('🔵 handleUpload called');
    
    if (!state.user) {
      console.log('❌ No user logged in');
      showAlert('Error', 'Please log in first.');
      return;
    }

    console.log('🔵 Network status:', { isConnected, isInternetReachable });
    
    // Check network connection before attempting upload (use hook status - updates immediately)
    if (!isConnected || isInternetReachable === false) {
      console.log('❌ No internet connection');
      showAlert('No Internet Connection', 'Please check your internet connection and try again.');
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      console.log('🔵 Starting upload process...');
      setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

      // Simulate progress updates
      progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      // Upload ZIP or CSV file to API
      // Note: Backend endpoint is still /csv/import for backward compatibility
      // but it accepts both .zip and .csv files
      let response;
      
      if (!uploadState.fileUri || !uploadState.fileName) {
        throw new Error('No file selected for upload');
      }
      
      console.log('🔵 Uploading file to API:', uploadState.fileName);
      console.log('🔵 File URI:', uploadState.fileUri);
      console.log('🔵 Platform:', Platform.OS);
      
      // Create a File object for the API with correct MIME type
      const isZip = uploadState.fileName?.toLowerCase().endsWith('.zip');
      let file: any;
      
      if (Platform.OS === 'web') {
        console.log('🔵 Web platform - fetching blob from URI...');
        // On web, fetch the blob from the URI and create a File object
        const fetchResponse = await fetch(uploadState.fileUri);
        console.log('🔵 Fetch response status:', fetchResponse.status);
        const blob = await fetchResponse.blob();
        console.log('🔵 Blob size:', blob.size, 'type:', blob.type);
        file = new File([blob], uploadState.fileName, {
          type: isZip ? 'application/zip' : 'text/csv',
        });
        console.log('🔵 Created File object:', file.name, file.size, file.type);
      } else {
        // On native, use the standard format
        file = {
          uri: uploadState.fileUri,
          type: isZip ? 'application/zip' : 'text/csv',
          name: uploadState.fileName,
        };
      }
      
      console.log('🔵 Calling csvApi.importCsv...');
      // Upload to API - will throw error if API is unavailable
      response = await csvApi.importCsv(state.user.id, file);
      console.log('✅ File uploaded successfully to API');
      
      if (progressInterval) clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, progress: 100 }));

      setTimeout(() => {
          setUploadState({
            isUploading: false,
            progress: 0,
            fileName: null,
            fileSize: null,
            fileUri: null,
          });
        setShowModal(false);

        // Let the parent component handle the success message
        onUploadSuccess?.(response.importedCount || 0);
      }, 500);

    } catch (error: any) {
      if (progressInterval) clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
      
      // Parse error to get user-friendly message
      const parsedError = parseApiError(error);
      
      // Log errors based on type
      if (parsedError.type === 'validation') {
        // Validation errors are expected user-facing errors - log minimally
        if (__DEV__) {
          console.log('⚠️ Upload validation error:', parsedError.message);
        }
      } else if (parsedError.type === 'server' || parsedError.type === 'network') {
        // Server/network errors need detailed logging for debugging
        if (__DEV__) {
          console.error('❌ Upload error:', error);
          if (error.response) {
            console.error('❌ Response status:', error.response.status);
            console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
          }
        } else {
          console.error('❌ Upload failed:', parsedError.message);
        }
      } else {
        // Unknown errors - log in development
        if (__DEV__) {
          console.error('❌ Upload error:', error);
          console.log('❌ Parsed error:', parsedError);
        } else {
          console.error('❌ Upload failed:', parsedError.message);
        }
      }
      
      if (parsedError.isRetryable || parsedError.type === 'server' || parsedError.type === 'network') {
        captureException(error, {
          context: 'UberDataUpload',
          fileName: uploadState.fileName,
          fileSize: uploadState.fileSize,
          errorType: parsedError.type,
          statusCode: parsedError.statusCode,
        });
      }
      
      // Show user-friendly error message
      // Customize message for "no valid orders" case
      if (parsedError.message.toLowerCase().includes('no valid orders found')) {
        showAlert('No valid orders found in file', 'This is probably a new account');
      } else {
        showAlert('Upload Failed', parsedError.message);
      }
      
      onUploadError?.(parsedError.message);
    }
  };

  const handleCancel = () => {
          setUploadState({
            isUploading: false,
            progress: 0,
            fileName: null,
            fileSize: null,
            fileUri: null,
          });
    setShowModal(false);
  };

  return (
    <>
      {/* Upload Button */}
      <TouchableOpacity 
        style={[styles.uploadButton, uploadState.isUploading && styles.disabledButton]} 
        onPress={handleFilePicker}
        disabled={uploadState.isUploading}
      >
        <View style={styles.uploadButtonContent}>
          <Ionicons name="cloud-upload" size={24} color={Colors.white} />
          <Text style={styles.uploadButtonText}>
            {uploadState.isUploading ? 'Uploading...' : 'Choose Export File'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Upload Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={uploadState.isUploading ? undefined : handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Upload</Text>
            
            <View style={styles.fileInfo}>
              <Ionicons name="document-text" size={32} color={Colors.primary} />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{uploadState.fileName}</Text>
                <Text style={styles.fileSize}>
                  {uploadState.fileSize ? formatFileSize(uploadState.fileSize) : 'Unknown size'}
                </Text>
              </View>
            </View>

            {uploadState.isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.uploadingText}>Uploading and processing...</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${uploadState.progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{uploadState.progress}%</Text>
              </View>
            ) : (
              <View style={styles.confirmButtons}>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.cancelButton]} 
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.confirmButton, 
                    styles.uploadConfirmButton,
                    (!isConnected || isInternetReachable === false) && styles.disabledButton
                  ]} 
                  onPress={handleUpload}
                  disabled={!isConnected || isInternetReachable === false}
                >
                  <Text style={styles.uploadConfirmButtonText}>
                    {(!isConnected || isInternetReachable === false) ? 'No Connection' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.alpha(Colors.black, 0.5),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.textPrimary,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.slate150,
  },
  uploadConfirmButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.gray400,
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  uploadConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default UberDataUpload;
