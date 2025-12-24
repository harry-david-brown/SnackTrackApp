/**
 * Request Deduplication Unit Tests
 * Tests for the request deduplication utility
 */

import { deduplicateRequest, clearPendingRequests } from '../../utils/requestDeduplication';

// Mock console.log to avoid noise in test output
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

beforeAll(() => {
  // Set __DEV__ to true for testing
  (global as any).__DEV__ = true;
  console.log = mockConsoleLog;
});

afterAll(() => {
  console.log = originalConsoleLog;
  delete (global as any).__DEV__;
});

describe('Request Deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPendingRequests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('deduplicateRequest', () => {
    it('should execute request function when no duplicate exists', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      
      const result = await deduplicateRequest('GET', '/test', requestFn);
      
      expect(requestFn).toHaveBeenCalledTimes(1);
      expect(result).toBe('success');
    });

    it('should return same promise for identical concurrent requests', async () => {
      const requestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn, { id: '123' });
      const promise2 = deduplicateRequest('GET', '/test', requestFn, { id: '123' });
      const promise3 = deduplicateRequest('GET', '/test', requestFn, { id: '123' });
      
      // All promises should be the same instance
      expect(promise1).toBe(promise2);
      expect(promise2).toBe(promise3);
      
      // Request function should only be called once
      expect(requestFn).toHaveBeenCalledTimes(1);
      
      // Advance timers to resolve promises
      jest.advanceTimersByTime(100);
      
      // All promises should resolve to the same value
      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual(['success', 'success', 'success']);
    });

    it('should create separate requests for different URLs', async () => {
      const requestFn1 = jest.fn().mockResolvedValue('result1');
      const requestFn2 = jest.fn().mockResolvedValue('result2');
      
      const promise1 = deduplicateRequest('GET', '/test1', requestFn1);
      const promise2 = deduplicateRequest('GET', '/test2', requestFn2);
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should create separate requests for different methods', async () => {
      const requestFn1 = jest.fn().mockResolvedValue('result1');
      const requestFn2 = jest.fn().mockResolvedValue('result2');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn1);
      const promise2 = deduplicateRequest('POST', '/test', requestFn2);
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should create separate requests for different params', async () => {
      const requestFn1 = jest.fn().mockResolvedValue('result1');
      const requestFn2 = jest.fn().mockResolvedValue('result2');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn1, { id: '123' });
      const promise2 = deduplicateRequest('GET', '/test', requestFn2, { id: '456' });
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and remove from cache', async () => {
      const requestFn = jest.fn().mockRejectedValue(new Error('Request failed'));
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn);
      const promise2 = deduplicateRequest('GET', '/test', requestFn);
      
      // Both should reject with the same error
      await expect(promise1).rejects.toThrow('Request failed');
      await expect(promise2).rejects.toThrow('Request failed');
      
      // Request should only be called once
      expect(requestFn).toHaveBeenCalledTimes(1);
      
      // After error, new request should be allowed
      const requestFn2 = jest.fn().mockResolvedValue('success');
      const promise3 = deduplicateRequest('GET', '/test', requestFn2);
      const result = await promise3;
      
      expect(result).toBe('success');
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should log deduplication in development mode', async () => {
      const requestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      deduplicateRequest('GET', '/test', requestFn);
      deduplicateRequest('GET', '/test', requestFn);
      
      // Advance timers slightly to trigger the deduplication check
      jest.advanceTimersByTime(10);
      
      // Process microtasks
      await Promise.resolve();
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Deduplicating request')
      );
      
      // Clean up
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    it('should allow new request after dedup window expires', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      
      // First request
      const promise1 = deduplicateRequest('GET', '/test', requestFn);
      await promise1;
      
      // Advance time past dedup window (2000ms)
      jest.advanceTimersByTime(2100);
      
      // Second request should create a new call
      const promise2 = deduplicateRequest('GET', '/test', requestFn);
      await promise2;
      
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle requests with no params', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn);
      const promise2 = deduplicateRequest('GET', '/test', requestFn);
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle complex params correctly', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      const params1 = { userId: '123', includeWrapped: true };
      const params2 = { userId: '123', includeWrapped: true };
      const params3 = { userId: '123', includeWrapped: false };
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn, params1);
      const promise2 = deduplicateRequest('GET', '/test', requestFn, params2);
      const promise3 = deduplicateRequest('GET', '/test', requestFn, params3);
      
      await Promise.all([promise1, promise2, promise3]);
      
      // params1 and params2 should be deduplicated, params3 is different
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple concurrent different requests', async () => {
      const requestFn = jest.fn().mockImplementation((url: string) => 
        Promise.resolve(`result-${url}`)
      );
      
      const promises = [
        deduplicateRequest('GET', '/users/1', () => requestFn('/users/1')),
        deduplicateRequest('GET', '/users/2', () => requestFn('/users/2')),
        deduplicateRequest('GET', '/users/3', () => requestFn('/users/3')),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual(['result-/users/1', 'result-/users/2', 'result-/users/3']);
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid sequential requests within window', async () => {
      const requestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 50))
      );
      
      // Make 5 rapid requests
      const promises = Array.from({ length: 5 }, () => 
        deduplicateRequest('GET', '/test', requestFn)
      );
      
      // Advance time to resolve promises
      jest.advanceTimersByTime(50);
      
      await Promise.all(promises);
      
      // All should be deduplicated to one call
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearPendingRequests', () => {
    it('should clear all pending requests', async () => {
      const requestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      // Start a request
      const promise = deduplicateRequest('GET', '/test', requestFn);
      
      // Clear pending requests
      clearPendingRequests();
      
      // Advance timers to resolve first promise
      jest.advanceTimersByTime(100);
      await promise;
      
      // New request should create a new call
      const requestFn2 = jest.fn().mockResolvedValue('success2');
      const promise2 = deduplicateRequest('GET', '/test', requestFn2);
      
      await promise2;
      
      // Both should have been called
      expect(requestFn).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests that resolve immediately', async () => {
      const requestFn = jest.fn().mockResolvedValue('immediate');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn);
      const promise2 = deduplicateRequest('GET', '/test', requestFn);
      
      const results = await Promise.all([promise1, promise2]);
      
      expect(results).toEqual(['immediate', 'immediate']);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle requests with null params', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn, null);
      const promise2 = deduplicateRequest('GET', '/test', requestFn, null);
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle requests with undefined params', async () => {
      const requestFn = jest.fn().mockResolvedValue('success');
      
      const promise1 = deduplicateRequest('GET', '/test', requestFn, undefined);
      const promise2 = deduplicateRequest('GET', '/test', requestFn);
      
      await Promise.all([promise1, promise2]);
      
      // Should be treated as the same (both undefined)
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle very long URLs', async () => {
      const longUrl = '/users/' + 'a'.repeat(1000) + '/summary';
      const requestFn = jest.fn().mockResolvedValue('success');
      
      const promise1 = deduplicateRequest('GET', longUrl, requestFn);
      const promise2 = deduplicateRequest('GET', longUrl, requestFn);
      
      await Promise.all([promise1, promise2]);
      
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });
});

