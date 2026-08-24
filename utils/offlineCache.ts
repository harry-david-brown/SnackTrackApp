import AsyncStorage from '@react-native-async-storage/async-storage';
const CACHE_KEYS = {
  LAST_SYNC: '@snacktrack_last_sync',
  PENDING_OPERATIONS: '@snacktrack_pending_operations',
};
const resetBlockedUsers = new Set<string>();

export interface PendingUploadFile {
  uri?: string;
  name?: string;
  type?: string;
}

export interface PendingOperation {
  id: string;
  type: 'csv_upload' | 'user_update';
  data: { userId?: string; file?: File | PendingUploadFile; [key: string]: unknown };
  timestamp: number;
  retryCount: number;
}

// Pending operations queue (for offline support)
export const queueOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
  try {
    if (operation.data.userId) resetBlockedUsers.delete(operation.data.userId);
    const pending = await getPendingOperations();
    const newOperation: PendingOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    pending.push(newOperation);
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPERATIONS, JSON.stringify(pending));
  } catch (error) {
    // Silently fail - not critical
  }
};

/** Remove retryable work that could repopulate a freshly reset account. */
export const removePendingOperationsForUser = async (userId: string): Promise<void> => {
  resetBlockedUsers.add(userId);
  const pending = await getPendingOperations();
  await AsyncStorage.setItem(
    CACHE_KEYS.PENDING_OPERATIONS,
    JSON.stringify(pending.filter(operation => operation.data.userId !== userId))
  );
};

/** Re-check immediately before a retry so a reset can cancel an in-memory loop. */
export const shouldProcessPendingOperation = async (operation: PendingOperation): Promise<boolean> => {
  const userId = operation.data.userId;
  if (userId && resetBlockedUsers.has(userId)) return false;
  const pending = await getPendingOperations();
  return pending.some(candidate => candidate.id === operation.id);
};

export const getPendingOperations = async (): Promise<PendingOperation[]> => {
  try {
    const pending = await AsyncStorage.getItem(CACHE_KEYS.PENDING_OPERATIONS);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    return [];
  }
};

export const removeOperation = async (operationId: string): Promise<void> => {
  try {
    const pending = await getPendingOperations();
    const filtered = pending.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPERATIONS, JSON.stringify(filtered));
  } catch (error) {
    // Silently fail - not critical
  }
};

export const incrementRetryCount = async (operationId: string): Promise<void> => {
  try {
    const pending = await getPendingOperations();
    const updated = pending.map(op => 
      op.id === operationId ? { ...op, retryCount: op.retryCount + 1 } : op
    );
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPERATIONS, JSON.stringify(updated));
  } catch (error) {
    // Silently fail - not critical
  }
};

// Last sync timestamp
export const updateLastSync = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    // Silently fail - not critical
  }
};

export const getLastSync = async (): Promise<number | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return lastSync ? parseInt(lastSync, 10) : null;
  } catch (error) {
    return null;
  }
};

// Clear all cache
export const clearAllCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.LAST_SYNC,
      CACHE_KEYS.PENDING_OPERATIONS,
    ]);
  } catch (error) {
    // Silently fail - not critical
  }
};
