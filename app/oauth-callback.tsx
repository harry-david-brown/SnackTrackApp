import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function OAuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const gmail = typeof params.gmail === 'string' ? params.gmail : undefined;
    const error = typeof params.error === 'string' ? params.error : undefined;
    const autoImportGmail = typeof params.autoImportGmail === 'string' ? params.autoImportGmail : undefined;
    const autoImportFlowId = autoImportGmail ? `${Date.now()}` : undefined;

    router.replace({
      pathname: '/(tabs)/upload',
      params: {
        ...(gmail ? { gmail } : {}),
        ...(error ? { error } : {}),
        ...(autoImportGmail ? { autoImportGmail } : {}),
        ...(autoImportFlowId ? { autoImportFlowId } : {}),
      },
    });
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#58C26D" />
      <Text style={styles.text}>Completing Gmail connection...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6F756E',
  },
});
