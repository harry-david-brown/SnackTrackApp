/**
 * Offline Cache Utilities Tests
 * Tests for offline operation queuing and management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  queueOperation,
  getPendingOperations,
  removeOperation,
  incrementRetryCount,
  PendingOperation,
} from '../utils/offlineCache';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

describe('Offline Cache Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('queueOperation', () => {
    it('should queue a new operation', async () => {
      const operation = {
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      };

      await queueOperation(operation);

      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedOps = JSON.parse(setItemCall[1]);
      
      expect(storedOps).toHaveLength(1);
      expect(storedOps[0].type).toBe('csv_upload');
      expect(storedOps[0].data).toEqual(operation.data);
      expect(storedOps[0].id).toBeDefined();
      expect(storedOps[0].timestamp).toBeDefined();
      expect(storedOps[0].retryCount).toBe(0);
    });

    it('should append to existing operations', async () => {
      const existingOps: PendingOperation[] = [
        {
          id: '1',
          type: 'csv_upload',
          data: { userId: 'user1', file: { uri: 'file://old.zip', name: 'old.zip' } },
          timestamp: Date.now() - 1000,
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingOps));

      const newOperation = {
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://new.zip', name: 'new.zip' } },
      };

      await queueOperation(newOperation);

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedOps = JSON.parse(setItemCall[1]);
      
      expect(storedOps).toHaveLength(2);
      expect(storedOps[0].id).toBe('1');
      expect(storedOps[1].type).toBe('csv_upload');
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const operation = {
        type: 'csv_upload' as const,
        data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
      };

      // Should not throw
      await expect(queueOperation(operation)).resolves.not.toThrow();
    });
  });

  describe('getPendingOperations', () => {
    it('should return empty array when no operations exist', async () => {
      const ops = await getPendingOperations();
      expect(ops).toEqual([]);
    });

    it('should return stored operations', async () => {
      const storedOps: PendingOperation[] = [
        {
          id: '1',
          type: 'csv_upload',
          data: { userId: 'user1', file: { uri: 'file://test.zip', name: 'test.zip' } },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedOps));

      const ops = await getPendingOperations();
      expect(ops).toEqual(storedOps);
    });

    it('should handle invalid JSON gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json');

      const ops = await getPendingOperations();
      expect(ops).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const ops = await getPendingOperations();
      expect(ops).toEqual([]);
    });
  });

  describe('removeOperation', () => {
    it('should remove specified operation', async () => {
      const storedOps: PendingOperation[] = [
        { id: '1', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
        { id: '2', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedOps));

      await removeOperation('1');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const remainingOps = JSON.parse(setItemCall[1]);
      
      expect(remainingOps).toHaveLength(1);
      expect(remainingOps[0].id).toBe('2');
    });

    it('should handle operation not found', async () => {
      const storedOps: PendingOperation[] = [
        { id: '1', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedOps));

      await removeOperation('999');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const remainingOps = JSON.parse(setItemCall[1]);
      
      expect(remainingOps).toHaveLength(1);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(removeOperation('1')).resolves.not.toThrow();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count for specified operation', async () => {
      const storedOps: PendingOperation[] = [
        { id: '1', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
        { id: '2', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 1 },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedOps));

      await incrementRetryCount('1');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedOps = JSON.parse(setItemCall[1]);
      
      expect(updatedOps[0].retryCount).toBe(1);
      expect(updatedOps[1].retryCount).toBe(1); // Unchanged
    });

    it('should handle operation not found', async () => {
      const storedOps: PendingOperation[] = [
        { id: '1', type: 'csv_upload', data: {}, timestamp: Date.now(), retryCount: 0 },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedOps));

      await incrementRetryCount('999');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedOps = JSON.parse(setItemCall[1]);
      
      expect(updatedOps[0].retryCount).toBe(0); // Unchanged
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(incrementRetryCount('1')).resolves.not.toThrow();
    });
  });
});

