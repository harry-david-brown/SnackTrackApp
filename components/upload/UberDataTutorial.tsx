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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

type DataPlatform = 'uber' | 'doordash';

interface TutorialSlide {
  title: string;
  description: string;
  instructions: string[];
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
}

const uberSlides: TutorialSlide[] = [
  {
    title: '',
    description: '',
    instructions: [
      'Go to Account → Privacy',
      'Scroll right and tap "Request"',
      'Tap "Request Data Download"',
      'Uber will process your request',
    ],
    icon: 'document-text-outline',
    gradient: ['#06C167', '#00A859'],
  },
  {
    title: '',
    description: '',
    instructions: [
      'Usually takes about an hour',
      'Could take up to 24 hours',
      'You will receive an email notification when ready',
      'Tap the download link in the email',
    ],
    icon: 'mail-outline',
    gradient: ['#00A859', '#06C167'],
  },
  {
    title: '',
    description: '',
    instructions: [
      'Upload the ZIP file here',
      'Sit back and get ready to be roasted!',
    ],
    icon: 'cloud-upload-outline',
    gradient: ['#06C167', '#00D96F'],
  },
];

const doordashSlides: TutorialSlide[] = [
  {
    title: '',
    description: '',
    instructions: [
      'Go to Account → Settings',
      'Navigate to "Manage Account"',
      'Tap "Manage Account"',
      'Select "Request Archive"',
    ],
    icon: 'document-text-outline',
    gradient: ['#FF3000', '#FF3000'],
  },
  {
    title: '',
    description: '',
    instructions: [
      'Usually takes about an hour',
      'Could take up to 24 hours',
      'You will receive an email notification when ready',
      'Tap the download link in the email',
    ],
    icon: 'mail-outline',
    gradient: ['#FF3000', '#FF3000'],
  },
  {
    title: '',
    description: '',
    instructions: [
      'Upload the ZIP file here',
      'Sit back and get ready to be roasted!',
    ],
    icon: 'cloud-upload-outline',
    gradient: ['#FF3000', '#FF3000'],
  },
];

interface UberDataTutorialProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function UberDataTutorial({ onComplete, onSkip }: UberDataTutorialProps) {
  const [platform, setPlatform] = useState<DataPlatform>('uber');
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const slides = platform === 'uber' ? uberSlides : doordashSlides;

  // Helper function to get image paths based on platform
  const getImagePaths = (platformType: DataPlatform) => {
    if (platformType === 'uber') {
      return {
        slide1: [
          require('../../assets/UberDataTutorialScreenshots/1/1.webp'),
          require('../../assets/UberDataTutorialScreenshots/1/2.webp'),
          require('../../assets/UberDataTutorialScreenshots/1/3.webp'),
          require('../../assets/UberDataTutorialScreenshots/1/4.webp'),
        ],
        slide2: [
          require('../../assets/UberDataTutorialScreenshots/2/1.webp'),
          require('../../assets/UberDataTutorialScreenshots/2/2.webp'),
          require('../../assets/UberDataTutorialScreenshots/2/3.webp'),
        ],
        slide3: [
          require('../../assets/UberDataTutorialScreenshots/3/1.webp'),
          require('../../assets/UberDataTutorialScreenshots/3/2.webp'),
        ],
      };
    } else {
      // DoorDash tutorial screenshots
      return {
        slide1: [
          require('../../assets/DoorDashDataTutorialScreenshots/1/1.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/1/2.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/1/3.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/1/4.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/1/5.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/1/6.webp'),
        ],
        slide2: [
          require('../../assets/DoorDashDataTutorialScreenshots/2/1.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/2/2.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/2/3.webp'),
        ],
        slide3: [
          require('../../assets/DoorDashDataTutorialScreenshots/3/1.webp'),
          require('../../assets/DoorDashDataTutorialScreenshots/3/2.webp'),
        ],
      };
    }
  };

  // Preload all images on mount and when platform changes
  // Prioritize slide 2 images since they're slower to load
  useEffect(() => {
    const preloadImages = async () => {
      const imagePaths = getImagePaths(platform);
      
      // Slide 2 images first (they're slower)
      const slide2Images = imagePaths.slide2;
      
      // Other images
      const otherImages = [...imagePaths.slide1, ...imagePaths.slide3];

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
      } catch {
        // Silently fail - images will load normally if prefetch fails
      }
    };

    preloadImages();
  }, [platform]);

  // Reset scroll position to top whenever slide changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }, [currentIndex]);

  // Reset scroll position when platform changes (but keep current slide index)
  useEffect(() => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }, [platform]);

  const handlePlatformSwitch = (newPlatform: DataPlatform) => {
    if (newPlatform === platform) return;
    
    // Animate slide out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: newPlatform === 'uber' ? 20 : -20, // Slide out opposite direction
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPlatform(newPlatform);
      // Keep current slide index - don't reset to 0
      
      // Animate slide in from opposite direction
      slideAnim.setValue(newPlatform === 'uber' ? -20 : 20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

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

  // Get main title based on slide index
  const getMainTitle = () => {
    const titles = ['Request Your Data', 'Wait for the Email', 'Upload Your Zip'];
    return titles[currentIndex] || 'Request Your Data';
  };

  // Animated value for selector position
  const selectorPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(selectorPosition, {
      toValue: platform === 'uber' ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [platform, selectorPosition]);

  const selectorLeft = selectorPosition.interpolate({
    inputRange: [0, 1],
    outputRange: ['4%', '52%'],
  });

  return (
    <LinearGradient colors={currentSlide.gradient as any} style={StyleSheet.absoluteFillObject}>
      <StatusBar hidden />
      {/* Skip Button */}
      <TouchableOpacity style={[styles.skipButton, { top: insets.top + 10 }]} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Preload all images in hidden container for caching - render at full size off-screen */}
      <View style={styles.preloadContainer}>
        {(() => {
          const imagePaths = getImagePaths(platform);
          const allImages = [...imagePaths.slide1, ...imagePaths.slide2, ...imagePaths.slide3];
          return allImages.map((source, index) => (
        <Image 
              key={index}
              source={source} 
              style={styles.preloadImage}
              resizeMode="contain"
            />
          ));
        })()}
      </View>

      <Animated.View 
        style={[
          styles.mainContent, 
          { 
            opacity: fadeAnim, 
            paddingTop: insets.top,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
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

            <Text style={styles.mainTitle}>{getMainTitle()}</Text>

            {/* Platform Selector */}
            <View style={styles.selectorContainer}>
              <Animated.View style={[styles.selectorBackground, { left: selectorLeft }]} />
              <TouchableOpacity
                style={styles.selectorOption}
                onPress={() => handlePlatformSwitch('uber')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.selectorText, 
                  platform === 'uber' && [
                    styles.selectorTextActive,
                    { color: '#667eea' }
                  ]
                ]}>
                  UberEats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectorOption}
                onPress={() => handlePlatformSwitch('doordash')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.selectorText, 
                  platform === 'doordash' && [
                    styles.selectorTextActive,
                    { color: '#FF3000' }
                  ]
                ]}>
                  DoorDash
                </Text>
              </TouchableOpacity>
            </View>

            {currentSlide.title ? (
            <Text style={styles.title}>{currentSlide.title}</Text>
            ) : null}
            {currentSlide.description ? (
            <Text style={styles.description}>{currentSlide.description}</Text>
            ) : null}

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
              {(() => {
                const imagePaths = getImagePaths(platform);
                return (
                  <>
                    {/* Slide 0 images */}
                    <View style={[styles.slideScreenshots, currentIndex !== 0 && styles.hiddenSlide]}>
                      {imagePaths.slide1.map((source, index) => (
                    <Image 
                          key={index}
                          source={source} 
                          style={styles.screenshot}
                      resizeMode="contain"
                          fadeDuration={0}
                    />
                      ))}
                  </View>
                    {/* Slide 1 images */}
                    <View style={[styles.slideScreenshots, currentIndex !== 1 && styles.hiddenSlide]}>
                      {imagePaths.slide2.map((source, index) => (
                    <Image 
                          key={index}
                          source={source} 
                          style={styles.screenshot}
                      resizeMode="contain"
                          fadeDuration={0}
                    />
                      ))}
                  </View>
                    {/* Slide 2 images */}
                    <View style={[styles.slideScreenshots, currentIndex !== 2 && styles.hiddenSlide]}>
                      {imagePaths.slide3.map((source, index) => (
                    <Image 
                          key={index}
                          source={source} 
                          style={styles.screenshot}
                      resizeMode="contain"
                          fadeDuration={0}
                    />
                      ))}
                  </View>
                  </>
                );
              })()}
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
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  selectorContainer: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 30,
    position: 'relative',
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBackground: {
    position: 'absolute',
    width: '48%',
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 0,
    marginBottom: 0,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginLeft: 8,
    marginTop: 0,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  selectorTextActive: {
    fontWeight: 'bold',
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

