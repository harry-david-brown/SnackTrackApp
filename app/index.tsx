import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import LoginScreen from '../components/LoginScreen';

export default function HomeScreen() {
  const { state } = useUser();

  useEffect(() => {
    // If user is authenticated, navigate to main app
    if (state.isAuthenticated && state.user) {
      router.replace('/(tabs)');
    }
  }, [state.isAuthenticated, state.user]);

  // Show loading screen while checking authentication
  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  // Show login screen if not authenticated
  if (!state.isAuthenticated) {
    return <LoginScreen />;
  }

  // This should not be reached, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
