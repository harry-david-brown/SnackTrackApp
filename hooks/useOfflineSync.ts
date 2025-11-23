import { useEffect, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { getPendingOperations, removeOperation, incrementRetryCount, PendingOperation } from '../utils/offlineCache';
import { csvApi } from '../services/api';
import { captureException } from '../utils/sentry';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const { isConnected } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check pending operations count
    checkPendingCount();
  }, []);

  useEffect(() => {
    // When network comes back online, sync pending operations
    if (isConnected && !isSyncing) {
      syncPendingOperations();
    }
  }, [isConnected]);

  const checkPendingCount = async () => {
    const pending = await getPendingOperations();
    setPendingCount(pending.length);
  };

  const syncPendingOperations = async () => {
    const pending = await getPendingOperations();
    if (pending.length === 0) {
      setPendingCount(0);
      return;
    }

    setIsSyncing(true);

    for (const operation of pending) {
      try {
        // Skip if max retries exceeded
        if (operation.retryCount >= MAX_RETRIES) {
          await removeOperation(operation.id);
          continue;
        }

        // Process operation based on type
        await processOperation(operation);
        
        // Success - remove from queue
        await removeOperation(operation.id);
        
      } catch (error) {
        // Report sync failures to Sentry
        const errorObj = error instanceof Error ? error : new Error(String(error));
        captureException(errorObj, {
          context: 'useOfflineSync',
          operationType: operation.type,
          operationId: operation.id,
          retryCount: operation.retryCount,
        });
        
        // Increment retry count on failure
        await incrementRetryCount(operation.id);
      }
    }

    setIsSyncing(false);
    await checkPendingCount();
  };

  const processOperation = async (operation: PendingOperation): Promise<void> => {
    switch (operation.type) {
      case 'csv_upload':
        // Retry CSV/ZIP upload
        if (!operation.data?.userId || !operation.data?.file) {
          throw new Error('Invalid upload operation data');
        }
        await csvApi.importCsv(operation.data.userId, operation.data.file);
        break;
        
      case 'user_update':
        // Would implement user update retry here
        throw new Error('User update retry not implemented yet');
        
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  };

  return {
    isSyncing,
    pendingCount,
    syncNow: syncPendingOperations,
  };
}

