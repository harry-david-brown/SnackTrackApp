import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Store onboarding per-user to support multiple accounts on same device
const getOnboardingKey = (userId: string | null): string => {
  if (userId) {
    return `@snacktrack_onboarding_completed_${userId}`;
  }
  // Fallback for legacy device-level storage
  return '@snacktrack_onboarding_completed';
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { state: userState } = useUser();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedUserId, setLastCheckedUserId] = useState<string | null>(null);
  
  // Track current userId to detect changes synchronously
  const currentUserId = userState.user?.id || null;
  const isAuthenticated = userState.isAuthenticated && !!userState.user;
  
  useEffect(() => {
    // Check onboarding status when:
    // 1. Initial mount (lastCheckedUserId is null)
    // 2. UserId changes
    const shouldCheck = lastCheckedUserId === null || currentUserId !== lastCheckedUserId;
    
    if (shouldCheck) {
      setIsLoading(true);
      
      // For authenticated users, reset to false immediately when userId changes
      // This prevents stale values from causing navigation
      if (isAuthenticated && currentUserId && currentUserId !== lastCheckedUserId) {
        setHasCompletedOnboarding(false);
      }
      
      setLastCheckedUserId(currentUserId);
      checkOnboardingStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState.user?.id, userState.isAuthenticated]);

  const checkOnboardingStatus = async () => {
    try {
      const userId = userState.user?.id || null;
      const isAuthenticated = userState.isAuthenticated && !!userState.user;
      
      // CRITICAL: For authenticated users, ALWAYS check per-user onboarding
      // Never use device-level onboarding status for authenticated users
      // This ensures new users always see the tutorial
      if (isAuthenticated && userId) {
        // Authenticated user - check per-user onboarding only
        const key = `@snacktrack_onboarding_completed_${userId}`;
        const value = await AsyncStorage.getItem(key);
        const completed = value === 'true';
        setHasCompletedOnboarding(completed);
      } else {
        // Not authenticated - check device-level onboarding (for initial onboarding screen)
        const key = '@snacktrack_onboarding_completed';
        const value = await AsyncStorage.getItem(key);
        const completed = value === 'true';
        setHasCompletedOnboarding(completed);
      }
      
      // For authenticated users, if onboarding flag doesn't exist for this user,
      // it means it's a new user - they should see the tutorial
      // The value check above already handles this (undefined !== 'true')
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to false on error (new users should see tutorial)
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      const userId = userState.user?.id || null;
      const key = getOnboardingKey(userId);
      await AsyncStorage.setItem(key, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      const userId = userState.user?.id || null;
      const key = getOnboardingKey(userId);
      await AsyncStorage.removeItem(key);
      setHasCompletedOnboarding(false);
    } catch (error) {
      // Silently fail - not critical
    }
  };

  // Compute effective values - override if authenticated user hasn't been checked yet
  // This prevents navigation race condition by blocking until AsyncStorage check completes
  const effectiveIsLoading = React.useMemo(() => {
    const userIdNotCheckedYet = isAuthenticated && currentUserId && currentUserId !== lastCheckedUserId;
    if (userIdNotCheckedYet) {
      return true; // Force loading until this userId is checked
    }
    return isLoading;
  }, [isAuthenticated, currentUserId, lastCheckedUserId, isLoading]);
  
  const effectiveOnboardingStatus = React.useMemo(() => {
    const userIdNotCheckedYet = isAuthenticated && currentUserId && currentUserId !== lastCheckedUserId;
    if (userIdNotCheckedYet) {
      return false; // Force false until this userId is checked
    }
    return hasCompletedOnboarding;
  }, [isAuthenticated, currentUserId, lastCheckedUserId, hasCompletedOnboarding]);

  // Always return provider to prevent unmounting children
  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding: effectiveOnboardingStatus,
        isLoading: effectiveIsLoading,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

