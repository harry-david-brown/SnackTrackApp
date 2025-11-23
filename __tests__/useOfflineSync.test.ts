/**
 * useOfflineSync Hook Tests
 * Tests for offline operation queuing and retry logic
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import * as offlineCache from '../utils/offlineCache';
import { csvApi } from '../services/api';

// Mock dependencies
jest.mock('../hooks/useNetworkStatus');
jest.mock('../utils/offlineCache');
jest.mock('../services/api');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockGetPendingOperations = offlineCache.getPendingOperations as jest.MockedFunction<typeof offlineCache.getPendingOperations>;
const mockRemoveOperation = offlineCache.removeOperation as jest.MockedFunction<typeof offlineCache.removeOperation>;
const mockIncrementRetryCount = offlineCache.incrementRetryCount as jest.MockedFunction<typeof offlineCache.incrementRetryCount>;
const mockImportCsv = csvApi.importCsv as jest.MockedFunction<typeof csvApi.importCsv>;

describe('useOfflineSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    mockGetPendingOperations.mockResolvedValue([]);
  });

  it('should initialize with no pending operations', async () => {
    const { result } = renderHook(() => useOfflineSync());
    
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should check pending count on mount', async () => {
    mockGetPendingOperations.mockResolvedValue([
      { id: '1', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
    ]);
    
    const { result } = renderHook(() => useOfflineSync());
    
    await waitFor(() => {
      expect(mockGetPendingOperations).toHaveBeenCalled();
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it('should sync pending operations when network comes online', async () => {
    const pendingOps = [
      {
        id: '1',
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];
    
    // Start with network online and pending operations
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    // Mock getPendingOperations to return ops initially, then empty after sync
    let callCount = 0;
    mockGetPendingOperations.mockImplementation(() => {
      callCount++;
      // First call: initial check on mount
      // Second call: during sync to get pending ops
      // Third call: after sync to check count (checkPendingCount)
      if (callCount <= 2) {
        return Promise.resolve(pendingOps);
      }
      return Promise.resolve([]);
    });
    
    mockImportCsv.mockResolvedValue({ importedCount: 10, message: 'Success' });
    mockRemoveOperation.mockResolvedValue();
    
    const { result } = renderHook(() => useOfflineSync());
    
    // Wait for sync to complete
    await waitFor(() => {
      expect(mockImportCsv).toHaveBeenCalledWith('user1', pendingOps[0].data.file);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockRemoveOperation).toHaveBeenCalledWith('1');
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingCount).toBe(0);
    }, { timeout: 3000 });
  });

  it('should increment retry count on failure', async () => {
    const pendingOp = {
      id: '1',
      type: 'csv_upload' as const,
      data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    mockGetPendingOperations.mockResolvedValue([pendingOp]);
    mockImportCsv.mockRejectedValue(new Error('Network error'));
    mockIncrementRetryCount.mockResolvedValue();
    
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    const { result } = renderHook(() => useOfflineSync());
    
    await waitFor(() => {
      expect(mockImportCsv).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockIncrementRetryCount).toHaveBeenCalledWith('1');
      expect(mockRemoveOperation).not.toHaveBeenCalled();
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should remove operation after max retries', async () => {
    const pendingOp = {
      id: '1',
      type: 'csv_upload' as const,
      data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      timestamp: Date.now(),
      retryCount: 3, // Max retries exceeded
    };
    
    mockGetPendingOperations.mockResolvedValue([pendingOp]);
    mockRemoveOperation.mockResolvedValue();
    
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    const { result } = renderHook(() => useOfflineSync());
    
    await waitFor(() => {
      expect(mockRemoveOperation).toHaveBeenCalledWith('1');
      expect(mockImportCsv).not.toHaveBeenCalled();
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should handle multiple pending operations', async () => {
    const pendingOps = [
      {
        id: '1',
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://test1.zip', name: 'test1.zip' } },
        timestamp: Date.now(),
        retryCount: 0,
      },
      {
        id: '2',
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://test2.zip', name: 'test2.zip' } },
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];
    
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    // Mock getPendingOperations to return ops initially, then empty after sync
    let callCount = 0;
    mockGetPendingOperations.mockImplementation(() => {
      callCount++;
      // First call: initial check on mount
      // Second call: during sync to get pending ops
      // Third call: after sync to check count (checkPendingCount)
      if (callCount <= 2) {
        return Promise.resolve(pendingOps);
      }
      return Promise.resolve([]);
    });
    
    mockImportCsv
      .mockResolvedValueOnce({ importedCount: 10, message: 'Success' })
      .mockResolvedValueOnce({ importedCount: 20, message: 'Success' });
    mockRemoveOperation.mockResolvedValue();
    
    const { result } = renderHook(() => useOfflineSync());
    
    await waitFor(() => {
      expect(mockImportCsv).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockRemoveOperation).toHaveBeenCalledWith('1');
      expect(mockRemoveOperation).toHaveBeenCalledWith('2');
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingCount).toBe(0);
    }, { timeout: 3000 });
  });

  it('should allow manual sync via syncNow', async () => {
    const pendingOp = {
      id: '1',
      type: 'csv_upload' as const,
      data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    mockGetPendingOperations.mockResolvedValue([pendingOp]);
    mockImportCsv.mockResolvedValue({ importedCount: 10, message: 'Success' });
    mockRemoveOperation.mockResolvedValue();
    
    const { result } = renderHook(() => useOfflineSync());
    
    await act(async () => {
      await result.current.syncNow();
    });
    
    expect(mockImportCsv).toHaveBeenCalled();
    expect(mockRemoveOperation).toHaveBeenCalledWith('1');
  });

  it('should not sync when already syncing', async () => {
    const pendingOp = {
      id: '1',
      type: 'csv_upload' as const,
      data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    mockGetPendingOperations.mockResolvedValue([pendingOp]);
    mockImportCsv.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ importedCount: 10, message: 'Success' }), 100)));
    mockRemoveOperation.mockResolvedValue();
    
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    const { result } = renderHook(() => useOfflineSync());
    
    // Wait for sync to start
    await waitFor(() => {
      expect(result.current.isSyncing).toBe(true);
    });
    
    // Network status changes again (should not trigger another sync)
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'cellular',
    });
    
    // Should still be syncing (only one sync at a time)
    expect(result.current.isSyncing).toBe(true);
  });
});

