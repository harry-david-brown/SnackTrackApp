import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

/**
 * OAuth Callback Handler for Web
 * 
 * This route handles OAuth callbacks when running in web browser.
 * For mobile, deep linking is used instead (snacktrack://oauth/callback)
 */
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Prevent multiple navigation attempts
    if (isNavigating) return;

    const handleCallback = async () => {
      // Get authorization code from URL params
      const code = params.code as string | undefined;
      const error = params.error as string | undefined;

      if (error) {
        console.error('OAuth error:', error);
      }

      if (code && Platform.OS === 'web') {
        // Store the code in localStorage for the GmailConnection component to pick up
        localStorage.setItem('gmail_oauth_code', code);
        localStorage.setItem('gmail_oauth_timestamp', Date.now().toString());
      }

      // Mark that we're about to navigate
      setIsNavigating(true);

      // Defer navigation to ensure the router is fully mounted
      // Use setTimeout to push navigation to next tick
      setTimeout(() => {
        router.replace('/(tabs)/upload?openGmail=true');
      }, 100);
    };

    handleCallback();
  }, [params, router, isNavigating]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Completing Gmail connection...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

