import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { UserSummary } from '../types/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WrappedShareJourneyProps {
  analytics: UserSummary;
  onClose: () => void;
}

interface SlideConfig {
  gradient: string[];
  renderContent: (analytics: UserSummary) => React.ReactElement;
}

export default function WrappedShareJourney({ analytics, onClose }: WrappedShareJourneyProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const viewShotRefs = useRef<(ViewShot | null)[]>([]);

  // Entrance animation
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(true);
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate comparisons
  const starbucksLattes = Math.floor(analytics.totalSpent / 6);
  const iPhones = (analytics.totalSpent / 1000).toFixed(1);
  const mostExpensiveOrder = analytics.topRestaurants.reduce((max, r) => 
    r.totalSpent > max ? r.totalSpent : max, 0
  );
  const topRestaurant = analytics.topRestaurants[0];

  const slides: SlideConfig[] = [
    // Slide 1: The Damage
    {
      gradient: ['#ff6b6b', '#ee5a6f'],
      renderContent: (data) => (
        <View style={styles.slideContent}>
          <Text style={styles.emoji}>😱</Text>
          <Text style={styles.slideTitle}>The Damage</Text>
          <View style={styles.bigNumberContainer}>
            <Text style={styles.bigNumber}>{formatCurrency(data.totalSpent)}</Text>
            <Text style={styles.bigNumberLabel}>spent on food delivery</Text>
          </View>
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonText}>That is {starbucksLattes} Starbucks lattes</Text>
            <Text style={styles.comparisonSubtext}>or {iPhones} iPhone 15s</Text>
          </View>
          <Text style={styles.roastText}>Your wallet is filing for divorce</Text>
        </View>
      ),
    },
    // Slide 2: Most Expensive Order
    {
      gradient: ['#f093fb', '#f5576c'],
      renderContent: (data) => (
        <View style={styles.slideContent}>
          <Text style={styles.emoji}>💸</Text>
          <Text style={styles.slideTitle}>Your Guilty Pleasure</Text>
          <View style={styles.expensiveOrderBox}>
            <Text style={styles.expensiveAmount}>{formatCurrency(mostExpensiveOrder)}</Text>
            <Text style={styles.expensiveLabel}>at {topRestaurant?.name || 'Unknown'}</Text>
          </View>
          <Text style={styles.roastText}>Remember that night?</Text>
          <Text style={styles.roastSubtext}>Neither does your bank account</Text>
        </View>
      ),
    },
    // Slide 3: Repeat Offender
    {
      gradient: ['#4facfe', '#00f2fe'],
      renderContent: (data) => {
        const topRest = data.topRestaurants[0];
        return (
          <View style={styles.slideContent}>
            <Text style={styles.emoji}>🔁</Text>
            <Text style={styles.slideTitle}>Repeat Offender</Text>
            <View style={styles.repeatBox}>
              <Text style={styles.repeatRestaurant}>{topRest?.name || 'Unknown'}</Text>
              <View style={styles.repeatStats}>
                <Text style={styles.repeatNumber}>{topRest?.count || 0}</Text>
                <Text style={styles.repeatLabel}>orders</Text>
              </View>
              <Text style={styles.repeatSpent}>{formatCurrency(topRest?.totalSpent || 0)} spent</Text>
            </View>
            <Text style={styles.roastText}>They should name a menu item after you</Text>
            <Text style={styles.roastSubtext}>You are single-handedly keeping them in business</Text>
          </View>
        );
      },
    },
    // Slide 4: Yearly/Monthly Bloodbath
    {
      gradient: ['#667eea', '#764ba2'],
      renderContent: (data) => {
        // Group by year and sum spending
        const yearlyData: { [key: string]: number } = {};
        data.monthlyBreakdown.forEach((month) => {
          const monthStr = String(month.month);
          const year = monthStr.includes('-') ? monthStr.split('-')[0] : new Date().getFullYear().toString();
          yearlyData[year] = (yearlyData[year] || 0) + month.totalSpent;
        });

        const years = Object.keys(yearlyData).sort(); // Oldest to newest
        const useYearly = years.length > 1; // Use yearly if multiple years
        
        // Prepare data based on yearly vs monthly
        let chartData: Array<{ label: string; amount: number }> = [];
        
        if (useYearly) {
          // Show yearly data
          chartData = years.map(year => ({
            label: year,
            amount: yearlyData[year],
          }));
        } else {
          // Show monthly data (reversed to go oldest to newest)
          chartData = [...data.monthlyBreakdown]
            .reverse()
            .slice(0, 6)
            .map((monthData) => {
              const monthStr = String(monthData.month);
              let label = 'N/A';
              if (monthStr.includes('-')) {
                const monthNum = parseInt(monthStr.split('-')[1]);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                label = monthNames[monthNum - 1] || monthStr.substring(0, 3);
              } else {
                label = monthStr.substring(0, 3);
              }
              return { label, amount: monthData.totalSpent };
            });
        }
        
        const maxSpent = Math.max(...chartData.map(d => d.amount));
        const title = useYearly ? 'The Yearly Bloodbath' : 'The Monthly Bloodbath';
        
        return (
          <View style={styles.slideContent}>
            <Text style={styles.emoji}>📊</Text>
            <Text style={styles.slideTitle}>{title}</Text>
            <View style={styles.chartContainer}>
              {chartData.map((item, index) => {
                const height = Math.max(60, (item.amount / maxSpent) * 180);
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.barAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                      ${Math.round(item.amount)}
                    </Text>
                    <Text style={styles.barLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.roastText}>Look at that beautiful disaster</Text>
            <Text style={styles.roastSubtext}>{data.totalReceipts} receipts of regret</Text>
          </View>
        );
      },
    },
    // Slide 5: Share Your Shame
    {
      gradient: ['#43e97b', '#38f9d7'],
      renderContent: () => (
        <View style={styles.slideContent}>
          <Text style={styles.emoji}>🔥</Text>
          <Text style={styles.slideTitle}>Ready to Share Your Shame?</Text>
          <Text style={styles.shareDescription}>
            Show your friends how much you have wasted on food delivery
          </Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.shareButtonGradient}
            >
              <Ionicons name="share-social" size={24} color="white" />
              <Text style={styles.shareButtonText}>Share to Social Media</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50 && currentSlide < slides.length - 1) {
          goToNextSlide();
        } else if (gestureState.dx > 50 && currentSlide > 0) {
          goToPreviousSlide();
        }
      },
    })
  ).current;

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: currentSlide + 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlide > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: currentSlide - 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentSlide(currentSlide - 1);
    }
  };

  const captureSlide = async (slideIndex: number): Promise<string> => {
    const viewShot = viewShotRefs.current[slideIndex];
    if (!viewShot || !viewShot.capture) {
      throw new Error('ViewShot ref not found');
    }

    try {
      const uri = await viewShot.capture();
      return uri;
    } catch (error) {
      throw error;
    }
  };

  const handleShare = async () => {
    try {
      // Capture Slide 1 (The Damage) - the main summary slide
      const uri = await captureSlide(0);
      
      // Share using native sheet
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your food delivery spending',
      });
    } catch (error) {
      // Silently fail - user can try again
    }
  };

  const currentSlideConfig = slides[currentSlide];

  return (
    <View style={styles.container}>
      <LinearGradient colors={currentSlideConfig.gradient as any} style={styles.gradient}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index === currentSlide && styles.progressBarActive,
              ]}
            />
          ))}
        </View>

        {/* Pre-render all slides for sharing (hidden) */}
        <View style={styles.hiddenSlides}>
          {slides.map((slide, index) => (
            <ViewShot
              key={index}
              ref={(ref) => {
                if (ref) {
                  viewShotRefs.current[index] = ref;
                }
              }}
              options={{
                fileName: `snack-track-wrapped-${index}`,
                format: 'png',
                quality: 1.0,
              }}
              style={styles.viewShot}
            >
              <LinearGradient colors={slide.gradient as any} style={styles.viewShotGradient}>
                {slide.renderContent(analytics)}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>snacktrack.app</Text>
                </View>
              </LinearGradient>
            </ViewShot>
          ))}
        </View>

        {/* Swipeable Content (visible) */}
        <Animated.View
          style={[styles.contentContainer, { opacity: fadeAnim }]}
          {...panResponder.panHandlers}
        >
          <LinearGradient colors={currentSlideConfig.gradient as any} style={styles.visibleSlide}>
            {currentSlideConfig.renderContent(analytics)}
          </LinearGradient>
        </Animated.View>

        {/* Navigation Arrows */}
        {currentSlide > 0 && (
          <TouchableOpacity style={styles.navLeft} onPress={goToPreviousSlide}>
            <Ionicons name="chevron-back" size={32} color="white" />
          </TouchableOpacity>
        )}
        {currentSlide < slides.length - 1 && (
          <TouchableOpacity style={styles.navRight} onPress={goToNextSlide}>
            <Ionicons name="chevron-forward" size={32} color="white" />
          </TouchableOpacity>
        )}
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: 'white',
  },
  hiddenSlides: {
    position: 'absolute',
    top: -10000,
    left: -10000,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  visibleSlide: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewShot: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.75,
  },
  viewShotGradient: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    paddingBottom: 60,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  bigNumberContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bigNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
  },
  bigNumberLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  comparisonBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  comparisonText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  comparisonSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  roastText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  roastSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  expensiveOrderBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
  },
  expensiveAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  expensiveLabel: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  repeatBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    minWidth: '80%',
  },
  repeatRestaurant: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  repeatStats: {
    alignItems: 'center',
    marginBottom: 16,
  },
  repeatNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
  },
  repeatLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  repeatSpent: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 200,
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    width: '100%',
    minHeight: 60,
  },
  barAmount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    marginTop: 6,
  },
  shareDescription: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  shareButton: {
    width: '100%',
    marginBottom: 16,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  navLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  navRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
});

