import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@constants/theme';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useExportImport } from '@hooks/useExportImport';
import { parseApiError } from '@utils/errorUtils';
import { captureException } from '@utils/sentry';
import { showAlert } from '@utils/platformAlert';
import type { ExportProvider, ImportOperation } from '@features/import-flow/contracts';
import { AppButton } from '@components/ui/AppButton';

interface UberDataUploadProps {
  provider?: ExportProvider;
  onUploadSuccess?: (result: ImportOperation) => void | Promise<void>;
  onUploadError?: (error: string) => void | Promise<void>;
  autoOpenToken?: string | null;
  onAutoOpenConsumed?: () => void;
}

interface SelectedArchive {
  name: string;
  size: number;
  uri: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return 'Unknown size';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const validateAsset = (asset: DocumentPicker.DocumentPickerAsset): string | null => {
  const name = asset.name.toLowerCase();
  if (!name.endsWith('.zip') && !name.endsWith('.csv')) {
    return 'Choose the original ZIP or CSV file from Uber Eats or DoorDash.';
  }
  const maxBytes = name.endsWith('.zip') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (asset.size && asset.size > maxBytes) {
    return `${name.endsWith('.zip') ? 'ZIP' : 'CSV'} files must be smaller than ${name.endsWith('.zip') ? '50' : '10'} MB.`;
  }
  return null;
};

export function ExportDataUpload({
  provider = 'uber_eats',
  onUploadSuccess,
  onUploadError,
  autoOpenToken = null,
  onAutoOpenConsumed,
}: UberDataUploadProps) {
  const { state } = useUser();
  const network = useNetworkStatus();
  const exportImport = useExportImport();
  const [selectedArchive, setSelectedArchive] = useState<SelectedArchive | null>(null);
  const lastAutoOpenToken = useRef<string | null>(null);
  const isOffline = network.type === 'none'
    || network.isConnected === false
    || network.isInternetReachable === false;

  const uploadArchive = useCallback(async (archive: SelectedArchive) => {
    if (!state.user || exportImport.isPending) return;
    if (isOffline) {
      showAlert('No internet connection', 'Reconnect and try adding the archive again.');
      return;
    }
    try {
      const fileInfo = await FileSystem.getInfoAsync(archive.uri);
      const measuredSize = fileInfo?.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
      if (measuredSize <= 0) {
        showAlert('Archive could not be read', 'SnackTrack could not determine this file’s size. Choose the original downloaded file again.');
        return;
      }
      const maximumBytes = archive.name.toLowerCase().endsWith('.zip') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (measuredSize > maximumBytes) {
        showAlert('File is too large', `${archive.name.toLowerCase().endsWith('.zip') ? 'ZIP' : 'CSV'} files must be smaller than ${maximumBytes / 1024 / 1024} MB.`);
        return;
      }
      const measuredArchive = { ...archive, size: measuredSize };
      setSelectedArchive(measuredArchive);
      const isZip = archive.name.toLowerCase().endsWith('.zip');
      const importFile = provider === 'uber_eats' ? exportImport.importUberEatsFile : exportImport.importDoorDashFile;
      const result = await importFile({
        userId: state.user.id,
        file: {
          uri: measuredArchive.uri,
          type: isZip ? 'application/zip' : 'text/csv',
          name: measuredArchive.name,
          size: measuredArchive.size,
        },
      });
      setSelectedArchive(null);
      await onUploadSuccess?.(result);
    } catch (error: unknown) {
      const parsedError = parseApiError(error);
      if (parsedError.isRetryable || parsedError.type === 'server' || parsedError.type === 'network') {
        captureException(error instanceof Error ? error : new Error(parsedError.message), {
          context: 'ExportDataUpload',
          fileSize: archive.size,
          errorType: parsedError.type,
          statusCode: parsedError.statusCode,
        });
      }
      const noOrders = parsedError.code === 'NO_VALID_EXPORT_ORDERS';
      showAlert(
        noOrders ? 'No supported orders found' : 'Archive could not be added',
        noOrders
              ? `Confirm this is the original ${provider === 'uber_eats' ? 'Uber Eats' : 'DoorDash'} archive. If your account should contain orders, request a newer archive.`
          : `${parsedError.message} Your existing SnackTrack history is unchanged.`,
      );
      await onUploadError?.(parsedError.message);
    }
  }, [exportImport, isOffline, onUploadError, onUploadSuccess, provider, state.user]);

  const chooseArchive = useCallback(async () => {
    if (!state.user) {
      showAlert('Log in required', 'Log in before adding a delivery history file.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed', 'text/csv', 'application/csv'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const validationError = validateAsset(asset);
      if (validationError) {
        showAlert('Choose a delivery history file', validationError);
        return;
      }
      await uploadArchive({ name: asset.name, size: asset.size ?? 0, uri: asset.uri });
    } catch {
      showAlert('Could not open your files', 'Try again and choose the original ZIP downloaded from Uber Eats or DoorDash.');
    }
  }, [state.user, uploadArchive]);

  useEffect(() => {
    if (!autoOpenToken || lastAutoOpenToken.current === autoOpenToken) return;
    lastAutoOpenToken.current = autoOpenToken;
    onAutoOpenConsumed?.();
    void chooseArchive();
  }, [autoOpenToken, chooseArchive, onAutoOpenConsumed]);

  if (exportImport.isPending && selectedArchive) {
    return (
      <View style={styles.processing} accessibilityLiveRegion="polite" accessibilityLabel={`Adding ${selectedArchive.name}`}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <View style={styles.processingCopy}>
          <Text style={styles.processingTitle}>{exportImport.uploadProgress < 1 ? 'Uploading your history…' : 'Queued for import'}</Text>
          <Text style={styles.processingFile} numberOfLines={1}>{selectedArchive.name}</Text>
          <Text style={styles.processingHint}>{exportImport.uploadProgress < 1 ? `${Math.round(exportImport.uploadProgress * 100)}% uploaded` : 'You can leave this screen. SnackTrack will finish in the background.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      {selectedArchive ? (
        <View style={styles.selectedFile}>
          <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
          <View style={styles.selectedCopy}>
            <Text style={styles.fileName} numberOfLines={1}>{selectedArchive.name}</Text>
            <Text style={styles.fileSize}>{formatFileSize(selectedArchive.size)}</Text>
          </View>
        </View>
      ) : null}
      <AppButton
        label={selectedArchive ? 'Try this file again' : 'Choose export file'}
        icon={selectedArchive ? 'refresh-outline' : 'cloud-upload-outline'}
        disabled={isOffline}
        onPress={selectedArchive ? () => void uploadArchive(selectedArchive) : () => void chooseArchive()}
      />
      {isOffline ? <Text style={styles.offline}>Reconnect to the internet before choosing the file.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  processing: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.input, backgroundColor: Colors.infoBg, borderWidth: 1, borderColor: Colors.infoBorder },
  processingCopy: { flex: 1 },
  processingTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  processingFile: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  processingHint: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 5 },
  selectedFile: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.input, backgroundColor: Colors.slate50, borderWidth: 1, borderColor: Colors.slate200 },
  selectedCopy: { flex: 1 },
  fileName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  fileSize: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  offline: { color: Colors.warningDeep, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});

export const UberDataUpload = ExportDataUpload;
export default ExportDataUpload;
