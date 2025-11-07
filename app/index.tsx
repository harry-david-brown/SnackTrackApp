import { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import LoginScreen from '../components/LoginScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import UberDataTutorial from '../components/UberDataTutorial';

export default function HomeScreen() {
    const { state } = useUser();
    const { hasCompletedOnboarding, completeOnboarding } = useOnboarding();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showUberTutorial, setShowUberTutorial] = useState(false);
    const hasNavigatedRef = useRef(false);

    // Memoize the current screen to prevent unnecessary recalculations
    const currentScreen = useMemo(() => {
        // While initializing, always show loading
        if (!state.initialized || state.isLoading) {
            return 'loading';
        }

        // If not authenticated and onboarding not completed, show onboarding
        if (!state.isAuthenticated && !hasCompletedOnboarding) {
            return 'onboarding';
        }

        // If showing uber tutorial, keep showing it
        if (showUberTutorial) {
            return 'uber-tutorial';
        }

        // If authenticated, navigate to tabs (but don't re-render)
        if (state.isAuthenticated && state.user) {
            return 'authenticated';
        }

        // Default to login screen
        return 'login';
    }, [state.initialized, state.isLoading, state.isAuthenticated, state.user, showUberTutorial, hasCompletedOnboarding]);

    // Handle navigation - separate from render logic
    useEffect(() => {
        if (currentScreen === 'authenticated' && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            // Navigate on next tick
            requestAnimationFrame(() => {
                router.replace('/(tabs)');
            });
        } else if (currentScreen !== 'authenticated') {
            hasNavigatedRef.current = false;
        }
    }, [currentScreen]);

    const handleOnboardingComplete = async () => {
        await completeOnboarding();
        setShowOnboarding(false);
        setShowUberTutorial(true);
    };

    const handleUberTutorialComplete = () => {
        setShowUberTutorial(false);
    };

    // Render based on current screen
    if (currentScreen === 'loading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    if (currentScreen === 'onboarding') {
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    if (currentScreen === 'uber-tutorial') {
        return <UberDataTutorial onComplete={handleUberTutorialComplete} />;
    }

    // Return login screen for default and unauthenticated states
    return <LoginScreen />;
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