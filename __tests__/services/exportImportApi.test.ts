import * as FileSystem from 'expo-file-system/legacy';
import { exportImportApi, type NativeUploadFile } from '@services/api';
import { importOperationsApi } from '@services/importOperationsApi';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: jest.fn(),
}));
jest.mock('@services/importOperationsApi', () => ({
  importOperationsApi: {
    createUberEatsUploadIntent: jest.fn(),
    createDoorDashUploadIntent: jest.fn(),
    submitUpload: jest.fn(),
  },
}));
jest.mock('@utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn(),
}));

describe('exportImportApi provider uploads', () => {
  const userId = '5dbade07-0542-4ad9-b89d-abdaad15cd01';
  const file: NativeUploadFile = {
    uri: 'file:///downloads/export.zip',
    name: 'export.zip',
    type: 'application/zip',
    size: 1024,
  };
  const operation = {
    id: '67bce5bc-436e-4c4f-9c0f-93880b5ced9a',
    kind: 'export_file' as const,
    trigger: 'user' as const,
    status: 'awaiting_upload' as const,
    phase: 'awaiting_upload',
    progress: 0,
    result: null,
    errorCode: null,
    errorMessage: null,
    attempts: 0,
    provider: 'uber_eats' as const,
    createdAt: '2026-09-02T12:00:00.000Z',
    queuedAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: '2026-09-02T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateAndAuthorizeUserId as jest.Mock).mockResolvedValue(userId);
    (importOperationsApi.createUberEatsUploadIntent as jest.Mock).mockResolvedValue({
      operation,
      uploadUrl: 'http://storage.test/upload',
      headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) },
      expiresAt: '2026-09-02T12:15:00.000Z',
    });
    (importOperationsApi.submitUpload as jest.Mock).mockResolvedValue({ ...operation, status: 'pending_dispatch' });
  });

  it('uploads directly and submits the durable operation', async () => {
    const uploadAsync = jest.fn().mockResolvedValue({ status: 200 });
    (FileSystem.createUploadTask as jest.Mock).mockReturnValue({ uploadAsync });

    await expect(exportImportApi.importUberEatsFile(userId, file)).resolves.toMatchObject({
      id: operation.id,
      status: 'pending_dispatch',
    });
    expect(importOperationsApi.createUberEatsUploadIntent).toHaveBeenCalledWith(file);
    expect(FileSystem.createUploadTask).toHaveBeenCalledWith(
      'http://storage.test/upload',
      file.uri,
      expect.objectContaining({ httpMethod: 'PUT', headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) } }),
      expect.any(Function),
    );
    expect(importOperationsApi.submitUpload).toHaveBeenCalledWith(operation.id);
  });

  it('does not submit when object storage rejects the upload', async () => {
    (FileSystem.createUploadTask as jest.Mock).mockReturnValue({
      uploadAsync: jest.fn().mockResolvedValue({ status: 503 }),
    });

    await expect(exportImportApi.importUberEatsFile(userId, file)).rejects.toThrow('secure import storage');
    expect(importOperationsApi.submitUpload).not.toHaveBeenCalled();
  });
});
