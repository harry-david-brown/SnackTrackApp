import { useDeviceNotifications } from './useDeviceNotifications';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useState } from 'react';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { featureFlags } from '@config/featureFlags';
import { useCurrency } from '@contexts/CurrencyContext';
import { useOnboarding } from '@contexts/OnboardingContext';
import { useUser } from '@contexts/UserContext';
import { resolveProfileSettingsState } from '@features/profile/profileSettingsState';
import { profileReceiptSummary } from '@features/profile/profileReceiptSummary';
import { useAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useImportPreferences } from './useImportPreferences';
import type { CurrencyCode } from '@utils/currency';
import type { ExportProvider } from '@features/import-flow/contracts';
import { toDomainError } from '@utils/domainError';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  setExportDownloadHandoffState,
} from '@utils/exportDownloadHandoff';
import { appDestinations, useAppNavigation } from '@features/navigation';

type ProfileModal = 'tutorial' | 'help' | 'currency' | null;

export function useProfileController() {
  const navigation = useAppNavigation();
  const { state, logout, deleteAccount } = useUser();
  const { resetOnboarding } = useOnboarding();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingReceipts, setIsClearingReceipts] = useState(false);
  const userId = state.user?.id;
  const deviceNotifications = useDeviceNotifications(userId);
  const importNotificationsEnabled = deviceNotifications.enabled;
  const {
    preferences,
    isLoading: arePreferencesLoading,
    isUpdating: arePreferencesUpdating,
    refresh,
    setMonitoringConsent,
    setOngoingTrackingConsent,
    markExportRequested,
    confirmExportReady,
  } = useImportPreferences(Boolean(userId));
  const { data: analytics } = useAnalyticsQuery(userId, currency);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const toggleImportNotifications = () => {
    if (importNotificationsEnabled) {
      showAlert('Turn off notifications?', 'You can turn them on again anytime.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn off', style: 'destructive', onPress: () => {
          void deviceNotifications.disable().catch(() => showSimpleAlert('Couldn’t save this change', 'Try again.'));
        } },
      ]);
      return;
    }
    if (deviceNotifications.issue === 'denied') deviceNotifications.openSettings();
    else void deviceNotifications.enable().catch(() => undefined);
  };

  const settings = useMemo(
    () => resolveProfileSettingsState(preferences, arePreferencesLoading),
    [arePreferencesLoading, preferences],
  );

  const performReset = useCallback(async (successTitle: string, failureTitle: string) => {
    if (!state.user || isClearingReceipts) return;
    setIsClearingReceipts(true);
    try {
      await resetOnboarding();
      showAlert(successTitle, 'Your imported orders and stats were removed, and your email accounts were disconnected. You’re still signed in.');
      navigation.replace(appDestinations.entry);
    } catch (error: unknown) {
      showAlert(failureTitle, toDomainError(error).message);
    } finally {
      setIsClearingReceipts(false);
    }
  }, [isClearingReceipts, navigation, resetOnboarding, state.user]);

  const requestClearReceipts = useCallback(() => {
    if (!state.user || isClearingReceipts) return;
    showAlert(
      'Reset imported data',
      'This permanently deletes all receipts and stats, disconnects Gmail and Outlook, stops background syncing, and clears Uber Eats and DoorDash history progress. Your login remains active.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset imported data', style: 'destructive', onPress: () => void performReset('Imported data reset', 'Couldn’t reset imported data') },
      ],
    );
  }, [isClearingReceipts, performReset, state.user]);

  const requestDevelopmentReset = useCallback(() => {
    if (isClearingReceipts) return;
    showAlert(
      'Reset Onboarding',
      'This permanently deletes all receipts and stats, disconnects Gmail and Outlook, stops background syncing, and clears your Uber Eats and DoorDash history progress. Your login remains active. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => void performReset('Account Reset', 'Reset Failed') },
      ],
    );
  }, [isClearingReceipts, performReset]);

  const requestLogout = useCallback(() => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  const toggleExportAlerts = useCallback(() => {
    const isGranted = preferences?.monitoring.consentState === 'granted';
    if (isGranted) {
      showAlert('Turn off history-file alerts?', 'SnackTrack will stop checking for Uber’s data-ready email. Your existing imported receipts will remain.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn Off', style: 'destructive', onPress: () => {
            void setMonitoringConsent('revoked').catch(() => {
              showAlert('Update Failed', 'Could not turn off history-file alerts. Please try again.');
            });
          },
        },
      ]);
      return;
    }
    showAlert(
      'Enable Uber ready-email checks?',
      'SnackTrack will check only for Uber’s data-ready email while the app is active. It will not open the link or download the file, and you can turn this off at any time.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Allow', onPress: () => {
            void setMonitoringConsent('granted').then((next) => {
              if (next.monitoring.effectiveState === 'reconnect_required') {
                showAlert('Permission saved', 'Connect Gmail or Outlook before history-file alerts can work.', [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Manage connections',
                    onPress: () => navigation.open(appDestinations.accountsPermissions),
                  },
                ]);
              }
            }).catch(() => showAlert('Update Failed', 'Could not enable history-file alerts. Please try again.'));
          },
        },
      ],
    );
  }, [navigation, preferences?.monitoring.consentState, setMonitoringConsent]);

  const toggleOngoingTracking = useCallback(() => {
    if (preferences?.ongoingTracking.consentState === 'granted'
      && preferences.ongoingTracking.effectiveState !== 'paused') {
      showAlert('Turn off automatic email updates?', 'SnackTrack will stop periodically checking connected email accounts for new delivery receipts. Your imported history will remain.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn Off', style: 'destructive', onPress: () => { void setOngoingTrackingConsent('revoked').catch(() => showSimpleAlert('Could not turn off updates', 'Your previous setting is unchanged. Please try again.')); } },
      ]);
      return;
    }
    navigation.open({ pathname: '/ongoing-updates', params: { manage: 'true' } });
  }, [navigation, preferences?.ongoingTracking.consentState, preferences?.ongoingTracking.effectiveState, setOngoingTrackingConsent]);

  const completeTutorial = useCallback(async (platform: DataPlatform): Promise<boolean> => {
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    try {
      await markExportRequested(provider);
      setActiveModal(null);
      navigation.open({ pathname: '/add-history', params: { intent: 'resume_export', provider, returnTo: 'settings' } });
      return true;
    } catch {
      showSimpleAlert('Request not saved', 'Please try again. Your confirmation is still available.');
      return false;
    }
  }, [markExportRequested, navigation]);

  const tutorialReadyConfirmed = useCallback((platform: DataPlatform) => {
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    void confirmExportReady(provider).catch(() => {
      showAlert('Status Not Saved', 'You can continue downloading the archive, but SnackTrack could not save that it is ready.');
    });
  }, [confirmExportReady]);

  const tutorialStillWaiting = completeTutorial;

  const tutorialArchiveDownloaded = useCallback(async (platform: DataPlatform) => {
    if (!userId) return;
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    const providerState = provider === 'uber_eats'
      ? preferences?.export.providers.uberEats
      : preferences?.export.providers.doorDash;
    const readyVersion = providerState?.updatedAt ?? 'ready';
    await setExportDownloadHandoffState(userId, provider, readyVersion, 'downloaded');
    setActiveModal(null);
    navigation.open({
      pathname: '/add-history',
      params: { intent: 'resume_export', provider, downloadedVersion: readyVersion, returnTo: 'settings' },
    });
  }, [navigation, preferences?.export.providers, userId]);

  const openPrivacyPolicy = useCallback(async () => {
    const url = 'https://getsnacktrack.com/privacy-policy';
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else showAlert('Error', 'Unable to open the privacy policy link.');
  }, []);

  const performAccountDeletion = useCallback(async () => {
    setIsDeleting(true);
    try {
      const status = await deleteAccount();
      setActiveModal(null);
      showAlert(
        status === 'pending' ? 'Account deletion requested' : 'Account deleted',
        status === 'pending'
          ? 'You’ve been signed out. Your imports are being stopped and your account will be deleted automatically. You can close the app.'
          : 'Your account has been permanently deleted.',
        [{ text: 'OK' }],
      );
    } catch (error: unknown) {
      showAlert('Deletion Failed', toDomainError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteAccount]);

  const requestAccountDeletion = useCallback(() => {
    showAlert('Delete your SnackTrack account?', 'This stops your imports and permanently deletes your account, imported orders, stats, and connected email access. You’ll be signed out once the request is accepted. Deletion continues even if you close the app. This cannot be undone.', [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete my account', style: 'destructive', onPress: () => void performAccountDeletion() },
    ]);
  }, [performAccountDeletion]);

  const selectCurrency = useCallback(async (selected: CurrencyCode) => {
    await setCurrency(selected);
    setActiveModal(null);
  }, [setCurrency]);

  return {
    user: state.isAuthenticated ? state.user : null,
    ...profileReceiptSummary(analytics, formatCurrency, currency),
    currency,
    settings,
    activeModal,
    isDeleting,
    isClearingReceipts,
    arePreferencesBusy: arePreferencesLoading || arePreferencesUpdating,
    showDevelopmentReset: featureFlags.showResetOnboarding,
    openModal: setActiveModal,
    closeModal: () => setActiveModal(null),
    openReceipts: () => navigation.open(appDestinations.history),
    openImport: () => navigation.open(appDestinations.accountsPermissions),
    requestLogout,
    requestClearReceipts,
    requestDevelopmentReset,
    toggleExportAlerts,
    toggleOngoingTracking,
    toggleImportNotifications,
    deviceNotifications,
    importNotificationsLabel: deviceNotifications.issue === 'denied' ? 'Open device settings' : deviceNotifications.issue === 'registration' ? 'Retry' : importNotificationsEnabled ? 'On' : 'Off',
    completeTutorial,
    tutorialReadyConfirmed,
    tutorialStillWaiting,
    tutorialArchiveDownloaded,
    openPrivacyPolicy,
    requestAccountDeletion,
    selectCurrency,
  };
}

export type ProfileController = ReturnType<typeof useProfileController>;
