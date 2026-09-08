import { useCallback, useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ExportProvider, ImportJourneyContext, ImportOperation } from '@features/import-flow/contracts';
import type { NativeUploadFile } from '@services/api';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useExportImport } from '@hooks/useExportImport';
import { showSimpleAlert } from '@utils/platformAlert';
import { parseApiError } from '@utils/errorUtils';

export const importFileIdentity = (provider: ExportProvider, file: NativeUploadFile) => JSON.stringify([provider, file.uri, file.name, file.size, file.type]);

/** Session-only file ownership. Back/help retain the file; no bytes or commands are persisted. */
export function useImportFileSession(provider: ExportProvider, journeyContext: ImportJourneyContext, importBlocked = false, activeOperation?: ImportOperation | null, statusUnavailable = false) {
  const { state } = useUser();
  const network = useNetworkStatus();
  const upload = useExportImport();
  const [file, setFile] = useState<NativeUploadFile | null>(null);
  const [operation, setOperation] = useState<ImportOperation | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const previousOwner = useRef({ provider, userId: state.user?.id });
  const choosingRef = useRef(false);
  const sendingRef = useRef(false);
  const binding = useRef({ provider, userId: state.user?.id });
  binding.current = { provider, userId: state.user?.id };
  const offline = network.type === 'none' || network.isConnected === false || network.isInternetReachable === false;
  const resetUpload = upload.reset;
  useEffect(() => {
    if (previousOwner.current.provider === provider && previousOwner.current.userId === state.user?.id) return;
    previousOwner.current = { provider, userId: state.user?.id };
    setFile(null); setOperation(null); resetUpload();
  }, [provider, resetUpload, state.user?.id]);
  useEffect(() => {
    if (!sendingRef.current && file && activeOperation && activeOperation.id === upload.retryOperationId && activeOperation.status !== 'awaiting_upload') {
      // A refreshed server response can resolve a lost submission response without uploading twice.
      setOperation(activeOperation);
      setFile(null);
    }
  }, [activeOperation, file, upload.retryOperationId, submitting]);
  const choose = useCallback(async () => {
    if (choosingRef.current || sendingRef.current) return;
    if (!state.user) { showSimpleAlert('Log in required', 'Log in before adding your delivery history.'); return; }
    const chosenFor = { provider, userId: state.user.id };
    choosingRef.current = true; setChoosing(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'text/csv', 'application/csv'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const zip = asset.name.toLowerCase().endsWith('.zip');
      if (!zip && !asset.name.toLowerCase().endsWith('.csv')) { showSimpleAlert('Choose the original download', 'Choose the ZIP or supported CSV from Uber Eats or DoorDash.'); return; }
      const info = await FileSystem.getInfoAsync(asset.uri);
      const size = info.exists && typeof info.size === 'number' ? info.size : 0;
      if (size <= 0) { showSimpleAlert('File could not be read', 'Choose the original downloaded file again.'); return; }
      if (size > (zip ? 50 : 10) * 1024 * 1024) { showSimpleAlert('File is too large', `${zip ? 'ZIP' : 'CSV'} files can be up to ${zip ? '50' : '10'} MB.`); return; }
      if (binding.current.provider !== chosenFor.provider || binding.current.userId !== chosenFor.userId) return;
      const next = { uri: asset.uri, name: asset.name, size, type: zip ? 'application/zip' : 'text/csv' };
      if (!file || importFileIdentity(provider, file) !== importFileIdentity(provider, next)) resetUpload();
      setOperation(null); setFile(next);
    } catch { showSimpleAlert('Could not open your file', 'Try choosing the original download again. Your previous selection is still available.'); }
    finally { choosingRef.current = false; setChoosing(false); }
  }, [file, provider, resetUpload, state.user]);
  const submit = useCallback(async () => {
    if (!file || !state.user || sendingRef.current || choosingRef.current || importBlocked || statusUnavailable) return;
    if (offline) { showSimpleAlert('You’re offline', 'Your file is selected. Reconnect to import it.'); return; }
    sendingRef.current = true; setSubmitting(true);
    try {
      const info = await FileSystem.getInfoAsync(file.uri);
      if (!info.exists || typeof info.size !== 'number' || info.size !== file.size) {
        resetUpload(); showSimpleAlert('Choose the file again', 'This file is no longer available or has changed. Select the original download again.'); return;
      }
      if (binding.current.provider !== provider || binding.current.userId !== state.user.id) return;
      const start = provider === 'uber_eats' ? upload.importUberEatsFile : upload.importDoorDashFile;
      const accepted = await start({ userId: state.user.id, file, journeyContext });
      if (binding.current.provider === provider && binding.current.userId === state.user.id) { setFile(null); setOperation(accepted); }
    } catch (error) {
      const parsed = parseApiError(error);
      showSimpleAlert('Could not finish submitting your file', `${parsed.message} Your selection is still here. Try this file again to check its submission before starting another upload.`);
    } finally { sendingRef.current = false; setSubmitting(false); }
  }, [file, importBlocked, journeyContext, offline, provider, resetUpload, state.user, statusUnavailable, upload]);
  return { file, operation, choosing, offline, importBlocked, statusUnavailable, isPending: submitting || upload.isPending, progress: upload.uploadProgress, error: upload.error, choose, submit };
}
export type ImportFileSession = ReturnType<typeof useImportFileSession>;
