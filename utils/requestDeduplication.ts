/**
 * Request deduplication utility
 * Prevents duplicate simultaneous API calls by caching in-flight requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// Cache of in-flight requests
const pendingRequests = new Map<string, PendingRequest>();

// Time window for deduplication (milliseconds)
const DEDUP_WINDOW = 2000; // 2 seconds

/**
 * Generate a unique key for a request
 */
function getRequestKey(method: string, url: string, params?: any): string {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramsStr}`;
}

/**
 * Deduplicate a request - if an identical request is in-flight, return the same promise
 */
export function deduplicateRequest<T>(
  method: string,
  url: string,
  requestFn: () => Promise<T>,
  params?: any
): Promise<T> {
  const key = getRequestKey(method, url, params);
  const now = Date.now();

  // Check if there's an in-flight request
  const existing = pendingRequests.get(key);
  if (existing) {
    const age = now - existing.timestamp;
    // If request is recent (within dedup window), return the same promise
    if (age < DEDUP_WINDOW) {
      if (__DEV__) {
        console.log(`🔄 Deduplicating request: ${key} (age: ${age}ms)`);
      }
      return existing.promise;
    } else {
      // Request is stale, remove it
      pendingRequests.delete(key);
    }
  }

  // Create new request
  const promise = requestFn()
    .then((result) => {
      // Remove from cache on success
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove from cache on error
      pendingRequests.delete(key);
      throw error;
    });

  // Cache the promise
  pendingRequests.set(key, {
    promise,
    timestamp: now,
  });

  return promise;
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

