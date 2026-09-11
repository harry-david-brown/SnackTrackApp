import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { featureFlags } from '@config/featureFlags';
import { useCurrency } from '@contexts/CurrencyContext';
import { useOnboarding } from '@contexts/OnboardingContext';
import { useUser } from '@contexts/UserContext';
import { resolveProfileSettingsState } from '@features/profile/profileSettingsState';
import { resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';
import { useAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useImportPreferences } from './useImportPreferences';
import type { CurrencyCode } from '@utils/currency';
import type { ExportProvider } from '@features/import-flow/contracts';
import { toDomainError } from '@utils/domainError';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import {
  setExportDownloadHandoffState,
} from '@utils/exportDownloadHandoff';
import { requestImportNotifications } from '@components/import/ImportNotificationController';
import { notificationDeviceApi } from '@services/notificationDeviceApi';
import { getNotificationInstallationId, notificationEnabledKey } from '@utils/notificationInstallation';
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
  const [importNotificationsEnabled, setImportNotificationsEnabled] = useState(false);
  const userId = state.user?.id;
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
  const { data: analytics } = useAnalyticsQuery(userId);

  useFocusEffect(useCallback(() => {
    void refresh();
    if (userId) void Promise.all([
      Notifications.getPermissionsAsync(),
      AsyncStorage.getItem(notificationEnabledKey(userId)),
    ]).then(([permission, enabled]) => setImportNotificationsEnabled(permission.granted && enabled === 'true')).catch(() => setImportNotificationsEnabled(false));
  }, [refresh, userId]));

  const toggleImportNotifications = useCallback(() => {
    if (importNotificationsEnabled) {
      showAlert('Turn off import notifications?', 'This device will stop receiving completion updates. Imports will still continue in the background.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn Off', style: 'destructive', onPress: () => { void (async () => {
          if (userId) await AsyncStorage.setItem(notificationEnabledKey(userId), 'false');
          setImportNotificationsEnabled(false);
          await notificationDeviceApi.unregister(await getNotificationInstallationId()).catch(() => undefined);
        })(); } },
      ]);
      return;
    }
    if (!userId) return;
    void requestImportNotifications(userId).then(enabled => {
      setImportNotificationsEnabled(enabled);
      if (!enabled) showSimpleAlert('Notifications aren’t enabled', 'Allow SnackTrack notifications in your device Settings. Your import continues; you can check it in Add orders.');
    }).catch(() => {
      setImportNotificationsEnabled(false);
      showSimpleAlert('Could not enable notifications', 'Reconnect to the internet and try again. Your import continues in the background.');
    });
  }, [importNotificationsEnabled, userId]);

  const settings = useMemo(
    () => resolveProfileSettingsState(preferences, arePreferencesLoading),
    [arePreferencesLoading, preferences],
  );
  const trackingRecovery = useMemo(
    () => resolveTrackingRecovery(preferences),
    [preferences],
  );

  const performReset = useCallback(async (successTitle: string, failureTitle: string) => {
    if (!state.user || isClearingReceipts) return;
    setIsClearingReceipts(true);
    try {
      await resetOnboarding();
      showAlert(successTitle, 'Your account import data has been reset and connected mailboxes were disconnected.');
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
      'Reset Imported Data',
      'This permanently deletes all receipts and stats, disconnects Gmail and Outlook, stops background syncing, and clears Uber Eats and DoorDash history progress. Your login remains active.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Data', style: 'destructive', onPress: () => void performReset('Receipts Cleared', 'Clear Failed') },
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
    if (trackingRecovery.kind === 'baseline') {
      showAlert('Check email before enabling updates', 'Run one current email check to find orders newer than your downloaded history and establish where future checks should begin.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Import', onPress: () => navigation.open({
          pathname: '/add-history',
          params: { intent: 'email', returnTo: 'settings' },
        }) },
      ]);
      return;
    }
    if (trackingRecovery.kind === 'unavailable') {
      showSimpleAlert('Email is temporarily unavailable', 'Your connections and imported history are safe. Try enabling ongoing updates again shortly.');
      return;
    }
    if (trackingRecovery.kind === 'reconnect') {
      showAlert('Reconnect email first', 'Ongoing tracking needs a durable Gmail or Outlook connection. Manage email connections from the Import screen, then return here.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Manage connections', onPress: () => navigation.open(appDestinations.accountsPermissions) },
      ]);
      return;
    }
    showAlert('Turn on automatic email updates?', preferences?.ongoingTracking.baseline.source === 'exports'
      ? 'SnackTrack will check connected email accounts for supported delivery receipts newer than your downloaded history and periodically check for future orders. You can turn this off at any time.'
      : 'SnackTrack will periodically read supported delivery receipt emails from your connected accounts to update spending and stats. You can turn this off at any time.', [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Turn on updates', onPress: () => { void setOngoingTrackingConsent('granted').catch(() => showSimpleAlert('Could not turn on updates', 'Your previous setting is unchanged. Please try again.')); } },
    ]);
  }, [navigation, preferences?.ongoingTracking.baseline.source, preferences?.ongoingTracking.consentState, preferences?.ongoingTracking.effectiveState, setOngoingTrackingConsent, trackingRecovery.kind]);

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
      await deleteAccount();
      setActiveModal(null);
      showAlert('Account Deleted', 'Your account has been permanently deleted.', [{ text: 'OK' }]);
    } catch (error: unknown) {
      showAlert('Deletion Failed', toDomainError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteAccount]);

  const requestAccountDeletion = useCallback(() => {
    showAlert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.\n\nThis action is irreversible.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          showAlert('Final Confirmation', 'This is your last chance to cancel. Your account will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Delete My Account', style: 'destructive', onPress: () => void performAccountDeletion() },
          ]);
        },
      },
    ]);
  }, [performAccountDeletion]);

  const selectCurrency = useCallback(async (selected: CurrencyCode) => {
    await setCurrency(selected);
    setActiveModal(null);
  }, [setCurrency]);

  return {
    user: state.isAuthenticated ? state.user : null,
    totalSpent: formatCurrency(analytics?.totalSpent ?? 0),
    totalReceipts: analytics?.totalReceipts ?? 0,
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
    importNotificationsLabel: importNotificationsEnabled ? 'On' : 'Off',
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
