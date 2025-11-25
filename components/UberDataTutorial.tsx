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
  const [imageHeights, setImageHeights] = useState<{ [key: number]: number[] }>({});
  const [imagesLoaded, setImagesLoaded] = useState<{ [key: number]: boolean }>({});
  const [imagesActuallyLoaded, setImagesActuallyLoaded] = useState<{ [key: number]: Set<number> }>({});
  const loadingRef = useRef<Set<number>>(new Set());
  
  // Track when individual images are actually loaded
  const handleImageLoad = (slideIndex: number, imageIndex: number) => {
    setImagesActuallyLoaded(prev => {
      const loaded = prev[slideIndex] || new Set();
      loaded.add(imageIndex);
      return { ...prev, [slideIndex]: new Set(loaded) };
    });
  };
  
  // Helper function to load images for a specific slide index
  const loadSlideImages = (slideIndex: number) => {
    // Prevent duplicate loads
    if (loadingRef.current.has(slideIndex) || imagesLoaded[slideIndex]) {
      return;
    }
    
    loadingRef.current.add(slideIndex);
    const imageWidth = width * 0.9;
    let imageSources: any[] = [];
    
    if (slideIndex === 0) {
      imageSources = [
        require('../assets/UberDataTutorialPNGs/1/1.webp'),
        require('../assets/UberDataTutorialPNGs/1/2.webp'),
        require('../assets/UberDataTutorialPNGs/1/3.webp'),
        require('../assets/UberDataTutorialPNGs/1/4.webp'),
      ];
    } else if (slideIndex === 1) {
      imageSources = [
        require('../assets/UberDataTutorialPNGs/2/1.webp'),
        require('../assets/UberDataTutorialPNGs/2/2.webp'),
        require('../assets/UberDataTutorialPNGs/2/3.webp'),
      ];
    } else if (slideIndex === 2) {
      imageSources = [
        require('../assets/UberDataTutorialPNGs/3/1.webp'),
        require('../assets/UberDataTutorialPNGs/3/2.webp'),
      ];
    }
    
    if (imageSources.length === 0) {
      loadingRef.current.delete(slideIndex);
      return;
    }
    
    // Calculate heights and mark as ready
    // Note: For local require() assets, React Native will load them when rendered
    // We'll render them off-screen to preload them
    const imageUris = imageSources.map(source => Image.resolveAssetSource(source).uri);
    
    Promise.all(
      imageUris.map((uri) => 
        new Promise<number>((resolve) => {
          Image.getSize(
            uri,
            (imgWidth, imgHeight) => {
              const aspectRatio = imgHeight / imgWidth;
              resolve(imageWidth * aspectRatio);
            },
            () => resolve(400) // fallback
          );
        })
      )
    ).then((heights) => {
      setImageHeights(prev => ({ ...prev, [slideIndex]: heights }));
      setImagesLoaded(prev => ({ ...prev, [slideIndex]: true }));
      loadingRef.current.delete(slideIndex);
    });
  };
  
  // Load all slide images on mount
  useEffect(() => {
    // Load images for all slides immediately
    for (let i = 0; i < slides.length; i++) {
      loadSlideImages(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    // Ensure current slide images are loaded (in case they weren't loaded on mount)
    loadSlideImages(currentIndex);
    
    // Ensure next slide's images are loaded
    const nextIndex = currentIndex + 1;
    if (nextIndex < slides.length) {
      loadSlideImages(nextIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // For first slide, wait for heights to be calculated AND first image to actually load
  // Check if first image (index 0) is loaded
  const firstImageLoaded = imagesActuallyLoaded[0]?.has(0) || false;
  const isFirstSlideLoading = currentIndex === 0 && (!imagesLoaded[0] || !firstImageLoaded);

  return (
    <LinearGradient colors={currentSlide.gradient as any} style={StyleSheet.absoluteFillObject}>
      <StatusBar hidden />
      {/* Skip Button */}
      <TouchableOpacity style={[styles.skipButton, { top: insets.top + 10 }]} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Off-screen image preloader - preload all slide images */}
      <View style={styles.preloadContainer} pointerEvents="none">
        {/* Preload slide 1 images */}
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/1.webp')} 
          style={[styles.preloadImage, imageHeights[0]?.[0] ? { height: imageHeights[0][0] } : { height: 400 }]}
          onLoad={() => handleImageLoad(0, 0)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/2.webp')} 
          style={[styles.preloadImage, imageHeights[0]?.[1] ? { height: imageHeights[0][1] } : { height: 400 }]}
          onLoad={() => handleImageLoad(0, 1)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/3.webp')} 
          style={[styles.preloadImage, imageHeights[0]?.[2] ? { height: imageHeights[0][2] } : { height: 400 }]}
          onLoad={() => handleImageLoad(0, 2)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/1/4.webp')} 
          style={[styles.preloadImage, imageHeights[0]?.[3] ? { height: imageHeights[0][3] } : { height: 400 }]}
          onLoad={() => handleImageLoad(0, 3)}
        />
        {/* Preload slide 2 images */}
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/1.webp')} 
          style={[styles.preloadImage, imageHeights[1]?.[0] ? { height: imageHeights[1][0] } : { height: 400 }]}
          onLoad={() => handleImageLoad(1, 0)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/2.webp')} 
          style={[styles.preloadImage, imageHeights[1]?.[1] ? { height: imageHeights[1][1] } : { height: 400 }]}
          onLoad={() => handleImageLoad(1, 1)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/2/3.webp')} 
          style={[styles.preloadImage, imageHeights[1]?.[2] ? { height: imageHeights[1][2] } : { height: 400 }]}
          onLoad={() => handleImageLoad(1, 2)}
        />
        {/* Preload slide 3 images */}
        <Image 
          source={require('../assets/UberDataTutorialPNGs/3/1.webp')} 
          style={[styles.preloadImage, imageHeights[2]?.[0] ? { height: imageHeights[2][0] } : { height: 400 }]}
          onLoad={() => handleImageLoad(2, 0)}
        />
        <Image 
          source={require('../assets/UberDataTutorialPNGs/3/2.webp')} 
          style={[styles.preloadImage, imageHeights[2]?.[1] ? { height: imageHeights[2][1] } : { height: 400 }]}
          onLoad={() => handleImageLoad(2, 1)}
        />
      </View>

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, paddingTop: insets.top }]}>
          {isFirstSlideLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
          <ScrollView 
            key={currentIndex}
            style={[styles.scrollView, isFirstSlideLoading && styles.hiddenContent]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
            pointerEvents={isFirstSlideLoading ? 'none' : 'auto'}
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

            {/* Screenshots - render immediately to start loading */}
            {currentIndex === 0 && imageHeights[0] ? (
                <View style={styles.screenshotContainer}>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/1/1.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[0][0] }
                      ]}
                      resizeMode="contain"
                      onLoad={() => handleImageLoad(0, 0)}
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/1/2.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[0][1] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/1/3.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[0][2] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/1/4.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[0][3] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : currentIndex === 1 && imageHeights[1] ? (
                <View style={styles.screenshotContainer}>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/2/1.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[1][0] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/2/2.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[1][1] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/2/3.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[1][2] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : currentIndex === 2 && imageHeights[2] ? (
                <View style={styles.screenshotContainer}>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/3/1.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[2][0] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={require('../assets/UberDataTutorialPNGs/3/2.webp')} 
                      style={[
                        styles.screenshot,
                        { height: imageHeights[2][1] }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.screenshotPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.placeholderText}>Loading screenshots...</Text>
                </View>
              )}
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  hiddenContent: {
    opacity: 0,
  },
  preloadContainer: {
    position: 'absolute',
    left: -width * 2,
    top: 0,
    width: width * 0.9,
    overflow: 'hidden',
    opacity: 0.01,
    zIndex: -1,
  },
  preloadImage: {
    width: '100%',
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
  screenshotContainer: {
    width: '100%',
    marginTop: 0,
    alignItems: 'center',
  },
  screenshotWrapper: {
    width: width * 0.9,
    marginBottom: 15,
    alignItems: 'center',
  },
  screenshot: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 10,
    borderColor: 'rgb(255, 255, 255)',
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

