import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
}

const slides: OnboardingSlide[] = [
  {
    title: 'Ready to Face the Truth?',
    description: 'Your Uber Eats spending is about to shock you. Brace yourself.',
    icon: 'flame',
    gradient: ['#ff6b6b', '#ee5a6f'],
  },
  {
    title: 'Upload Your CSV, Get Roasted',
    description: 'Import your Uber Eats data and watch us turn your shame into beautiful graphics',
    icon: 'rocket',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    title: 'Join Thousands Getting Roasted',
    description: 'See exactly how much damage you have done. Compare your shame with friends.',
    icon: 'people',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    title: 'Let Us See the Damage',
    description: 'Time to confront your food delivery addiction. Ready?',
    icon: 'warning',
    gradient: ['#43e97b', '#38f9d7'],
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Change slide
        setCurrentIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * width,
          animated: false,
        });
        
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleDotPress = (index: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(index);
      scrollViewRef.current?.scrollTo({
        x: index * width,
        animated: false,
      });
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentSlide.gradient as any}
        style={styles.gradient}
      >
        {/* Skip Button */}
        {!isLastSlide && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={currentSlide.icon} size={80} color="white" />
            </View>
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentSlide.title}</Text>
            <Text style={styles.description}>{currentSlide.description}</Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                style={styles.dotTouchable}
              >
                <View
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {isLastSlide ? "Let's Get Started!" : 'Next'}
            </Text>
            {!isLastSlide && (
              <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 60,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    marginBottom: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dotTouchable: {
    padding: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: 'white',
    width: 24,
  },
  button: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    minWidth: 200,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

