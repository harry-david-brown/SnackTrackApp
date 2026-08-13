import { Colors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';

import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';

const { width: screenWidth } = Dimensions.get('window');

interface WrappedJourneyLoaderProps {
  onComplete: () => void;
}

export default function WrappedJourneyLoader({ onComplete }: WrappedJourneyLoaderProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const whiteFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spin animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    // Fade in loader
    const fadeAnimation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });
    fadeAnimation.start();

    // Brief drumroll, then fade toward the journey's opening forest gradient
    // (no white flash between the loader and the first slide).
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(whiteFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(120),
      ]).start(() => {
        onComplete();
      });
    }, 900);

    return () => {
      clearTimeout(timer);
      spinAnimation.stop();
      fadeAnimation.stop();
      whiteFadeAnim.stopAnimation();
    };
  }, [fadeAnim, onComplete, spinAnim, whiteFadeAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary, Colors.accent]}
        locations={[0, 0.52, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* MASCOT: wrapped drumroll — thinking pose, outline variant on gradient */}
        <View style={styles.mascotWrap}>
          <MascotPlaceholder pose="thinking" size={110} variant="outline" />
        </View>
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
  mascotWrap: {
    marginBottom: 24,
  },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.alpha(Colors.white, 0.3),
    borderTopColor: Colors.white,
    marginBottom: 30,
    shadowColor: Colors.alpha(Colors.black, 0.3),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  spinnerInner: {
    flex: 1,
  },
  loadingText: {
    fontSize: Math.min(28, Math.max(24, Math.round(screenWidth * 0.07))),
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: Colors.alpha(Colors.black, 0.25),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtext: {
    fontSize: Math.min(18, Math.max(16, Math.round(screenWidth * 0.045))),
    color: Colors.alpha(Colors.white, 0.9),
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
    textShadowColor: Colors.alpha(Colors.black, 0.2),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  whiteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // First stop of the wrapped 'forest' gradient — the journey's opening slide.
    backgroundColor: Colors.forest850,
  },
});
