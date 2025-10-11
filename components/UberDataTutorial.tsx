import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface TutorialSlide {
  title: string;
  description: string;
  instructions: string[];
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
}

const slides: TutorialSlide[] = [
  {
    title: 'Request Your Uber Data',
    description: 'First, you need to request your data from Uber',
    instructions: [
      'Open the Uber Eats app',
      'Go to Account → Privacy',
      'Tap "Request Data Download"',
      'Uber will process your request',
    ],
    icon: 'document-text-outline',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    title: 'Wait for the Email',
    description: 'Uber will email you when your data is ready',
    instructions: [
      'Usually takes 2-3 hours',
      'Could take up to 24 hours',
      'You will receive a notification when ready',
    ],
    icon: 'mail-outline',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    title: 'Upload Your Uber ZIP',
    description: 'Upload your Uber data file and let us handle the rest',
    instructions: [
      'Tap the download link in the email',
      'Upload the entire ZIP file here',
      'We will extract and process it automatically',
      'Sit back and get ready to be roasted!',
    ],
    icon: 'cloud-upload-outline',
    gradient: ['#4facfe', '#00f2fe'],
  },
];

interface UberDataTutorialProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function UberDataTutorial({ onComplete, onSkip }: UberDataTutorialProps) {
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
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient colors={currentSlide.gradient as any} style={styles.gradient}>
        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.slideContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={currentSlide.icon} size={80} color="white" />
              </View>

              <Text style={styles.title}>{currentSlide.title}</Text>
              <Text style={styles.description}>{currentSlide.description}</Text>

              {/* Instructions List */}
              <View style={styles.instructionsContainer}>
                {currentSlide.instructions.map((instruction, index) => (
                  <View key={index} style={styles.instructionRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>

              {/* Placeholder for screenshot */}
              <View style={styles.screenshotPlaceholder}>
                <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.3)" />
                <Text style={styles.placeholderText}>Screenshot placeholder</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>

          {/* Next Button */}
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {isLastSlide ? "I Have My ZIP!" : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
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
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  slideContent: {
    width,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: 'white',
    lineHeight: 20,
  },
  screenshotPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    borderWidth: 2,
    borderColor: 'white',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

