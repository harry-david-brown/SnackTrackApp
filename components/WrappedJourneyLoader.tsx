import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface WrappedJourneyLoaderProps {
  onComplete: () => void;
}

export default function WrappedJourneyLoader({ onComplete }: WrappedJourneyLoaderProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const whiteFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    // Fade in loader
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // After 1.5 seconds, fade to white then complete
    const timer = setTimeout(() => {
      Animated.sequence([
        // Fade loader to white
        Animated.timing(whiteFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Hold white for a moment
        Animated.delay(200),
      ]).start(() => {
        onComplete();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <View style={styles.spinnerInner} />
        </Animated.View>
        <Text style={styles.loadingText}>Processing your results...</Text>
        <Text style={styles.subtext}>Calculating the damage</Text>
      </LinearGradient>
      {/* White fade overlay */}
      <Animated.View 
        style={[
          styles.whiteOverlay, 
          { opacity: whiteFadeAnim }
        ]} 
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    marginBottom: 30,
  },
  spinnerInner: {
    flex: 1,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  whiteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
  },
});

