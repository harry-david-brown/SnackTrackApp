import { Colors } from '@constants/theme';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function OAuthCallback() {
  const params = useLocalSearchParams();
  const gmail = typeof params.gmail === 'string' ? params.gmail : undefined;
  const outlook = typeof params.outlook === 'string' ? params.outlook : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;
  const gmailPurpose = typeof params.gmailPurpose === 'string' ? params.gmailPurpose : undefined;
  const outlookPurpose = typeof params.outlookPurpose === 'string' ? params.outlookPurpose : undefined;

  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/upload',
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.success} />
      <Text style={styles.text}>Completing email connection...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
