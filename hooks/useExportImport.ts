import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportImportApi, type NativeUploadFile } from '@services/api';
import type { ExportProvider, ImportJourneyContext } from '@features/import-flow/contracts';
import { cacheImportOperation } from '@hooks/useImportOperation';
import { parseApiError } from '@utils/errorUtils';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const generation = useRef(0);
  const identity = useRef<string | null>(null);
  const pendingId = useRef<string | undefined>(undefined);
  useEffect(() => () => { generation.current += 1; }, []);
  const mutation = useMutation({
    mutationFn: (command: ExportImportCommand & { generation: number }) => {
      const attempt = command.generation;
      if (attempt !== generation.current) throw new Error('Upload session was replaced.');
      const current = () => generation.current === attempt;
      const key = JSON.stringify([command.userId, command.provider, command.file.uri, command.file.name, command.file.size, command.file.type]);
      if (identity.current !== key) pendingId.current = undefined;
      identity.current = key;
      return (command.provider === 'uber_eats' ? exportImportApi.importUberEatsFile : exportImportApi.importDoorDashFile)(
        command.userId,
        command.file,
        progress => { if (current()) setUploadProgress(progress); },
        pendingId.current,
        (operation) => {
          if (!current()) return;
          pendingId.current = operation.id;
          setRetryOperationId(operation.id);

          cacheImportOperation(queryClient, command.userId, operation);
        },
        command.journeyContext,
      );
    },
    onMutate: command => { if (command.generation === generation.current) setUploadProgress(0); return command.generation; },
    onError: (error, _command, attempt) => {
      if (attempt !== generation.current) return;
      const code = parseApiError(error).code;
      if (code === 'UPLOAD_NOT_SUBMITTABLE') pendingId.current = undefined;
    },
    onSuccess: async (operation, command, attempt) => {
      if (attempt !== generation.current) return;
      setUploadProgress(1);
      pendingId.current = undefined;

      cacheImportOperation(queryClient, command.userId, operation);
    },
  });

  const resetMutation = mutation.reset;
  const reset = useCallback(() => {
    generation.current += 1;
    identity.current = null;
    pendingId.current = undefined;
    setRetryOperationId(undefined);
    setUploadProgress(0);
    resetMutation();
  }, [resetMutation]);

  return {
    importUberEatsFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'uber_eats', generation: generation.current }),
    importDoorDashFile: (command: Omit<ExportImportCommand, 'provider'>) => mutation.mutateAsync({ ...command, provider: 'doordash', generation: generation.current }),
    retryOperationId,
    isPending: mutation.isPending,
    error: mutation.error,
    uploadProgress,
    reset,
  };
}
