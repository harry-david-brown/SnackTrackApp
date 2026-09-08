import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportImportApi, type NativeUploadFile } from '@services/api';
import type { ExportProvider, ImportJourneyContext } from '@features/import-flow/contracts';
import { cacheImportOperation } from '@hooks/useImportOperation';
import { parseApiError } from '@utils/errorUtils';
import { useRef, useState } from 'react';

interface ExportImportCommand {
  readonly userId: string;
  readonly file: NativeUploadFile;
  readonly provider: ExportProvider;
  readonly journeyContext?: ImportJourneyContext;
}

/** Owns the single pending state and post-commit cache policy for export uploads. */
export function useExportImport() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryOperationId, setRetryOperationId] = useState<string | undefined>();
  const identity = useRef<string | null>(null);
  const pendingId = useRef<string | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: (command: ExportImportCommand) => {
      const key = JSON.stringify([command.userId, command.provider, command.file.uri, command.file.name, command.file.size, command.file.type]);
      if (identity.current !== key) pendingId.current = undefined;
      identity.current = key;
      return (command.provider === 'uber_eats' ? exportImportApi.importUberEatsFile : exportImportApi.importDoorDashFile)(
        command.userId,
        command.file,
        setUploadProgress,
        pendingId.current,
        (operation) => {
          pendingId.current = operation.id;
          setRetryOperationId(operation.id);

          cacheImportOperation(queryClient, command.userId, operation);
        },
        command.journeyContext,
      );
    },
    onMutate: () => setUploadProgress(0),
    onError: error => {
      const code = parseApiError(error).code;
      if (code === 'UPLOAD_NOT_SUBMITTABLE') pendingId.current = undefined;
    },
    onSuccess: async (operation, command) => {
      setUploadProgress(1);
      pendingId.current = undefined;

      cacheImportOperation(queryClient, command.userId, operation);
    },
  });

  return {
    importUberEatsFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'uber_eats' }),
    importDoorDashFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'doordash' }),
    retryOperationId,
    isPending: mutation.isPending,
    error: mutation.error,
    uploadProgress,
    reset: () => { identity.current = null; pendingId.current = undefined; setRetryOperationId(undefined); mutation.reset(); },
  };
}
