import { useEffect, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { getPendingOperations, removeOperation, incrementRetryCount, PendingOperation } from '../utils/offlineCache';

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
          console.log(`Operation ${operation.id} exceeded max retries, removing`);
          await removeOperation(operation.id);
          continue;
        }

        // Process operation based on type
        await processOperation(operation);
        
        // Success - remove from queue
        await removeOperation(operation.id);
        console.log(`✅ Synced operation: ${operation.type}`);
        
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        // Increment retry count
        await incrementRetryCount(operation.id);
      }
    }

    setIsSyncing(false);
    await checkPendingCount();
  };

  const processOperation = async (operation: PendingOperation): Promise<void> => {
    switch (operation.type) {
      case 'csv_upload':
        // Would implement CSV upload retry here
        // await csvApi.importCsv(operation.data.userId, operation.data.file);
        throw new Error('CSV upload retry not implemented yet');
        
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

