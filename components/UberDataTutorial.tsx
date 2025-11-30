import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

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
      'Usually takes about an hour',
      'Could take up to 24 hours',
      'You will receive an email notification when ready',
      'Tap the download link in the email',
    ],
    icon: 'mail-outline',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    title: 'Upload Your Uber ZIP',
    description: 'Upload your Uber data file and let us handle the rest',
    instructions: [
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
  const insets = useSafeAreaInsets();

  // Preload all images on mount using Image.prefetch
  // Prioritize slide 2 images since they're slower to load
  useEffect(() => {
    const preloadImages = async () => {
      // Slide 2 images first (they're slower)
      const slide2Images = [
        require('../assets/UberDataTutorialPNGs/2/1.webp'),
        require('../assets/UberDataTutorialPNGs/2/2.webp'),
        require('../assets/UberDataTutorialPNGs/2/3.webp'),
      ];
      
      // Other images
      const otherImages = [
        require('../assets/UberDataTutorialPNGs/1/1.webp'),
        require('../assets/UberDataTutorialPNGs/1/2.webp'),
        require('../assets/UberDataTutorialPNGs/1/3.webp'),
        require('../assets/UberDataTutorialPNGs/1/4.webp'),
        require('../assets/UberDataTutorialPNGs/3/1.webp'),
        require('../assets/UberDataTutorialPNGs/3/2.webp'),
      ];

      try {
        // Prefetch slide 2 images first (priority)
        await Promise.all(
          slide2Images.map((source) => {
            const resolved = Image.resolveAssetSource(source);
            return Image.prefetch(resolved.uri);
          })
        );
        
        // Then prefetch other images
        await Promise.all(
          otherImages.map((source) => {
            const resolved = Image.resolveAssetSource(source);
            return Image.prefetch(resolved.uri);
          })
        );
      } catch (error) {
        // Silently fail - images will load normally if prefetch fails
      }
    };

    preloadImages();
  }, []);

  // Reset scroll position to top whenever slide changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }, [currentIndex]);

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
    <LinearGradient colors={currentSlide.gradient as any} style={StyleSheet.absoluteFillObject}>
      <StatusBar hidden />
      {/* Skip Button */}
      <TouchableOpacity style={[styles.skipButton, { top: insets.top + 10 }]} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Preload all images in hidden container for caching - render at full size off-screen */}
      <View style={styles.preloadContainer}>
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/1.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/2.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/3.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/4.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/1.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/2.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/3.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/3/1.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/3/2.webp')} 
          style={styles.preloadImage}
          resizeMode="contain"
        />
      </View>

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, paddingTop: insets.top }]}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
            scrollEnabled={true}
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

            {/* Screenshots - render all but show only active slide */}
            <View style={styles.screenshotContainer}>
              {/* Slide 0 images */}
              <View style={[styles.slideScreenshots, currentIndex !== 0 && styles.hiddenSlide]}>
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/1/1.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/1/2.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/1/3.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/1/4.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
              {/* Slide 1 images */}
              <View style={[styles.slideScreenshots, currentIndex !== 1 && styles.hiddenSlide]}>
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/2/1.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/2/2.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/2/3.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
              {/* Slide 2 images */}
              <View style={[styles.slideScreenshots, currentIndex !== 2 && styles.hiddenSlide]}>
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/3/1.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Image 
                  source={require('../assets/UberDataTutorialPNGs/3/2.webp')} 
                  style={styles.screenshot}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
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
  );
}

const styles = StyleSheet.create({
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
  preloadContainer: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: width * 0.9,
    opacity: 0,
    pointerEvents: 'none',
  },
  preloadImage: {
    width: width * 0.9,
    height: undefined,
    aspectRatio: 0.5625,
    marginBottom: 15,
  },
  screenshotContainer: {
    width: '100%',
    marginTop: 0,
    alignItems: 'center',
    position: 'relative',
  },
  slideScreenshots: {
    width: '100%',
    alignItems: 'center',
  },
  hiddenSlide: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  screenshot: {
    width: width * 0.9,
    height: undefined,
    aspectRatio: 0.5625, // Common phone screenshot aspect ratio (9:16 inverted for landscape)
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 10,
    borderColor: 'rgb(255, 255, 255)',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 30,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
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

