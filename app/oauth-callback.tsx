import { Colors } from '@constants/theme';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function OAuthCallback() {
  const params = useLocalSearchParams();
  const gmail = typeof params.gmail === 'string' ? params.gmail : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;

  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/upload',
      params: {
        ...(gmail ? { gmail } : {}),
        ...(error ? { error } : {}),
      },
    });
  }, [error, gmail]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.success} />
      <Text style={styles.text}>Completing Gmail connection...</Text>
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
