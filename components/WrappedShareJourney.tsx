import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { UserSummary } from '../types/api';
import { getDeterministicMessage } from '../utils/wrappedMessages';
import { useCurrency } from '../contexts/CurrencyContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// HelloFresh Affiliate Configuration
const HELLOFRESH_CONFIG = {
  affiliateUrl: 'https://www.hellofresh.com/pages/plans?c=SNACKTRACK&utm_source=snacktrack&utm_medium=app',
  mealPricePerServing: 9.99, // Average HelloFresh meal price per serving
};

// Responsive story safe zones
const SAFE_TOP = Math.round(screenHeight * 0.09);   // keep clear of IG chrome
const SAFE_BOTTOM = Math.round(screenHeight * 0.10);
const SAFE_SIDE = Math.max(24, Math.round(screenWidth * 0.06));

// Responsive type scales (keeps big numbers "hero" without wrapping)
const EMOJI_SIZE = Math.min(92, Math.max(72, Math.round(screenWidth * 0.22)));
const BIG_STAT_SIZE = Math.min(84, Math.max(60, Math.round(screenWidth * 0.18)));
const TITLE_SIZE = Math.min(46, Math.max(38, Math.round(screenWidth * 0.12)));
const SUBTITLE_SIZE = Math.min(32, Math.max(26, Math.round(screenWidth * 0.085)));

// Story export size (1080x1920) - reserved for future export functionality
// const EXPORT_W = 1080;
// const EXPORT_H = 1920;

// Curated gradients tuned for share compression
export const STORY_GRADIENTS = {
  amethyst: {
    colors: ['#6E61FF', '#B960FF', '#9E3EFF'],
    locations: [0, 0.52, 1],
  },
  flamingo: {
    colors: ['#FF6B6B', '#FF7FA0', '#EE5A6F'],
    locations: [0, 0.52, 1],
  },
  sunrise: {
    colors: ['#FA709A', '#FF9E6E', '#FEE140'],
    locations: [0, 0.52, 1],
  },
  tangerine: {
    colors: ['#FF9966', '#FF7F6A', '#FF5E62'],
    locations: [0, 0.52, 1],
  },
  lagoon: {
    colors: ['#4FACFE', '#29D1FE', '#00F2FE'],
    locations: [0, 0.52, 1],
  },
  orchid: {
    colors: ['#A18CD1', '#D6A6E3', '#FBC2EB'],
    locations: [0, 0.52, 1],
  },
  mango: {
    colors: ['#FFEAA7', '#FFD890', '#FDCB6E'],
    locations: [0, 0.52, 1],
  },
  ember: {
    colors: ['#FA8231', '#F99A4A', '#F9B15D'],
    locations: [0, 0.52, 1],
  },
  mint: {
    colors: ['#C1DFC4', '#D1E7CF', '#DEECDD'],
    locations: [0, 0.52, 1],
  },
  cotton: {
    colors: ['#A8EDEA', '#D7F1EF', '#FED6E3'],
    locations: [0, 0.52, 1],
  },
  hellofresh: {
    colors: ['#99CC33', '#85C442', '#6FB04F'],
    locations: [0, 0.52, 1],
  },
} as const;

interface WrappedShareJourneyProps {
  analytics: UserSummary;
  onClose: () => void;
}

interface Slide {
  gradient: keyof typeof STORY_GRADIENTS;
  emoji: string;
  image?: any; // For logo images
  content: React.ReactNode;
}

export default function WrappedShareJourney({ analytics, onClose }: WrappedShareJourneyProps) {
  const insets = useSafeAreaInsets();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const viewShotRefs = useRef<(ViewShot | null)[]>([]);

  const wrapped = analytics.wrappedAnalytics;

  // Reset to first slide when component mounts
  React.useEffect(() => {
    setCurrentSlide(0);
    setIsReady(false);

    // Force scroll to first slide immediately
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      setIsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []); // Only run on mount

  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyFromContext(amount);
  }, [formatCurrencyFromContext]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const handleAffiliateClick = useCallback(async () => {
    try {
      // Track affiliate click (you can add analytics here)
      const canOpen = await Linking.canOpenURL(HELLOFRESH_CONFIG.affiliateUrl);
      if (canOpen) {
        await Linking.openURL(HELLOFRESH_CONFIG.affiliateUrl);
      }
    } catch {
      // Silently fail - affiliate link is optional
    }
  }, []);

  // Calculate annual savings for HelloFresh slide
  const calculateAnnualSavings = useCallback(() => {
    // Use monthly breakdown if available, otherwise estimate from total
    if (analytics.monthlyBreakdown && analytics.monthlyBreakdown.length > 0) {
      // Calculate average monthly spending
      const avgMonthlySpent = analytics.monthlyBreakdown.reduce((sum, month) => sum + month.totalSpent, 0) / analytics.monthlyBreakdown.length;
      const avgMonthlyOrders = analytics.monthlyBreakdown.reduce((sum, month) => sum + month.receiptCount, 0) / analytics.monthlyBreakdown.length;

      // Assume 1 meal per order for delivery
      const avgMonthlyMeals = avgMonthlyOrders;
      const avgCostPerMeal = avgMonthlyMeals > 0 ? avgMonthlySpent / avgMonthlyMeals : analytics.averageOrderValue;

      // Calculate savings per meal
      const savingsPerMeal = Math.max(0, avgCostPerMeal - HELLOFRESH_CONFIG.mealPricePerServing);

      // Project to annual (12 months)
      const annualSavings = savingsPerMeal * avgMonthlyMeals * 12;
      return { annualSavings, savingsPerMeal };
    } else {
      // Fallback: use total data
      const avgCostPerMeal = analytics.averageOrderValue;
      const savingsPerMeal = Math.max(0, avgCostPerMeal - HELLOFRESH_CONFIG.mealPricePerServing);
      // Estimate: assume 1 meal per order
      const annualSavings = savingsPerMeal * analytics.totalReceipts;
      return { annualSavings, savingsPerMeal };
    }
  }, [analytics]);

  // Build slides dynamically based on available data
  // Memoized to prevent recalculation on every render
  const buildSlides = useCallback((): Slide[] => {
    const slides: Slide[] = [];

    // Opening slide - always shown
    slides.push({
      gradient: 'amethyst',
      emoji: '🎊',
      content: (
        <>
          <Text style={styles.title}>Your SnackTrack</Text>
          <Text style={styles.introText}>Let&apos;s see your entire food delivery history...</Text>
        </>
      ),
    });

    // Total Spent - always shown
    const totalDamageMessage = getDeterministicMessage('totalDamage', analytics, undefined, 0);
    slides.push({
      gradient: 'flamingo',
      emoji: '😱',
      content: (
        <>
          <Text style={styles.slideTitle}>The Damage</Text>
          <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(analytics.totalSpent)}</Text>
          <Text style={styles.bigNumberLabel}>spent on food delivery</Text>
          <Spacer h={6} />
          <Text style={styles.roastText}>{totalDamageMessage}</Text>
        </>
      ),
    });

    // Yearly Spent - new slide before 3am orders
    if (wrapped?.comparative?.spentThisYear) {
      const data = wrapped.comparative.spentThisYear;
      const spentThisYearMessage = getDeterministicMessage('spentThisYear', analytics, data.totalSpent, 14);
      slides.push({
        gradient: 'lagoon',
        emoji: '📅',
        content: (
          <>
            <Spacer h={20} />
            <Text style={styles.slideTitle}>This Year</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.totalSpent)}</Text>
            <Text style={styles.bigNumberLabel}>spent this year</Text>
            <Spacer h={6} />
            <Text style={styles.roastText}>{spentThisYearMessage}</Text>
          </>
        ),
      });
    }

    // Shame Section
    if (wrapped?.shame.lateNightOrders) {
      const data = wrapped.shame.lateNightOrders;
      const lateNightMessage = getDeterministicMessage('lateNightOrders', analytics, data.count, 1);
      slides.push({
        gradient: 'tangerine',
        emoji: '🌙',
        content: (
          <>
            <Text style={styles.slideTitle}>3am Regret</Text>
            <Text style={styles.bigNumber}>{data.count}</Text>
            <Text style={styles.bigNumberLabel}>orders between midnight-6am</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Worst offense: {data.worstOffender.restaurant}</Text>
              <Text style={styles.detailText}>at {data.worstOffender.time} for {formatCurrency(data.worstOffender.amount)}</Text>
            </View>
            <Text style={styles.roastText}>{lateNightMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.laziestDay) {
      const data = wrapped.shame.laziestDay;
      const laziestDayMessage = getDeterministicMessage('laziestDay', analytics, data.orderCount, 2);
      slides.push({
        gradient: 'sunrise',
        emoji: '😴',
        content: (
          <>
            <Text style={styles.slideTitle}>Laziest Day</Text>
            <Text style={styles.bigNumber}>{data.orderCount}</Text>
            <Text style={styles.bigNumberLabel}>orders in one day</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.date)} ({data.dayOfWeek})</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{laziestDayMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.longestStreak) {
      const data = wrapped.shame.longestStreak;
      const streakMessage = getDeterministicMessage('consecutiveDays', analytics, data.days, 3);
      slides.push({
        gradient: 'ember',
        emoji: '🔥',
        content: (
          <>
            <Text style={styles.slideTitle}>Serial Orderer</Text>
            <Text style={styles.bigNumber}>{data.days}</Text>
            <Text style={styles.bigNumberLabel}>consecutive days ordering</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.startDate)} - {formatDate(data.endDate)}</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{streakMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.chainDependency) {
      const data = wrapped.shame.chainDependency;
      const chainMessage = getDeterministicMessage('chainDependency', analytics, data.worstOffender, 4);
      slides.push({
        gradient: 'mango',
        emoji: '🍔',
        content: (
          <>
            <Text style={styles.slideTitle}>Chain Dependency</Text>
            <Text style={styles.bigNumber}>{data.percentage}%</Text>
            <Text style={styles.bigNumberLabel}>of orders were {data.worstOffender}</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders</Text>
              <Text style={styles.detailText}>{formatCurrency(data.totalSpent)} spent</Text>
            </View>
            <Text style={styles.roastText}>{chainMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.shame.singleItemOrders) {
      const data = wrapped.shame.singleItemOrders;
      const singleItemMessage = getDeterministicMessage('singleItemOrders', analytics, data.count, 5);
      slides.push({
        gradient: 'cotton',
        emoji: '🤏',
        content: (
          <>
            <Text style={styles.slideTitle}>Couldn&apos;t Go Get It</Text>
            <Text style={styles.bigNumber}>{data.count}</Text>
            <Text style={styles.bigNumberLabel}>single-item orders</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Most common: {data.mostCommon}</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{singleItemMessage}</Text>
          </>
        ),
      });
    }

    // Flex Section
    if (wrapped?.flex.mostExpensiveOrder) {
      const data = wrapped.flex.mostExpensiveOrder;
      const expensiveMessage = getDeterministicMessage('mostExpensiveOrder', analytics, data.amount, 6);
      slides.push({
        gradient: 'lagoon',
        emoji: '💰',
        content: (
          <>
            <Text style={styles.slideTitle}>Bougie Moment</Text>
            <Text style={styles.bigNumber}>{formatCurrency(data.amount)}</Text>
            <Text style={styles.bigNumberLabel}>most expensive order</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.restaurant}</Text>
              <Text style={styles.detailText}>{formatDate(data.date)}</Text>
            </View>
            <Text style={styles.roastText}>{expensiveMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.flex.coffeeAddiction) {
      const data = wrapped.flex.coffeeAddiction;
      const coffeeMessage = getDeterministicMessage('coffeeSpending', analytics, data.totalSpent, 7);
      slides.push({
        gradient: 'mint',
        emoji: '☕',
        content: (
          <>
            <Text style={styles.slideTitle}>Coffee Addiction</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.totalSpent)}</Text>
            <Text style={styles.bigNumberLabel}>spent on coffee</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders</Text>
              <Text style={styles.detailText}>Most ordered: {data.mostOrdered}</Text>
            </View>
            <Text style={styles.roastText}>{coffeeMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.flex.nightOwl) {
      const data = wrapped.flex.nightOwl;
      const nightOwlMessage = getDeterministicMessage('nightOwlPercentage', analytics, data.percentage, 8);
      slides.push({
        gradient: 'orchid',
        emoji: '🦉',
        content: (
          <>
            <Text style={styles.slideTitle}>Night Owl Badge</Text>
            <Text style={styles.bigNumber}>{data.percentage}%</Text>
            <Text style={styles.bigNumberLabel}>orders after 10pm</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.count} late-night orders</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <Text style={styles.roastText}>{nightOwlMessage}</Text>
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

      // Choose emoji based on what we're showing
      let emoji = '📱'; // default to phone
      const itemLower = selectedComparison.item.toLowerCase();
      if (itemLower.includes('trip') || itemLower.includes('europe')) {
        emoji = '✈️';
      } else if (itemLower.includes('grocery') || itemLower.includes('food')) {
        emoji = '🛒';
      } else if (itemLower.includes('phone') || itemLower.includes('iphone')) {
        emoji = '📱';
      } else if (itemLower.includes('civic') || itemLower.includes('car')) {
        emoji = '🚗';
      }

      const couldHaveBoughtMessage = getDeterministicMessage('couldHaveBought', analytics, undefined, 9);
      slides.push({
        gradient: 'mango',
        emoji: emoji,
        content: (
          <>
            <Text style={styles.slideTitle}>Could Have Bought</Text>
            <Text style={styles.bigNumber}>{selectedComparison.quantity}</Text>
            <Text style={styles.bigNumberLabel}>{selectedComparison.item}</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Instead you spent {formatCurrency(data.totalSpent)}</Text>
              <Text style={styles.detailText}>on food delivery</Text>
            </View>
            <Text style={styles.roastText}>{couldHaveBoughtMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.comparative.missedInvestment) {
      const data = wrapped.comparative.missedInvestment;
      const investmentMessage = getDeterministicMessage('missedInvestment', analytics, data.missedGains, 10);
      slides.push({
        gradient: 'ember',
        emoji: '📈',
        content: (
          <>
            <Text style={styles.slideTitle}>The Investment You Didn&apos;t Make</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.wouldBeWorth)}</Text>
            <Text style={styles.bigNumberLabel}>if you&apos;d invested in S&P 500</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>That&apos;s {formatCurrency(data.missedGains)} in missed gains</Text>
            </View>
            <Text style={styles.roastText}>{investmentMessage}</Text>
          </>
        ),
      });
    }

    // Delivery Tax slide - shown when cost per meal data is available
    // (Available for users with delivery fee data, regardless of platform)
    if (wrapped?.comparative.costPerMeal) {
      const data = wrapped.comparative.costPerMeal;
      const costPerMealMessage = getDeterministicMessage('costPerMeal', analytics, data.averageDeliveryFeePerMeal, 11);
      slides.push({
        gradient: 'tangerine',
        emoji: '🏪',
        content: (
          <>
            <Text style={styles.slideTitle}>The Delivery Tax</Text>
            <Text style={styles.bigNumber}>{formatCurrency(data.averageDeliveryFeePerMeal)}</Text>
            <Text style={styles.bigNumberLabel}>extra per meal</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Total fees: {formatCurrency(data.totalDeliveryFees)}</Text>
              <Text style={styles.detailText}>Across {data.totalOrders} orders</Text>
            </View>
            <Text style={styles.roastText}>{costPerMealMessage}</Text>
          </>
        ),
      });
    }

    // Patterns Section
    // Waiting Time slide - available for both Uber Eats and DoorDash users
    // (Only shown when delivery time data is available)
    if (wrapped?.patterns.deliveryWaits) {
      const data = wrapped.patterns.deliveryWaits;
      // Format total time - show hours if >= 1 hour, otherwise show minutes
      const totalHours = (data.totalMinutes / 60).toFixed(1);
      const totalDays = (data.totalMinutes / (60 * 24)).toFixed(1);
      const formattedTotalTime = parseFloat(totalHours) >= 24
        ? `${totalDays} days`
        : parseFloat(totalHours) >= 1
          ? `${totalHours} hours`
          : `${data.totalMinutes} minutes`;

      // Get deterministic roast message based on total waiting time
      const waitingTimeMessage = getDeterministicMessage('deliveryWaits', analytics, data.totalMinutes, 14);

      slides.push({
        gradient: 'sunrise',
        emoji: '⏱️',
        content: (
          <>
            <Text style={styles.slideTitle}>Waiting Time</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formattedTotalTime}</Text>
            <Text style={styles.bigNumberLabel}>spent waiting for delivery</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.totalMinutes.toLocaleString()} minutes across {data.totalOrders} orders</Text>
              <Text style={styles.detailText}>Average: {data.averageMinutes} minutes per order</Text>
              {data.fastestDelivery && (
                <Text style={styles.detailText}>Fastest: {data.fastestDelivery.minutes} min at {data.fastestDelivery.restaurant}</Text>
              )}
              {data.longestWait && (
                <Text style={styles.detailText}>Longest: {data.longestWait.minutes} min at {data.longestWait.restaurant}</Text>
              )}

            </View>
            <Text style={styles.roastText}>{waitingTimeMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.patterns.peakHungerHour) {
      const data = wrapped.patterns.peakHungerHour;
      const peakHungerMessage = getDeterministicMessage('peakHungerHour', analytics, data.hour, 12);
      slides.push({
        gradient: 'lagoon',
        emoji: '⏰',
        content: (
          <>
            <Text style={styles.slideTitle}>Peak Hunger Hour</Text>
            <Text style={styles.bigNumber}>{data.hourDisplay}</Text>
            <Text style={styles.bigNumberLabel}>your hungriest time</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders ({data.percentageOfTotal}%)</Text>
            </View>
            <Text style={styles.roastText}>{peakHungerMessage}</Text>
          </>
        ),
      });
    }

    if (wrapped?.patterns.weekendWarrior) {
      const data = wrapped.patterns.weekendWarrior;
      const isWeekendMore = data.weekendSpending > data.weekdaySpending;
      const weekendWarriorMessage = getDeterministicMessage('weekendWarrior', analytics, undefined, 13);
      slides.push({
        gradient: 'orchid',
        emoji: isWeekendMore ? '🎉' : '💼',
        content: (
          <>
            <Text style={styles.slideTitle}>{isWeekendMore ? 'Weekend Warrior' : 'Weekday Warrior'}</Text>
            <Text style={styles.bigNumber}>{isWeekendMore ? data.weekendOrders : data.weekdayOrders}</Text>
            <Text style={styles.bigNumberLabel}>{isWeekendMore ? 'weekend' : 'weekday'} orders</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Weekend: {formatCurrency(data.weekendSpending)}</Text>
              <Text style={styles.detailText}>Weekday: {formatCurrency(data.weekdaySpending)}</Text>
            </View>
            <Text style={styles.roastText}>{weekendWarriorMessage}</Text>
          </>
        ),
      });
    }

    // Closing slide
    slides.push({
      gradient: 'amethyst',
      emoji: '✨',
      content: (
        <>
          <Text style={styles.title}>That&apos;s Your Year</Text>
          <Text style={styles.subtitle}>{wrapped?.comparative?.spentThisYear?.orderCount ?? analytics.totalReceipts} orders</Text>
          <Text style={styles.subtitle}>{formatCurrency(wrapped?.comparative?.spentThisYear?.totalSpent ?? analytics.totalSpent)} spent</Text>
          <Text style={styles.introText}>Share your Wrapped Journey with friends!</Text>
        </>
      ),
    });

    // All Time Stats Slide
    slides.push({
      gradient: 'flamingo',
      emoji: '🏆',
      content: (
        <>
          <Text style={styles.title}>All Time Stats</Text>
          <Text style={styles.subtitle}>{analytics.totalReceipts} total orders</Text>
          <Text style={styles.subtitle}>{formatCurrency(analytics.totalSpent)} total spent</Text>
          <Text style={styles.introText}>You&apos;re a true SnackTrack legend!</Text>
        </>
      ),
    });

    // HelloFresh Affiliate Slide - Final slide
    const savings = calculateAnnualSavings();
    // Calculate average cost per meal for comparison
    const avgCostPerMeal = analytics.monthlyBreakdown && analytics.monthlyBreakdown.length > 0
      ? (analytics.monthlyBreakdown.reduce((sum, month) => sum + month.totalSpent, 0) / analytics.monthlyBreakdown.length) /
      (analytics.monthlyBreakdown.reduce((sum, month) => sum + month.receiptCount, 0) / analytics.monthlyBreakdown.length)
      : analytics.averageOrderValue;

    slides.push({
      gradient: 'hellofresh',
      emoji: '🍽️', // Fallback if image fails
      image: require('../assets/hellofresh-logo.png'),
      content: (
        <>
          <Text style={[styles.slideTitle, { marginBottom: 32, marginTop: -32 }]}>Why not try HelloFresh?</Text>
          <View style={[styles.savingsHighlight]}>
            <Text style={styles.savingsLabel}>This year you would have saved</Text>
            <Text style={styles.savingsAmount} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(savings.annualSavings)}</Text>
          </View>
          <View style={[styles.detailBox]}>
            <Text style={styles.detailText}>Your avg order: {formatCurrency(avgCostPerMeal)}</Text>
            <Text style={styles.detailText}>HelloFresh meal: {formatCurrency(HELLOFRESH_CONFIG.mealPricePerServing)}</Text>
            <Text style={styles.detailText}>You would have saved {formatCurrency(savings.savingsPerMeal)} per meal</Text>
          </View>
          <TouchableOpacity style={styles.affiliateButton} onPress={handleAffiliateClick}>
            <Text style={styles.affiliateButtonText}>Try HelloFresh</Text>
            <Ionicons name="arrow-forward" size={20} color="#333" style={styles.affiliateButtonIcon} />
          </TouchableOpacity>
        </>
      ),
    });

    return slides;
  }, [analytics, wrapped, formatCurrency, formatDate, calculateAnnualSavings, handleAffiliateClick]);

  const slides = useMemo(() => buildSlides(), [buildSlides]);

  // Ensure slides are available before rendering
  if (!slides || slides.length === 0) {
    return null;
  }

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
          dialogTitle: 'Share your SnackTrack Wrapped',
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
      <StatusBar hidden />
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
        style={{ backgroundColor: 'transparent', flex: 1 }}
        contentContainerStyle={{ backgroundColor: 'transparent' }}
      >
        {slides.map((slide, index) => (
          <ViewShot
            key={index}
            ref={(ref) => { viewShotRefs.current[index] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.slideContainer}
          >
            <LinearGradient
              colors={STORY_GRADIENTS[slide.gradient].colors}
              locations={STORY_GRADIENTS[slide.gradient].locations}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[
                styles.slideContent,
                slide.gradient === 'hellofresh' && styles.slideContentHelloFresh
              ]}>
                {slide.image ? (
                  <Image source={slide.image} style={styles.logoImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.emoji}>{slide.emoji}</Text>
                )}
                <View style={styles.frame}>
                  {slide.content}
                </View>
              </View>

              {/* Watermark Footer - positioned above progress bar */}
              <View style={{
                position: 'absolute',
                bottom: SAFE_BOTTOM + 8,
                left: 0,
                right: 0,
                alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <Text style={{
                  color: 'white',
                  opacity: 1,
                  fontWeight: '800',
                  fontSize: 15,
                  letterSpacing: 0.5,
                }}>
                  @snacktrack
                </Text>
              </View>
            </LinearGradient>
          </ViewShot>
        ))}
      </ScrollView>

      {/* Navigation Controls - only show when ready */}
      {isReady && (
        <View style={[styles.controls, { paddingBottom: Math.max(36, insets.bottom) }]}>
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
      )}
    </View>
  );
}

// Component helpers - currently unused but reserved for future template system
// const Title = ({ children }: { children: React.ReactNode }) => <Text style={styles.title}>{children}</Text>;
// const Subtitle = ({ children }: { children: React.ReactNode }) => <Text style={styles.subtitle}>{children}</Text>;
// const Intro = ({ children }: { children: React.ReactNode }) => <Text style={styles.introText}>{children}</Text>;
// const SlideTitle = ({ children }: { children: React.ReactNode }) => <Text style={styles.slideTitle}>{children}</Text>;
// const Label = ({ children }: { children: React.ReactNode }) => <Text style={styles.bigNumberLabel}>{children}</Text>;
// const BigStat = (props: any) => <Text {...props} style={[styles.bigNumber, props.style]} />;
// const Detail = ({ children }: { children: React.ReactNode }) => <View style={styles.detailBox}>{children}</View>;
// const DetailLine = ({ children }: { children: React.ReactNode }) => <Text style={styles.detailText}>{children}</Text>;
// const Roast = ({ children }: { children: React.ReactNode }) => <Text style={styles.roastText}>{children}</Text>;
const Spacer = ({ h = 8 }: { h?: number }) => <View style={{ height: h }} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
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
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gradient: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SAFE_TOP + Math.round(screenHeight * 0.05), // Add 5% more space to center content better
    paddingBottom: SAFE_BOTTOM + 100, // Extra padding to account for controls
    paddingHorizontal: SAFE_SIDE,
  },
  slideContentHelloFresh: {
    paddingTop: SAFE_TOP, // Less top padding to bring content up for content-heavy slide
  },
  frame: {
    width: '100%',
    maxWidth: Math.min(560, screenWidth * 0.9), // comfortable reading width
    alignItems: 'center',
  },
  emoji: {
    fontSize: EMOJI_SIZE,
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  title: {
    fontSize: TITLE_SIZE,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: SUBTITLE_SIZE,
    lineHeight: SUBTITLE_SIZE + 4,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  introText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 20,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  bigNumber: {
    fontSize: BIG_STAT_SIZE,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  bigNumberLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  detailBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    minWidth: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  detailText: {
    fontSize: 15,
    color: 'white',
    textAlign: 'center',
    marginVertical: 3,
    opacity: 0.95
  },
  roastText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    maxWidth: Math.min(520, screenWidth * 0.9),
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 14,
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
    width: 20,
    height: 8,
    borderRadius: 4,
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
  logoImage: {
    width: EMOJI_SIZE * 1.2,
    height: EMOJI_SIZE * 1.2,
    marginBottom: 20,
  },
  savingsHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  savingsAmount: {
    fontSize: BIG_STAT_SIZE,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 0,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  savingsLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  affiliateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  affiliateButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  affiliateButtonIcon: {
    color: '#333',
  },
  affiliateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontWeight: '500',
  },
});
