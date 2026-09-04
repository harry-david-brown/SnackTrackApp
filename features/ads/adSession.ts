import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdPlacement } from './contracts';

const impressionsByUser = new Map<string, number>();
const claimedPlacementByUser = new Map<string, AdPlacement>();
const suppressedUsers = new Set<string>();
const localCalendarDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dailyKey = (userId: string, date = new Date()) => `@snacktrack_ad_impressions_${userId}_${localCalendarDay(date)}`;

export const getSessionAdImpressions = (userId: string): number => impressionsByUser.get(userId) ?? 0;

export const recordSessionAdImpression = (userId: string): number => {
  const next = getSessionAdImpressions(userId) + 1;
  impressionsByUser.set(userId, next);
  return next;
};

export const claimAdOpportunity = (userId: string, placement: AdPlacement): boolean => {
  if (suppressedUsers.has(userId)) return false;
  const claimed = claimedPlacementByUser.get(userId);
  if (claimed) return claimed === placement;
  claimedPlacementByUser.set(userId, placement);
  return true;
};

export const suppressAdsForSession = (userId: string): void => { suppressedUsers.add(userId); };
export const isAdSessionSuppressed = (userId: string): boolean => suppressedUsers.has(userId);
export const beginAdForegroundSession = (userId: string): void => {
  impressionsByUser.delete(userId);
  claimedPlacementByUser.delete(userId);
  suppressedUsers.delete(userId);
};
export const getDailyAdImpressions = async (userId: string): Promise<number> => {
  const value = Number(await AsyncStorage.getItem(dailyKey(userId)));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
};
export const recordDailyAdImpression = async (userId: string): Promise<number> => {
  const next = await getDailyAdImpressions(userId) + 1;
  await AsyncStorage.setItem(dailyKey(userId), String(next));
  return next;
};

export const resetAdSessionForTests = (): void => {
  impressionsByUser.clear();
  claimedPlacementByUser.clear();
  suppressedUsers.clear();
};
