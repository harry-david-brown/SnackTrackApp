import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailVerificationBanner from '@components/auth/EmailVerificationBanner';
import { ProfileModals } from '@components/profile/ProfileModals';
import { ProfileSettingsCard } from '@components/profile/ProfileSettingsCard';
import { ProfileSummaryCard } from '@components/profile/ProfileSummaryCard';
import { Colors } from '@constants/theme';
import { useProfileController } from '@hooks/useProfileController';

export default function ProfileScreen() {
  const profile = useProfileController();

  if (!profile.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>You</Text>
        <Text style={styles.subtitle}>Your data, preferences, and account</Text>
        <EmailVerificationBanner />
        <ProfileSummaryCard
          email={profile.user.email}
          createdAt={profile.user.createdAt}
          totalSpent={profile.totalSpent}
          totalReceipts={profile.totalReceipts}
        />
        <ProfileSettingsCard
          currency={profile.currency}
          mailboxConnectionsLabel={profile.settings.mailboxConnectionsLabel}
          exportAlertsLabel={profile.settings.exportAlertsLabel}
          ongoingTrackingLabel={profile.settings.ongoingTrackingLabel}
          providerExportLabel={profile.settings.providerExportLabel}
          importNotificationsLabel={profile.importNotificationsLabel}
          importPreferencesBusy={profile.arePreferencesBusy}
          destructiveActionBusy={profile.isClearingReceipts || profile.isDeleting}
          showDevelopmentReset={profile.showDevelopmentReset}
          onOpenReceipts={profile.openReceipts}
          onOpenImport={profile.openImport}
          onToggleExportAlerts={profile.toggleExportAlerts}
          onToggleOngoingTracking={profile.toggleOngoingTracking}
          onToggleImportNotifications={profile.toggleImportNotifications}
          onOpenTutorial={() => profile.openModal('tutorial')}
          onOpenCurrency={() => profile.openModal('currency')}
          onOpenHelp={() => profile.openModal('help')}
          onDevelopmentReset={profile.requestDevelopmentReset}
          onClearReceipts={profile.requestClearReceipts}
          onDeleteAccount={profile.requestAccountDeletion}
          onLogout={profile.requestLogout}
        />
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>SnackTrack v1.0.0</Text>
          <Text style={styles.appInfoText}>Built for clearer delivery spending</Text>
        </View>
      </ScrollView>
      <ProfileModals {...profile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 4 },
  appInfo: { alignItems: 'center', padding: 20 },
  appInfoText: { fontSize: 14, color: Colors.gray500, marginBottom: 4 },
});
