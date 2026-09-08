import * as FileSystem from 'expo-file-system/legacy';
import type { ExportProvider, ImportJourneyContext, ImportOperation } from '@features/import-flow/contracts';
import { importOperationsApi } from '@services/importOperationsApi';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

export interface NativeUploadFile {
  readonly uri: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

type ProviderImportFile = (
  userId: string,
  exportFile: NativeUploadFile,
  onProgress?: (progress: number) => void,
  existingOperationId?: string,
  onIntent?: (operation: ImportOperation) => void,
  journeyContext?: ImportJourneyContext,
) => Promise<ImportOperation>;

const importProviderFile = async (
    provider: ExportProvider,
    userId: string,
    exportFile: NativeUploadFile,
    onProgress?: (progress: number) => void,
    existingOperationId?: string,
    onIntent?: (operation: ImportOperation) => void,
    journeyContext: ImportJourneyContext = 'legacy',
  ): Promise<ImportOperation> => {
    await validateAndAuthorizeUserId(userId);
    if (existingOperationId) {
      const existing = await importOperationsApi.get(existingOperationId);
      if (existing.provider !== provider) throw new Error('The pending upload belongs to a different delivery provider.');
      if (['pending_dispatch', 'queued', 'running', 'retrying', 'succeeded'].includes(existing.status)) return existing;
      if (existing.status !== 'awaiting_upload') existingOperationId = undefined;
    }
    const intent = existingOperationId
      ? await importOperationsApi.refreshUploadIntent(existingOperationId)
      : provider === 'uber_eats'
        ? await importOperationsApi.createUberEatsUploadIntent(exportFile, journeyContext)
        : await importOperationsApi.createDoorDashUploadIntent(exportFile, journeyContext);
    if (intent.operation.provider !== provider) throw new Error('The pending upload belongs to a different delivery provider.');
    onIntent?.(intent.operation);
    const task = FileSystem.createUploadTask(
      intent.uploadUrl,
      exportFile.uri,
      {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { ...intent.headers },
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        onProgress?.(totalBytesExpectedToSend > 0 ? totalBytesSent / totalBytesExpectedToSend : 0);
      },
    );
    const upload = await task.uploadAsync();
    if (!upload || upload.status < 200 || upload.status >= 300) {
      throw new Error('The archive could not be uploaded to secure import storage.');
    }
    return importOperationsApi.submitUpload(intent.operation.id);
  };

export const exportImportApi = {
  importUberEatsFile: ((...args) => importProviderFile('uber_eats', ...args)) as ProviderImportFile,
  importDoorDashFile: ((...args) => importProviderFile('doordash', ...args)) as ProviderImportFile,
};
