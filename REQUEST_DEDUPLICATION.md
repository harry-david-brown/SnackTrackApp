# Request Deduplication - Fixing Duplicate API Calls

## Problem Statement

The app is making **10-11 simultaneous duplicate API calls every 15 minutes** when iOS performs background fetch or app state restoration. This happens even when the user isn't actively using the app.

### Impact
- **Performance**: Unnecessary server load
- **Scalability**: With 1,000 users, this could mean 10,000+ duplicate requests every 15 minutes
- **User Experience**: Potential rate limiting, slower responses, battery drain
- **Cost**: Unnecessary API calls increase infrastructure costs

### Root Cause

When iOS restores the app from background (every ~15 minutes), multiple React components mount simultaneously:
1. `UserContext` loads user data and calls `analyticsApi.getUserSummary()`
2. `DashboardScreen` calls `loadAnalytics()`
3. `WrappedJourneyScreen` calls `analyticsApi.getUserSummary()`
4. `UploadScreen` may trigger refreshes
5. Other components that use `useUser()` hook

Each component independently makes the same API call because there's no mechanism to:
- Detect that an identical request is already in-flight
- Share the result of an in-flight request
- Prevent duplicate calls within a short time window

## Solution: Request Deduplication

Implement a request deduplication system that:
1. **Tracks in-flight requests** by a unique key (URL + params)
2. **Returns the same Promise** for identical concurrent requests
3. **Clears the cache** after the request completes
4. **Prevents duplicate calls** within a short time window (e.g., 1-2 seconds)

## Implementation Plan

### Step 1: Create Request Deduplication Utility

Create `utils/requestDeduplication.ts`:

```typescript
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
```

### Step 2: Update `analyticsApi.ts`

Modify `getUserSummary` to use deduplication:

```typescript
import api from './api';
import { UserSummary } from '../types/api';
import { deduplicateRequest } from '../utils/requestDeduplication';

export const analyticsApi = {
  // Get user summary with analytics
  getUserSummary: async (userId: string, includeWrapped: boolean = false): Promise<UserSummary> => {
    return deduplicateRequest(
      'GET',
      `/users/${userId}/summary`,
      async () => {
        try {
          const params = includeWrapped ? '?includeWrapped=true' : '';
          const response = await api.get(`/users/${userId}/summary${params}`);
          const data = response.data;
          
          // Transform the API response to match our UserSummary interface
          const userSummary: UserSummary = {
            userId: data.user.id,
            totalSpent: data.statistics.totalSpent,
            totalReceipts: data.statistics.totalReceipts,
            averageOrderValue: data.statistics.averageSpent,
            topRestaurants: data.statistics.topRestaurants.map((restaurant: any) => ({
              name: restaurant.name,
              count: restaurant.count,
              totalSpent: restaurant.total,
            })),
            monthlyBreakdown: Object.entries(data.statistics.monthlyBreakdown).map(([month, data]: [string, any]) => ({
              month,
              totalSpent: data.total,
              receiptCount: data.count,
            })),
            refundedReceipts: data.validation.refundedReceipts,
            dataQuality: {
              issues: data.validation.issues,
              recommendations: [
                'Consider uploading more recent data for better insights',
                'Review any refunded receipts for accuracy'
              ],
            },
          };
          
          // Include wrapped analytics if requested and available
          if (includeWrapped && data.wrappedAnalytics) {
            userSummary.wrappedAnalytics = data.wrappedAnalytics;
          }
          
          return userSummary;
        } catch (error) {
          throw error;
        }
      },
      { userId, includeWrapped } // params for key generation
    );
  },
  // ... rest of the methods
};
```

### Step 3: Update `authApi.ts`

Add deduplication to `validateSession`:

```typescript
import { deduplicateRequest } from '../utils/requestDeduplication';

export const authApi = {
  // ... existing methods

  /**
   * Check if the current session is valid
   */
  validateSession: async (): Promise<boolean> => {
    return deduplicateRequest(
      'GET',
      '/auth/validate',
      async () => {
        try {
          const token = await authApi.getValidToken();
          return !!token;
        } catch (error) {
          return false;
        }
      }
    );
  },
  // ... rest of the methods
};
```

### Step 4: Add Guard in `UserContext.tsx`

Add a ref to prevent multiple simultaneous analytics loads:

```typescript
// At the top of UserProvider component
const loadingAnalyticsRef = useRef<Promise<UserSummary | null> | null>(null);

// In loadUserFromStorage function, around line 185:
if (userData && userId) {
  // Validate session
  const isValid = await authApi.validateSession();
  
  if (isValid) {
    // ... existing user setup code ...
    
    dispatch({ type: 'SET_USER', payload: userWithSpending });
    
    // Prevent duplicate analytics loads
    if (!loadingAnalyticsRef.current) {
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
      
      loadingAnalyticsRef.current = analyticsApi.getUserSummary(userId, false)
        .then((summary) => {
          dispatch({ type: 'SET_ANALYTICS', payload: summary });
          cacheAnalytics(userId, summary).catch(() => {});
          
          // Update user's totalSpent
          if (summary.totalSpent !== userWithSpending.totalSpent) {
            dispatch({ type: 'UPDATE_USER_DATA', payload: { 
              totalSpent: summary.totalSpent,
              receiptCount: summary.totalReceipts 
            }});
          }
          
          // Preload wrapped data if needed
          if (summary.totalReceipts > 0) {
            analyticsApi.getUserSummary(userId, true)
              .then((wrappedSummary) => {
                dispatch({ type: 'SET_ANALYTICS', payload: wrappedSummary });
                // ... rest of wrapped summary handling
              })
              .catch(() => {});
          }
          
          return summary;
        })
        .catch((analyticsError) => {
          // ... error handling
          return null;
        })
        .finally(() => {
          loadingAnalyticsRef.current = null;
          dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
        });
    }
  }
}
```

### Step 5: Update `loadAnalytics` in UserContext

Add similar guard to `loadAnalytics` function:

```typescript
const loadAnalytics = async (includeWrapped: boolean = false): Promise<UserSummary | null> => {
  if (!state.user) return null;

  // Prevent duplicate loads
  if (loadingAnalyticsRef.current) {
    return loadingAnalyticsRef.current;
  }

  try {
    dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });
    
    // The deduplication in analyticsApi will handle concurrent calls
    const summary = await analyticsApi.getUserSummary(state.user.id, includeWrapped);
    dispatch({ type: 'SET_ANALYTICS', payload: summary });
    
    // ... rest of the function
  } catch (error: any) {
    // ... error handling
  } finally {
    dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
  }
};
```

## Testing

### Manual Testing
1. **Enable debug logging** in `requestDeduplication.ts` to see deduplication in action
2. **Simulate background fetch** by:
   - Opening the app
   - Backgrounding it (home button)
   - Waiting 15 minutes or using Xcode to trigger background fetch
   - Check network logs for duplicate requests

### Expected Behavior
- **Before**: 10-11 simultaneous requests to `/users/:id/summary`
- **After**: 1 request, with 9-10 requests deduplicated (returning the same promise)

### Verification
- Check Railway logs - should see only 1 request per endpoint per time window
- Check React Native debugger - should see deduplication logs in console
- Monitor server load - should see significant reduction in duplicate requests

## Additional Considerations

### Cache Duration
The `DEDUP_WINDOW` of 2 seconds should be sufficient for:
- React component mounting delays
- iOS background fetch timing
- Network request initiation

If you see requests still being duplicated, consider:
- Increasing `DEDUP_WINDOW` to 3-5 seconds
- Adding component-level guards (refs) in addition to API-level deduplication

### Memory Management
The `pendingRequests` Map will automatically clear entries after requests complete. However, if you want to be extra safe:
- Add a cleanup function that removes stale entries periodically
- Clear the map on app background/foreground transitions

### Error Handling
The deduplication utility properly handles errors:
- Failed requests are removed from cache
- All subscribers receive the error (not just the first)
- No memory leaks from stuck promises

## Priority

**HIGH** - This should be implemented before scaling to thousands of users to prevent:
- Server overload
- Rate limiting issues
- Unnecessary infrastructure costs
- Poor user experience

## Related Files

- `services/analyticsApi.ts` - Main API service to update
- `services/authApi.ts` - Session validation to deduplicate
- `contexts/UserContext.tsx` - Add component-level guards
- `utils/requestDeduplication.ts` - New utility file to create

## Questions?

If you have questions about implementation, reach out to the backend team or check the existing token refresh deduplication pattern in `services/api.ts` (lines 33-44) for reference.

