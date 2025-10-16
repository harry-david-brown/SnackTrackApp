import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
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

interface Slide {
  gradient: [string, string];
  emoji: string;
  content: React.ReactNode;
}

export default function WrappedShareJourney({ analytics, onClose }: WrappedShareJourneyProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const viewShotRefs = useRef<(ViewShot | null)[]>([]);
  
  const wrapped = analytics.wrappedAnalytics;

  // Reset to first slide when component mounts or analytics changes
  React.useEffect(() => {
    setCurrentSlide(0);
    scrollViewRef.current?.scrollTo({ x: 0, animated: false });
  }, [analytics.totalSpent, analytics.totalReceipts]); // Reset when data changes (new upload)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Build slides dynamically based on available data
  const buildSlides = (): Slide[] => {
    const slides: Slide[] = [];

    // Opening slide - always shown
    slides.push({
      gradient: ['#667eea', '#764ba2'],
      emoji: '🎊',
      content: (
        <>
          <Text style={styles.title}>Your Snack Track</Text>
          <Text style={styles.introText}>Let&apos;s see your entire food delivery history...</Text>
        </>
      ),
    });

    // Total Spent - always shown
    slides.push({
      gradient: ['#ff6b6b', '#ee5a6f'],
      emoji: '😱',
      content: (
        <>
          <Text style={styles.slideTitle}>The Damage</Text>
          <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(analytics.totalSpent)}</Text>
          <Text style={styles.bigNumberLabel}>spent on food delivery</Text>
          <Text style={styles.roastText}>Your wallet is filing for divorce</Text>
        </>
      ),
    });

    // Shame Section
    if (wrapped?.shame.lateNightOrders) {
      const data = wrapped.shame.lateNightOrders;
      slides.push({
        gradient: ['#ff6b6b', '#ffa07a'],
        emoji: '🌙',
        content: (
          <>
            <Text style={styles.slideTitle}>3am Regret</Text>
            <Text style={styles.bigNumber}>{data.count}</Text>
            <Text style={styles.bigNumberLabel}>orders between midnight-6am</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Worst offense: {data.worstOffender.restaurant}</Text>
              <Text style={styles.detailText}>at {data.worstOffender.time} for {formatCurrency(data.worstOffender.amount)}</Text>
            </View>
            <Text style={styles.roastText}>Sleep is free. This wasn&apos;t.</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.laziestDay) {
      const data = wrapped.shame.laziestDay;
      slides.push({
        gradient: ['#f093fb', '#f5576c'],
        emoji: '😴',
        content: (
          <>
            <Text style={styles.slideTitle}>Laziest Day</Text>
            <Text style={styles.bigNumber}>{data.orderCount}</Text>
            <Text style={styles.bigNumberLabel}>orders in one day</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.date)} ({data.dayOfWeek})</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.longestStreak) {
      const data = wrapped.shame.longestStreak;
      slides.push({
        gradient: ['#fa709a', '#fee140'],
        emoji: '🔥',
        content: (
          <>
            <Text style={styles.slideTitle}>Serial Orderer</Text>
            <Text style={styles.bigNumber}>{data.days}</Text>
            <Text style={styles.bigNumberLabel}>consecutive days ordering</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.startDate)} - {formatDate(data.endDate)}</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.chainDependency) {
      const data = wrapped.shame.chainDependency;
      slides.push({
        gradient: ['#ff9a56', '#ff6a88'],
        emoji: '🍔',
        content: (
          <>
            <Text style={styles.slideTitle}>Chain Dependency</Text>
            <Text style={styles.bigNumber}>{data.percentage}%</Text>
            <Text style={styles.bigNumberLabel}>of orders were {data.worstOffender}</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders</Text>
              <Text style={styles.detailText}>{formatCurrency(data.totalSpent)} spent</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.singleItemOrders) {
      const data = wrapped.shame.singleItemOrders;
      slides.push({
        gradient: ['#ffecd2', '#fcb69f'],
        emoji: '🤏',
        content: (
          <>
            <Text style={styles.slideTitle}>Couldn&apos;t Go Get It</Text>
            <Text style={styles.bigNumber}>{data.count}</Text>
            <Text style={styles.bigNumberLabel}>single-item orders</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Most common: {data.mostCommon}</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    // Flex Section
    if (wrapped?.flex.mostExpensiveOrder) {
      const data = wrapped.flex.mostExpensiveOrder;
      slides.push({
        gradient: ['#a8edea', '#fed6e3'],
        emoji: '💰',
        content: (
          <>
            <Text style={styles.slideTitle}>Bougie Moment</Text>
            <Text style={styles.bigNumber}>{formatCurrency(data.amount)}</Text>
            <Text style={styles.bigNumberLabel}>most expensive order</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.restaurant}</Text>
              <Text style={styles.detailText}>{formatDate(data.date)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.flex.coffeeAddiction) {
      const data = wrapped.flex.coffeeAddiction;
      slides.push({
        gradient: ['#c1dfc4', '#deecdd'],
        emoji: '☕',
        content: (
          <>
            <Text style={styles.slideTitle}>Coffee Addiction</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.totalSpent)}</Text>
            <Text style={styles.bigNumberLabel}>spent on coffee</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders</Text>
              <Text style={styles.detailText}>Most ordered: {data.mostOrdered}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.flex.nightOwl) {
      const data = wrapped.flex.nightOwl;
      slides.push({
        gradient: ['#667eea', '#764ba2'],
        emoji: '🦉',
        content: (
          <>
            <Text style={styles.slideTitle}>Night Owl Badge</Text>
            <Text style={styles.bigNumber}>{data.percentage}%</Text>
            <Text style={styles.bigNumberLabel}>orders after 10pm</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.count} late-night orders</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    // Comparative Section
    if (wrapped?.comparative.couldHaveBought) {
      const data = wrapped.comparative.couldHaveBought;
      // Find best comparison: Honda Civic if >2, otherwise use next available
      let selectedComparison = data.comparisons[0];
      
      // Check if first comparison is Honda Civic and quantity <= 2
      if (selectedComparison.item.toLowerCase().includes('honda civic') && selectedComparison.quantity <= 2) {
        // Use the second comparison (groceries) instead
        selectedComparison = data.comparisons[1] || selectedComparison;
      }
      
      slides.push({
        gradient: ['#ffeaa7', '#fdcb6e'],
        emoji: '📱',
        content: (
          <>
            <Text style={styles.slideTitle}>Could Have Bought</Text>
            <Text style={styles.bigNumber}>{selectedComparison.quantity}</Text>
            <Text style={styles.bigNumberLabel}>{selectedComparison.item}</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Instead you spent {formatCurrency(data.totalSpent)}</Text>
              <Text style={styles.detailText}>on food delivery</Text>
            </View>
            <Text style={styles.roastText}>Priorities</Text>
          </>
        ),
      });
    }

    if (wrapped?.comparative.missedInvestment) {
      const data = wrapped.comparative.missedInvestment;
      slides.push({
        gradient: ['#fa8231', '#f9b15d'],
        emoji: '📈',
        content: (
          <>
            <Text style={styles.slideTitle}>The Investment You Didn&apos;t Make</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.wouldBeWorth)}</Text>
            <Text style={styles.bigNumberLabel}>if you&apos;d invested in S&P 500</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>That&apos;s {formatCurrency(data.missedGains)} in missed gains</Text>
            </View>
          </>
        ),
      });
    }

    if (wrapped?.comparative.costPerMeal) {
      const data = wrapped.comparative.costPerMeal;
      slides.push({
        gradient: ['#ff9966', '#ff5e62'],
        emoji: '🏪',
        content: (
          <>
            <Text style={styles.slideTitle}>The Delivery Tax</Text>
            <Text style={styles.bigNumber}>{formatCurrency(data.difference)}</Text>
            <Text style={styles.bigNumberLabel}>extra per meal</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Delivery: {formatCurrency(data.deliveryAverage)}</Text>
              <Text style={styles.detailText}>Groceries: ~{formatCurrency(data.groceryEstimate)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    // Patterns Section
    if (wrapped?.patterns.peakHungerHour) {
      const data = wrapped.patterns.peakHungerHour;
      slides.push({
        gradient: ['#4facfe', '#00f2fe'],
        emoji: '⏰',
        content: (
          <>
            <Text style={styles.slideTitle}>Peak Hunger Hour</Text>
            <Text style={styles.bigNumber}>{data.hourDisplay}</Text>
            <Text style={styles.bigNumberLabel}>your hungriest time</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders ({data.percentageOfTotal}%)</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    if (wrapped?.patterns.weekendWarrior) {
      const data = wrapped.patterns.weekendWarrior;
      const isWeekendMore = data.weekendSpending > data.weekdaySpending;
      slides.push({
        gradient: ['#a18cd1', '#fbc2eb'],
        emoji: isWeekendMore ? '🎉' : '💼',
        content: (
          <>
            <Text style={styles.slideTitle}>{isWeekendMore ? 'Weekend Warrior' : 'Weekday Warrior'}</Text>
            <Text style={styles.bigNumber}>{isWeekendMore ? data.weekendOrders : data.weekdayOrders}</Text>
            <Text style={styles.bigNumberLabel}>{isWeekendMore ? 'weekend' : 'weekday'} orders</Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Weekend: {formatCurrency(data.weekendSpending)}</Text>
              <Text style={styles.detailText}>Weekday: {formatCurrency(data.weekdaySpending)}</Text>
            </View>
            <Text style={styles.roastText}>{data.message}</Text>
          </>
        ),
      });
    }

    // Closing slide
    slides.push({
      gradient: ['#667eea', '#764ba2'],
      emoji: '✨',
      content: (
        <>
          <Text style={styles.title}>That&apos;s Your Year</Text>
          <Text style={styles.subtitle}>{analytics.totalReceipts} orders</Text>
          <Text style={styles.subtitle}>{formatCurrency(analytics.totalSpent)} spent</Text>
          <Text style={styles.introText}>Share your Wrapped Journey with friends!</Text>
        </>
      ),
    });

    return slides;
  };

  const slides = buildSlides();

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentSlide(slideIndex);
  };

  const handleShare = async () => {
    try {
      const ref = viewShotRefs.current[currentSlide];
      if (!ref) return;

      const uri = await ref.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Snack Track Wrapped',
        });
      }
    } catch {
      // Silently fail - sharing is optional
    }
  };

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentSlide + 1) * screenWidth,
        animated: true,
      });
    }
  };

  const goToPrevious = () => {
    if (currentSlide > 0) {
      scrollViewRef.current?.scrollTo({
        x: (currentSlide - 1) * screenWidth,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={32} color="white" />
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide, index) => (
          <ViewShot
            key={index}
            ref={(ref) => {
              viewShotRefs.current[index] = ref;
            }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.slideContainer}
          >
            <LinearGradient
              colors={slide.gradient}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.slideContent}>
                <Text style={styles.emoji}>{slide.emoji}</Text>
                {slide.content}
              </View>
            </LinearGradient>
          </ViewShot>
        ))}
      </ScrollView>

      {/* Navigation Controls */}
      <View style={styles.controls}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentSlide && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          {currentSlide > 0 ? (
            <TouchableOpacity style={styles.navButton} onPress={goToPrevious}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.navButton} />
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>

          {currentSlide < slides.length - 1 ? (
            <TouchableOpacity style={styles.navButton} onPress={goToNext}>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.navButton} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  slideContainer: {
    width: screenWidth,
    height: screenHeight,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  introText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 20,
  },
  slideTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  bigNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    flexShrink: 1,
    paddingHorizontal: 20,
  },
  bigNumberLabel: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  detailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    minWidth: 280,
  },
  detailText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginVertical: 4,
  },
  roastText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  shareText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
