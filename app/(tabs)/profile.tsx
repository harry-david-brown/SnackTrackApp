import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailVerificationBanner from '@components/auth/EmailVerificationBanner';
import { ProfileModals } from '@components/profile/ProfileModals';
import { ProfileSettingsCard } from '@components/profile/ProfileSettingsCard';
import { ProfileSummaryCard } from '@components/profile/ProfileSummaryCard';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useProfileController } from '@hooks/useProfileController';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const profile = useProfileController();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!profile.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <PageHeader eyebrow="ACCOUNT" title="You" body="Your SnackTrack, preferences, and privacy controls." />
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
          importNotificationsLabel={profile.importNotificationsLabel}
          destructiveActionBusy={profile.isClearingReceipts || profile.isDeleting}
          showDevelopmentReset={profile.showDevelopmentReset}
          onOpenReceipts={profile.openReceipts}
          onOpenImport={profile.openImport}
          onToggleImportNotifications={profile.toggleImportNotifications}
          onOpenCurrency={() => router.push('/settings/currency')}
          onOpenAppearance={() => router.push('/settings/appearance')}
          onOpenHelp={() => router.push('/settings/help-privacy')}
          onDevelopmentReset={profile.requestDevelopmentReset}
          onClearReceipts={profile.requestClearReceipts}
          onDeleteAccount={profile.requestAccountDeletion}
          onLogout={profile.requestLogout}
        />
        <View style={styles.appInfo}>
          <AppText variant="metadata" style={styles.appInfoText}>SnackTrack v1.0.0</AppText>
          <AppText variant="metadata" style={styles.appInfoText}>Built for clearer delivery spending</AppText>
        </View>
      </ScrollView>
      <ProfileModals {...profile} />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 18 },
  appInfo: { alignItems: 'center', padding: 20 },
  appInfoText: { marginBottom: 4 },
});
