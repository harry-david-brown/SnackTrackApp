import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { featureFlags } from '@config/featureFlags';
import { useCurrency } from '@contexts/CurrencyContext';
import { useOnboarding } from '@contexts/OnboardingContext';
import { useUser } from '@contexts/UserContext';
import { resolveProfileSettingsState } from '@features/profile/profileSettingsState';
import { resolveTrackingRecovery } from '@features/import-flow/trackingEligibility';
import { useAnalyticsQuery } from './queries/useAnalyticsQueries';
import { useImportPreferences } from './useImportPreferences';
import { authApi } from '@services/authApi';
import type { CurrencyCode } from '@utils/currency';
import type { ExportProvider } from '@services/gmailApi';
import { toDomainError } from '@utils/domainError';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { getRefreshToken } from '@utils/tokenManager';
import {
  setExportDownloadHandoffState,
  UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';

type ProfileModal = 'tutorial' | 'help' | 'currency' | null;

export function useProfileController() {
  const { state, logout } = useUser();
  const { resetOnboarding } = useOnboarding();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingReceipts, setIsClearingReceipts] = useState(false);
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
  }, [refresh]));

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
      showAlert(successTitle, 'Your account import data has been reset and Gmail is disconnected.');
      router.replace('/');
    } catch (error: unknown) {
      showAlert(failureTitle, toDomainError(error).message);
    } finally {
      setIsClearingReceipts(false);
    }
  }, [isClearingReceipts, resetOnboarding, state.user]);

  const requestClearReceipts = useCallback(() => {
    if (!state.user || isClearingReceipts) return;
    showAlert(
      'Reset Imported Data',
      'This permanently deletes all receipts and stats, disconnects Gmail, stops background syncing, and clears Uber Eats and DoorDash export progress. Your login remains active.\n\nThis action cannot be undone.',
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
      'This permanently deletes all receipts and stats, disconnects Gmail, stops background syncing, and clears your Uber Eats and DoorDash export progress. Your login remains active. Continue?',
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
      showAlert('Turn off export alerts?', 'SnackTrack will stop checking for Uber’s data-ready email. Your existing imported receipts will remain.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn Off', style: 'destructive', onPress: () => {
            void setMonitoringConsent('revoked').catch(() => {
              showAlert('Update Failed', 'Could not turn off export alerts. Please try again.');
            });
          },
        },
      ]);
      return;
    }
    showAlert(
      'Turn on export-ready alerts?',
      'SnackTrack will check only for Uber’s data-ready email while the app is active. It will not open the link or download the file, and you can turn this off at any time.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Allow', onPress: () => {
            void setMonitoringConsent('granted').then((next) => {
              if (next.monitoring.effectiveState === 'reconnect_required') {
                showAlert('Permission saved', 'Reconnect Gmail before export-ready alerts can work.', [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Reconnect Gmail',
                    onPress: () => router.push({
                      pathname: '/(tabs)/upload',
                      params: {
                        action: 'connect_gmail',
                        gmailPurpose: 'export_ready_alerts',
                        intentId: `connect_gmail:${Date.now()}`,
                      },
                    }),
                  },
                ]);
              }
            }).catch(() => showAlert('Update Failed', 'Could not enable export alerts. Please try again.'));
          },
        },
      ],
    );
  }, [preferences?.monitoring.consentState, setMonitoringConsent]);

  const toggleOngoingTracking = useCallback(() => {
    if (preferences?.ongoingTracking.consentState === 'granted'
      && preferences.ongoingTracking.effectiveState !== 'paused') {
      showAlert('Turn off ongoing tracking?', 'SnackTrack will stop periodically checking Gmail for new delivery receipts. Your imported history will remain.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn Off', style: 'destructive', onPress: () => void setOngoingTrackingConsent('revoked') },
      ]);
      return;
    }
    if (trackingRecovery.kind === 'baseline') {
      showAlert('Check email before enabling updates', 'Run one current email check to find orders newer than your exports and establish where future checks should begin.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Import', onPress: () => router.push({
          pathname: '/(tabs)/upload',
          params: { action: 'import_gmail', gmailPurpose: 'ongoing_tracking', intentId: `import_gmail:${Date.now()}` },
        }) },
      ]);
      return;
    }
    if (trackingRecovery.kind === 'unavailable') {
      showSimpleAlert('Gmail is temporarily unavailable', 'Your connection and imported history are safe. Try enabling ongoing updates again shortly.');
      return;
    }
    if (trackingRecovery.kind === 'reconnect') {
      showAlert('Reconnect Gmail first', 'Ongoing tracking needs durable Gmail access. Reconnect from the Import screen, then return here.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reconnect Gmail', onPress: () => router.push({
          pathname: '/(tabs)/upload',
          params: { action: 'connect_gmail', gmailPurpose: 'ongoing_tracking', intentId: `connect_gmail:${Date.now()}` },
        }) },
      ]);
      return;
    }
    showAlert('Allow ongoing order tracking?', preferences?.ongoingTracking.baseline?.source === 'exports'
      ? 'SnackTrack will check Gmail for supported delivery receipts newer than your exports and periodically check for future orders. You can turn this off at any time.'
      : 'SnackTrack will periodically read supported delivery receipt emails from your connected Gmail account to update spending and stats. You can turn this off at any time.', [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Allow tracking', onPress: () => void setOngoingTrackingConsent('granted') },
    ]);
  }, [preferences?.ongoingTracking.baseline?.source, preferences?.ongoingTracking.consentState, preferences?.ongoingTracking.effectiveState, setOngoingTrackingConsent, trackingRecovery.kind]);

  const saveExportRequest = useCallback(async (platform: DataPlatform, decision?: 'granted' | 'declined') => {
    try {
      if (decision) await setMonitoringConsent(decision);
      const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
      await markExportRequested(provider);
    } catch {
      showAlert('Status Not Saved', 'The tutorial is complete, but we could not save your export request status.');
    }
  }, [markExportRequested, setMonitoringConsent]);

  const completeTutorial = useCallback((platform: DataPlatform) => {
    setActiveModal(null);
    if (platform === 'doordash' || preferences?.monitoring.consentState === 'granted') {
      void saveExportRequest(platform);
      return;
    }
    showAlert('Notify you when it’s ready?', 'Allow SnackTrack to check only for Uber’s data-ready email and let you know when the download is available. SnackTrack will not open the link or download the file.', [
      { text: 'Not Now', style: 'cancel', onPress: () => void saveExportRequest(platform, 'declined') },
      { text: 'Notify Me', onPress: () => void saveExportRequest(platform, 'granted') },
    ]);
  }, [preferences?.monitoring.consentState, saveExportRequest]);

  const tutorialReadyConfirmed = useCallback((platform: DataPlatform) => {
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    void confirmExportReady(provider).catch(() => {
      showAlert('Status Not Saved', 'You can continue downloading the archive, but SnackTrack could not save that it is ready.');
    });
  }, [confirmExportReady]);

  const tutorialStillWaiting = useCallback((platform: DataPlatform) => {
    setActiveModal(null);
    void saveExportRequest(platform);
    showSimpleAlert(
      `Your ${platform === 'uber' ? 'Uber Eats' : 'DoorDash'} export is on the way`,
      platform === 'uber'
        ? `Uber typically takes a few hours, though it can take longer. Watch for “${UBER_EXPORT_EMAIL_SUBJECT}” from ${UBER_EXPORT_EMAIL_ADDRESS}.`
        : 'DoorDash typically takes a few hours, though it can take longer. Watch for an email saying your archive is ready with “View Your Data Archive.”',
    );
  }, [saveExportRequest]);

  const tutorialArchiveDownloaded = useCallback(async (platform: DataPlatform) => {
    if (!userId) return;
    const provider: ExportProvider = platform === 'uber' ? 'uber_eats' : 'doordash';
    const providerState = provider === 'uber_eats'
      ? preferences?.export.providers?.uberEats
      : preferences?.export.providers?.doorDash;
    const readyVersion = providerState?.updatedAt ?? 'ready';
    await setExportDownloadHandoffState(userId, provider, readyVersion, 'downloaded');
    setActiveModal(null);
    router.push({
      pathname: '/(tabs)/upload',
      params: { focus: 'export', provider, downloadedVersion: readyVersion },
    });
  }, [preferences?.export.providers, userId]);

  const openPrivacyPolicy = useCallback(async () => {
    const url = 'https://getsnacktrack.com/privacy-policy';
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else showAlert('Error', 'Unable to open the privacy policy link.');
  }, []);

  const performAccountDeletion = useCallback(async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAccount((await getRefreshToken()) || undefined);
      setActiveModal(null);
      await logout();
      showAlert('Account Deleted', 'Your account has been permanently deleted.', [{ text: 'OK' }]);
    } catch (error: unknown) {
      showAlert('Deletion Failed', toDomainError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }, [logout]);

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
    openReceipts: () => router.push('/receipts'),
    openImport: () => router.push('/(tabs)/upload'),
    requestLogout,
    requestClearReceipts,
    requestDevelopmentReset,
    toggleExportAlerts,
    toggleOngoingTracking,
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
