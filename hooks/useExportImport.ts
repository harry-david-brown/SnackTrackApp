import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportImportApi, type NativeUploadFile } from '@services/api';
import type { ExportProvider } from '@features/import-flow/contracts';
import { cacheImportOperation } from '@hooks/useImportOperation';
import { useState } from 'react';

interface ExportImportCommand {
  readonly userId: string;
  readonly file: NativeUploadFile;
  readonly provider: ExportProvider;
}

/** Owns the single pending state and post-commit cache policy for export uploads. */
export function useExportImport() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingOperationId, setPendingOperationId] = useState<string | undefined>();
  const mutation = useMutation({
    mutationFn: ({ userId, file, provider }: ExportImportCommand) => (provider === 'uber_eats' ? exportImportApi.importUberEatsFile : exportImportApi.importDoorDashFile)(
      userId,
      file,
      setUploadProgress,
      pendingOperationId,
      (operation) => {
        setPendingOperationId(operation.id);
        cacheImportOperation(queryClient, userId, operation);
      },
    ),
    onMutate: () => setUploadProgress(0),
    onSuccess: async (operation, command) => {
      setUploadProgress(1);
      setPendingOperationId(undefined);
      cacheImportOperation(queryClient, command.userId, operation);
    },
  });

  return {
    importUberEatsFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'uber_eats' }),
    importDoorDashFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'doordash' }),
    isPending: mutation.isPending,
    error: mutation.error,
    uploadProgress,
    reset: mutation.reset,
  };
}
