import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSummary } from '../types/api';

const CACHE_KEYS = {
  ANALYTICS: '@snacktrack_analytics_cache',
  LAST_SYNC: '@snacktrack_last_sync',
  PENDING_OPERATIONS: '@snacktrack_pending_operations',
};

const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

export interface PendingOperation {
  id: string;
  type: 'csv_upload' | 'user_update';
  data: any;
  timestamp: number;
  retryCount: number;
}

// Analytics cache
export const cacheAnalytics = async (userId: string, data: UserSummary): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      userId,
    };
    await AsyncStorage.setItem(CACHE_KEYS.ANALYTICS, JSON.stringify(cacheData));
  } catch (error) {
    // Silently fail - caching is not critical
  }
};

export const getCachedAnalytics = async (userId: string): Promise<UserSummary | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.ANALYTICS);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    
    // Check if cache is still valid
    const age = Date.now() - cacheData.timestamp;
    if (age > CACHE_DURATION) {
      return null; // Cache expired
    }

    // Check if cache is for the same user
    if (cacheData.userId !== userId) {
      return null; // Different user
    }

    return cacheData.data;
  } catch (error) {
    return null;
  }
};

export const clearAnalyticsCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.ANALYTICS);
  } catch (error) {
    // Silently fail - not critical
  }
};

// Pending operations queue (for offline support)
export const queueOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
  try {
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
      CACHE_KEYS.ANALYTICS,
      CACHE_KEYS.LAST_SYNC,
      CACHE_KEYS.PENDING_OPERATIONS,
    ]);
  } catch (error) {
    // Silently fail - not critical
  }
};

