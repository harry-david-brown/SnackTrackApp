import { useMailboxAuthorizationCallback } from '@hooks/useMailboxAuthorizationCallback';
import { parseImportReturnTo } from '@features/import-flow/importNavigation';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useAppNavigation } from '@features/navigation';

export default function OAuthCallback() {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const params = useLocalSearchParams();
  const gmail = typeof params.gmail === 'string' ? params.gmail : undefined;
  const outlook = typeof params.outlook === 'string' ? params.outlook : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;
  const gmailPurpose = typeof params.gmailPurpose === 'string' ? params.gmailPurpose : undefined;
  const outlookPurpose = typeof params.outlookPurpose === 'string' ? params.outlookPurpose : undefined;
  const journeyContext = typeof params.journeyContext === 'string' ? params.journeyContext : undefined;
  const returnTo = parseImportReturnTo(params.returnTo);
  const mailbox = gmail ? 'gmail' : outlook ? 'outlook' : undefined;
  const completionToken = typeof params.completionToken === 'string' ? params.completionToken : null;
  const completion = useMailboxAuthorizationCallback(mailbox, gmail ?? outlook, completionToken);
  const completionStatus = completion.status;
  const completing = completion.completing;
  const exportAlerts=(gmailPurpose ?? outlookPurpose)==='export_ready_alerts';
  const returnIntent = params.returnIntent === 'reconnect' ? 'reconnect' : 'email';

  useEffect(() => {
    if (completing) return;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const destination = {
      pathname: exportAlerts || journeyContext === 'post_onboarding' ? '/add-history' : '/data-setup',
      params: {
        returnTo, mailbox, journeyContext,
        ...(exportAlerts ? { intent: 'resume_export' as const } : {}),
        ...(!exportAlerts && journeyContext === 'post_onboarding' ? { intent: returnIntent } : {}),
        ...(gmail ? { gmail: completionStatus } : {}),
        ...(outlook ? { outlook: completionStatus } : {}),
        ...(completionStatus === 'error' ? { error: error ?? 'Email connection could not be completed. Please start it again.' } : {}),
        ...(gmailPurpose || outlookPurpose ? { gmailPurpose: gmailPurpose ?? outlookPurpose } : {}),
      },
    } as const;
    const completeHandoff = () => {
      if (cancelled) return;
      const outcome = navigation.replace(destination);
      if (outcome === 'transition-pending') {
        retryTimer = setTimeout(completeHandoff, 100);
      }
    };
    completeHandoff();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [completing, completionStatus, exportAlerts, error, gmail, gmailPurpose, journeyContext, navigation, outlook, outlookPurpose, returnIntent, returnTo, mailbox]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Completing email connection...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
