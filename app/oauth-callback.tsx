import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppTheme } from '@contexts/AppearanceContext';

export default function OAuthCallback() {
  const theme = useAppTheme();
  const params = useLocalSearchParams();
  const gmail = typeof params.gmail === 'string' ? params.gmail : undefined;
  const outlook = typeof params.outlook === 'string' ? params.outlook : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;
  const gmailPurpose = typeof params.gmailPurpose === 'string' ? params.gmailPurpose : undefined;
  const outlookPurpose = typeof params.outlookPurpose === 'string' ? params.outlookPurpose : undefined;

  useEffect(() => {
    router.replace({
      pathname: '/data-setup',
      params: {
        ...(gmail ? { gmail } : {}),
        ...(outlook ? { outlook } : {}),
        ...(error ? { error } : {}),
        ...(gmailPurpose ? { gmailPurpose } : {}),
        ...(outlookPurpose ? { outlookPurpose } : {}),
      },
    });
  }, [error, gmail, gmailPurpose, outlook, outlookPurpose]);

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
