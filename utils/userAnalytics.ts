/**
 * User analytics loading utilities
 * Extracted from UserContext to reduce duplication and improve maintainability
 */

import React from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { cacheAnalytics, getCachedAnalytics } from './offlineCache';
import { UserSummary, AppUser } from '../types/api';
import { logger } from './logger';

// User action types (matching UserContext)
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<AppUser> }
  | { type: 'SET_ANALYTICS'; payload: UserSummary | null }
  | { type: 'SET_ANALYTICS_LOADING'; payload: boolean };

interface LoadAnalyticsOptions {
  userId: string;
  user: AppUser;
  dispatch: React.Dispatch<UserAction>;
  loadingRef: React.MutableRefObject<Promise<UserSummary | null> | null>;
  preloadWrapped?: boolean;
}

/**
 * Load user analytics and update context state
 * Handles caching, error recovery, and wrapped analytics preloading
 * Prevents duplicate concurrent loads using a ref
 * @param options - Configuration object for loading analytics
 * @param options.userId - The user ID to load analytics for
 * @param options.user - Current user object
 * @param options.dispatch - Redux-style dispatch function for state updates
 * @param options.loadingRef - Ref to track in-flight requests
 * @param options.preloadWrapped - Whether to preload wrapped analytics in background (default: true)
 * @returns Promise resolving to UserSummary or null if loading fails
 */
export const loadUserAnalytics = async ({
  userId,
  user,
  dispatch,
  loadingRef,
  preloadWrapped = true,
}: LoadAnalyticsOptions): Promise<UserSummary | null> => {
  // Prevent duplicate loads
  if (loadingRef.current) {
    return loadingRef.current;
  }

  dispatch({ type: 'SET_ANALYTICS_LOADING', payload: true });

  const analyticsPromise = analyticsApi
    .getUserSummary(userId, false)
    .then((summary) => {
      // Update analytics state
      dispatch({ type: 'SET_ANALYTICS', payload: summary });

      // Cache for offline use
      cacheAnalytics(userId, summary).catch(() => {
        // Silently fail caching - not critical
      });

      // Update user's totalSpent from the summary data
      if (summary.totalSpent !== user.totalSpent) {
        dispatch({
          type: 'UPDATE_USER_DATA',
          payload: {
            totalSpent: summary.totalSpent,
            receiptCount: summary.totalReceipts,
          },
        });
      }

      // Preload wrapped analytics if user has data
      if (preloadWrapped) {
        const hasData = summary.totalReceipts > 0 || summary.totalSpent > 0;
        if (hasData) {
          // Preload wrapped analytics in background (don't await)
          analyticsApi
            .getUserSummary(userId, true)
            .then((wrappedSummary) => {
              // Always update analytics with the wrapped summary (it has all the data)
              dispatch({ type: 'SET_ANALYTICS', payload: wrappedSummary });
              dispatch({
                type: 'UPDATE_USER_DATA',
                payload: {
                  totalSpent: wrappedSummary.totalSpent,
                  receiptCount: wrappedSummary.totalReceipts,
                },
              });
              cacheAnalytics(userId, wrappedSummary).catch(() => {
                // Silently fail caching - not critical
              });
            })
            .catch(() => {
              // Silently fail wrapped preload - not critical
            });
        }
      }

      return summary;
    })
    .catch(async (analyticsError) => {
      // Try to use cached data on error
      try {
        const cached = await getCachedAnalytics(userId);
        if (cached) {
          dispatch({ type: 'SET_ANALYTICS', payload: cached });
          return cached;
        }
      } catch {
        // Silently fail cache retrieval
      }

      logger.warn('Failed to load analytics:', analyticsError);
      return null;
    })
    .finally(() => {
      loadingRef.current = null;
      dispatch({ type: 'SET_ANALYTICS_LOADING', payload: false });
    });

  // Store promise in ref to prevent duplicate loads
  loadingRef.current = analyticsPromise;

  return analyticsPromise;
};

