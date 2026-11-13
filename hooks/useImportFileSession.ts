import { useFlowAttemptScope } from './useFlowAttemptScope';
import { emptyFileSubmission, type FileSubmissionState } from '@features/import-flow/fileSubmissionState';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ExportProvider, ImportJourneyContext, ImportOperation } from '@features/import-flow/contracts';
import { resolveExportUploadLimitNotice } from '@features/import-flow/exportUploadLimit';
import type { NativeUploadFile } from '@services/api';
import { useUser } from '@contexts/UserContext';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useExportImport } from '@hooks/useExportImport';
import { showSimpleAlert } from '@utils/platformAlert';
import { parseApiError } from '@utils/errorUtils';
import { ImportFileCacheSession, prepareImportFileCache } from '@services/importFileCache';

export const importFileIdentity = (provider: ExportProvider, file: NativeUploadFile) => JSON.stringify([provider, file.uri, file.name, file.size, file.type]);

/** Session-only file ownership. Back/help retain the file; no bytes or commands are persisted. */
export function useImportFileSession(provider: ExportProvider, journeyContext: ImportJourneyContext, importBlocked = false, activeOperation?: ImportOperation | null, statusUnavailable = false) {
  const { state } = useUser();
  const network = useNetworkStatus();
  const upload = useExportImport();
  const scope = useFlowAttemptScope(JSON.stringify([state.user?.id, provider]));
  const [snapshot, setSnapshot] = useState<{ scope: typeof scope; value: FileSubmissionState }>({ scope, value: emptyFileSubmission });
  const current = snapshot.scope === scope ? snapshot.value : emptyFileSubmission;
  const { file } = current;
  const operation = current.phase === 'accepted' ? current.operation : null;
  const choosing = current.phase === 'choosing';
  const submitting = current.phase === 'submitting';
  const update = useCallback((value: FileSubmissionState) => setSnapshot({ scope, value }), [scope]);
  const cache = useRef(new ImportFileCacheSession());
  useEffect(() => {
    const session = new ImportFileCacheSession();
    cache.current = session;
    void prepareImportFileCache();
    return () => session.close();
  }, [scope]);
  const offline = network.type === 'none' || network.isConnected === false || network.isInternetReachable === false;
  const resetUpload = upload.reset;
  const previousScope = useRef(scope);
  useEffect(() => {
    if (previousScope.current === scope) return;
    previousScope.current = scope;
    resetUpload();
  }, [scope, resetUpload]);
  useEffect(() => {
    if (!choosing && !submitting && file && activeOperation && activeOperation.id === upload.retryOperationId && activeOperation.status !== 'awaiting_upload') {
      update({ phase: 'accepted', file: null, operation: activeOperation });
      cache.current.release(file.uri);
    }
  }, [activeOperation, file, upload.retryOperationId, submitting, choosing, update]);
  const choose = useCallback(async (): Promise<NativeUploadFile | null> => {
    if (!state.user) { showSimpleAlert('Log in required', 'Log in before adding your delivery history.'); return null; }
    const attempt = scope.begin();
    if (attempt === null) return null;
    const sessionCache = cache.current;
    let pickedUri: string | undefined;
    let retained = false;
    update({ phase: 'choosing', file });
    try {
      await prepareImportFileCache();
      if (!scope.owns(attempt)) return null;
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'text/csv', 'text/comma-separated-values', 'application/csv'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return null;
      const asset = result.assets[0];
      pickedUri = asset.uri;
      if (!sessionCache.claim(asset.uri)) return null;
      const zip = asset.name.toLowerCase().endsWith('.zip');
      if (!zip && !asset.name.toLowerCase().endsWith('.csv')) { showSimpleAlert('Choose the original download', 'Choose the ZIP or supported CSV from Uber Eats or DoorDash.'); return null; }
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (!scope.owns(attempt)) return null;
      const size = info.exists && typeof info.size === 'number' ? info.size : 0;
      if (size <= 0) { showSimpleAlert('File could not be read', 'Choose the original downloaded file again.'); return null; }
      if (size > (zip ? 50 : 10) * 1024 * 1024) { showSimpleAlert('File is too large', `${zip ? 'ZIP' : 'CSV'} files can be up to ${zip ? '50' : '10'} MB.`); return null; }
      if (!scope.owns(attempt)) return null;
      const next = { uri: asset.uri, name: asset.name, size, type: zip ? 'application/zip' : 'text/csv' };
      if (!file || importFileIdentity(provider, file) !== importFileIdentity(provider, next)) resetUpload();
      if (file && file.uri !== next.uri) sessionCache.release(file.uri);
      retained = true;
      update({ phase: 'selected', file: next });
      return next;
    } catch {
      if (scope.owns(attempt)) {
        showSimpleAlert('Could not open your file', 'Try choosing the original download again. Your previous selection is still available.');
      }
      return null;
    }
    finally {
      if (pickedUri && !retained && (pickedUri !== file?.uri || !scope.owns(attempt))) sessionCache.release(pickedUri);
      if (scope.owns(attempt)) {
        if (!retained) update(current);
        scope.finish(attempt);
      }
    }
  }, [file, current, provider, resetUpload, state.user, scope, update]);
  const submit = useCallback(async (selectedFile: NativeUploadFile | null = file): Promise<ImportOperation | null> => {
    if (!selectedFile || !state.user || importBlocked || statusUnavailable) return null;
    if (offline) { showSimpleAlert('You’re offline', 'Your file is selected. Reconnect to import it.'); return null; }
    const attempt = scope.begin();
    if (attempt === null) return null;
    update({ phase: 'submitting', file: selectedFile });
    const sessionCache = cache.current;
    sessionCache.holdForUpload(selectedFile.uri);
    try {
      const info = await FileSystem.getInfoAsync(selectedFile.uri);
      if (!scope.owns(attempt)) return null;
      if (!info.exists || typeof info.size !== 'number' || info.size !== selectedFile.size) {
        sessionCache.release(selectedFile.uri);
        update(emptyFileSubmission);
        resetUpload(); showSimpleAlert('Choose the file again', 'This file is no longer available or has changed. Select the original download again.'); return null;
      }
      const start = provider === 'uber_eats' ? upload.importUberEatsFile : upload.importDoorDashFile;
      const accepted = await start({ userId: state.user.id, file: selectedFile, journeyContext });
      sessionCache.release(selectedFile.uri);
      if (!scope.owns(attempt)) return null;
      update({ phase: 'accepted', file: null, operation: accepted });
      return accepted;
    } catch (error) {
      if (!scope.owns(attempt)) return null;
      update({ phase: 'uncertain', file: selectedFile });
      const parsed = parseApiError(error);
      if (parsed.code === 'EXPORT_UPLOAD_RATE_LIMITED') return null;
      showSimpleAlert('Could not finish submitting your file', `${parsed.message} Your selection is still here. Try this file again to check its submission before starting another upload.`);
      return null;
    } finally { sessionCache.finishUpload(); scope.finish(attempt); }
  }, [file, importBlocked, journeyContext, offline, provider, resetUpload, state.user, statusUnavailable, upload, scope, update]);
  const rateLimitNotice = upload.error
    ? resolveExportUploadLimitNotice(parseApiError(upload.error), provider)
    : null;
  return { file, operation, choosing, offline, importBlocked, statusUnavailable, isPending: submitting, progress: upload.uploadProgress, error: upload.error, rateLimitNotice, choose, submit };
}
export type ImportFileSession = ReturnType<typeof useImportFileSession>;
