import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeExportUpsellForUser } from '@hooks/useExportUpsell';
import { resetExportDownloadStateForUser } from './exportDownloadHandoff';
import { removePendingOperationsForUser } from './offlineCache';
import { removeAdminAnalyticsForUser } from '@services/adminAnalytics';

/** Clears non-authentication device data owned by one permanently deleted account. */
export const clearUserBoundDeviceState = async (userId: string): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(`@snacktrack_onboarding_completed_${userId}`),
    removeExportUpsellForUser(userId),
    resetExportDownloadStateForUser(userId),
    removePendingOperationsForUser(userId),
    removeAdminAnalyticsForUser(userId),
  ]);
};
