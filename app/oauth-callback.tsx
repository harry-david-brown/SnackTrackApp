import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { gmailApi } from '../services/gmailApi';
import { showSimpleAlert } from '../utils/platformAlert';

/**
 * OAuth Callback Screen
 * Handles the deep link callback from Gmail OAuth
 * Format: snacktrack://oauth/callback?access_token=xxx&state=xxx
 */
export default function OAuthCallback() {
  const params = useLocalSearchParams();

  const handleOAuthCallback = async () => {
    try {
      const { access_token, error } = params;

      console.log('📱 OAuth callback received:', { 
        hasAccessToken: !!access_token, 
        error 
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        showSimpleAlert('Authorization Failed', 'Failed to connect Gmail. Please try again.');
        router.replace('/(tabs)/upload');
        return;
      }

      if (!access_token) {
        console.error('❌ No access token in callback');
        showSimpleAlert('Error', 'No access token received. Please try again.');
        router.replace('/(tabs)/upload');
        return;
      }

      console.log('🔄 Exchanging access token with backend...');

      // Exchange the access token with the backend
      const result = await gmailApi.exchangeToken(access_token as string);

      if (result.success) {
        console.log('✅ Gmail connected successfully');
        showSimpleAlert('Success', 'Gmail connected successfully! You can now import your receipts.');
        // Navigate to upload screen with Gmail modal open
        router.replace({
          pathname: '/(tabs)/upload',
          params: { openGmail: 'true' }
        });
      } else {
        console.error('❌ Token exchange failed');
        showSimpleAlert('Error', 'Failed to connect Gmail. Please try again.');
        router.replace('/(tabs)/upload');
      }
    } catch (error: any) {
      console.error('❌ Error in OAuth callback:', error);
      const errorMessage = error.response?.data?.error || 'Failed to complete Gmail connection.';
      showSimpleAlert('Error', errorMessage);
      router.replace('/(tabs)/upload');
    }
  };

  useEffect(() => {
    handleOAuthCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
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
    color: '#666',
  },
});

