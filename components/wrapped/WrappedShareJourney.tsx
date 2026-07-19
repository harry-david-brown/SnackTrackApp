import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { UserSummary } from '../../types/api';
import { getDeterministicMessage } from '../../utils/wrappedMessages';
import { getArchetype } from '../../utils/wrappedArchetype';
import { MascotPlaceholder, MascotPose } from '../mascot/MascotPlaceholder';
import { useCurrency } from '../../contexts/CurrencyContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  showExportUpsell?: boolean;
  onExportUpsellSeen?: () => void;
  onExportUpgrade?: () => void;
  onExportTutorial?: () => void;
  onDismissExportUpsell?: () => void;
}

interface Slide {
  id?: string;
  gradient: keyof typeof STORY_GRADIENTS;
  emoji: string;
  /** When set, the mascot (outline variant) replaces the emoji as the slide's hero. */
  mascotPose?: MascotPose;
  image?: any; // For logo images
  content: React.ReactNode;
  backgroundType?: 'default' | 'animated';
  shareTargetIndex?: number;
  confetti?: boolean;
}

const STORY_SLIDE_DURATION = 6500;
const COUNT_UP_DURATION = 1100;

/**
 * Animated count-up for hero stats — the number ticks from 0 to its final
 * value when the slide mounts, giving each reveal a "drumroll" feel.
 * Falls back to the exact final value once the animation settles, so any
 * screenshot taken after the reveal captures the correct number.
 */
const AnimatedCount = ({
  value,
  format,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: {
  value: number;
  format?: (n: number) => string;
  style?: any;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}) => {
  const fmt = useCallback(
    (n: number) => (format ? format(n) : String(Math.round(n))),
    [format]
  );
  const [text, setText] = useState(() => fmt(value));

  useEffect(() => {
    // Lightweight stepped count-up: ~22fps via setTimeout (no Animated value,
    // no per-frame listener) and we only re-render when the formatted string
    // actually changes. Keeps the JS thread free so taps stay responsive.
    const start = Date.now();
    let last = '';
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = fmt(value * eased);
      if (next !== last) {
        last = next;
        setText(next);
      }
      if (t < 1) {
        timer = setTimeout(tick, 45);
      } else {
        setText(fmt(value)); // snap to exact final value
      }
    };

    setText(fmt(0));
    tick();
    return () => clearTimeout(timer);
  }, [value, fmt]);

  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {text}
    </Text>
  );
};

const AnimatedBackground = ({ children }: { children: React.ReactNode }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animatedValue.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  // Movement 1: Diagonally up-left and back
  const translate1 = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -150, 0],
  });

  // Movement 2: Diagonally down-right and back
  const translate2 = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 100, 0],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.05, 1.25, 1.05],
  });

  // Smaller overlay layers = far less GPU overdraw (big perf win on this slide),
  // while the offset keeps the screen fully covered through the motion.
  const LAYER_SIZE = 1.7;
  const LAYER_OFFSET = 0.35;

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateRev = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={[{ width: screenWidth, height: screenHeight, overflow: 'hidden' }]}>
      {/* Background Base - Deep Vivid Purple/Blue */}
      <LinearGradient
        colors={['#2E1E62', '#4B1057', '#C86B33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Moving Overlay 1 - Pink/Orange Nebula */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.7,
            transform: [
              { translateY: translate1 },
              { translateX: translate1 },
              { scale },
              { rotate },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#FF00CC', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 2 - Cyan/Blue Aqua */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.6,
            transform: [
              { translateY: translate2 },
              { scale: 1.2 },
              { rotate: rotateRev },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#00FFFF', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Moving Overlay 3 - Gold Light */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: screenWidth * LAYER_SIZE,
            height: screenHeight * LAYER_SIZE,
            left: -screenWidth * LAYER_OFFSET,
            top: -screenHeight * LAYER_OFFSET,
            opacity: 0.5,
            transform: [
              { scale: scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', '#FFD700', 'transparent']}
          start={{ x: 0.8, y: 0.8 }}
          end={{ x: 0.2, y: 0.2 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content Container */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        {children}
      </View>
    </View>
  );
};

export default function WrappedShareJourney({
  analytics,
  onClose,
  showExportUpsell = false,
  onExportUpsellSeen,
  onExportUpgrade,
  onExportTutorial,
  onDismissExportUpsell,
}: WrappedShareJourneyProps) {
  const insets = useSafeAreaInsets();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideTranslateY = useRef(new Animated.Value(28)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const slideScale = useRef(new Animated.Value(0.97)).current;
  const slideRotate = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  // +1 = moving forward, -1 = going back. Drives the entrance direction.
  const directionRef = useRef<1 | -1>(1);
  const viewShotRefs = useRef<(ViewShot | null)[]>([]);

  const wrapped = analytics.wrappedAnalytics;

  // Reset to first slide when component mounts
  React.useEffect(() => {
    setCurrentSlide(0);
  }, []); // Only run on mount

  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyFromContext(amount);
  }, [formatCurrencyFromContext]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Build slides dynamically based on available data
  // Memoized to prevent recalculation on every render
  const buildSlides = useCallback((): Slide[] => {
    const slides: Slide[] = [];

    // Opening slide - always shown
    slides.push({
      gradient: 'amethyst',
      emoji: '🎊',
      mascotPose: 'wave',
      confetti: true,
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
      mascotPose: 'shocked',
      content: (
        <>
          <Text style={styles.slideTitle}>The Damage</Text>
          <AnimatedCount value={analytics.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
            <AnimatedCount value={data.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
        mascotPose: 'sleepy',
        content: (
        <>
          <Text style={styles.slideTitle}>3am Regret</Text>
          <AnimatedCount value={data.count} style={styles.bigNumber} />
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
          <AnimatedCount value={data.orderCount} style={styles.bigNumber} />
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
        mascotPose: 'sheepish',
        content: (
        <>
          <Text style={styles.slideTitle}>Serial Orderer</Text>
          <AnimatedCount value={data.days} style={styles.bigNumber} />
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
          <AnimatedCount value={data.percentage} format={(n) => `${Math.round(n)}%`} style={styles.bigNumber} />
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
          <AnimatedCount value={data.count} style={styles.bigNumber} />
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
          <AnimatedCount value={data.amount} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
        mascotPose: 'prop-coffee',
        content: (
        <>
          <Text style={styles.slideTitle}>Coffee Addiction</Text>
          <AnimatedCount value={data.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
          <AnimatedCount value={data.percentage} format={(n) => `${Math.round(n)}%`} style={styles.bigNumber} />
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
          <AnimatedCount value={selectedComparison.quantity} style={styles.bigNumber} />
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
        mascotPose: 'prop-piggy-bank',
        content: (
        <>
          <Text style={styles.slideTitle}>The Investment You Didn&apos;t Make</Text>
          <AnimatedCount value={data.wouldBeWorth} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
          <AnimatedCount value={data.averageDeliveryFeePerMeal} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
          <AnimatedCount value={isWeekendMore ? data.weekendOrders : data.weekdayOrders} style={styles.bigNumber} />
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
      mascotPose: 'celebrate',
      confetti: true,
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
      mascotPose: 'flex',
      confetti: true,
      content: (
        <>
          <Text style={styles.title}>All Time Stats</Text>
          <Text style={styles.subtitle}>{analytics.totalReceipts} total orders</Text>
          <Text style={styles.subtitle}>{formatCurrency(analytics.totalSpent)} total spent</Text>
          <Text style={styles.introText}>You&apos;re a true SnackTrack legend!</Text>
        </>
      ),
    });

    // Personality Archetype - the climactic, most-shareable reveal
    const archetype = getArchetype(analytics, formatCurrency);
    slides.push({
      gradient: archetype.gradient,
      emoji: archetype.emoji,
      mascotPose: 'sunglasses',
      confetti: true,
      content: (
        <>
          <Text style={styles.archetypeKicker}>Your food personality is</Text>
          <Text style={styles.archetypeName} numberOfLines={2} adjustsFontSizeToFit>{archetype.name}</Text>
          <Text style={styles.archetypeTagline}>{archetype.tagline}</Text>
          <View style={styles.archetypeTraits}>
            {archetype.traits.map((trait, i) => (
              <View key={i} style={styles.archetypeTraitRow}>
                <Text style={styles.archetypeTraitEmoji}>{trait.emoji}</Text>
                <Text style={styles.archetypeTraitLabel} numberOfLines={1}>{trait.label}</Text>
                <Text style={styles.archetypeTraitValue} numberOfLines={1}>{trait.value}</Text>
              </View>
            ))}
          </View>
        </>
      ),
    });

    // Your Summary - Bento Box Grid Style
    slides.push({
      gradient: 'amethyst',
      backgroundType: 'animated',
      emoji: '🎯',
      confetti: true,
      content: (
        <>
          <Text style={styles.slideTitle}>Your Summary</Text>
          <View style={styles.bentoContainer}>
            {/* 1. Total Spent */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoHeader}>
                <Text style={styles.bentoIcon}>💸</Text>
                <Text style={styles.bentoLabel}>Total Spent</Text>
              </View>
              <Text style={[styles.bentoValue, { color: '#FF9E6E' }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(analytics.totalSpent)}
              </Text>
            </View>

            {/* 2. Total Orders */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoHeader}>
                <Text style={styles.bentoIcon}>📦</Text>
                <Text style={styles.bentoLabel}>Total Orders</Text>
              </View>
              <Text style={[styles.bentoValue, { color: '#FEE140' }]} numberOfLines={1} adjustsFontSizeToFit>
                {analytics.totalReceipts}
              </Text>
            </View>

            {/* 3. Top Restaurant */}
            {analytics.topRestaurants && analytics.topRestaurants.length > 0 ? (() => {
              const topSpotName = analytics.topRestaurants[0].name;
              const fontSize = topSpotName.length < 12 ? 32 : (topSpotName.length < 20 ? 24 : 20);
              const lineHeight = fontSize * 1.2;
              return (
                <View style={styles.bentoCard}>
                  <View style={styles.bentoHeader}>
                    <Text style={styles.bentoIcon}>🏆</Text>
                    <Text style={styles.bentoLabel}>Top Spot</Text>
                  </View>
                  <Text style={[styles.bentoValue, { color: '#4FACFE', fontSize, lineHeight }]} numberOfLines={2}>
                    {topSpotName}
                  </Text>
                </View>
              );
            })() : <View style={styles.bentoCard} />}

            {/* 4. Favorite Meal (Proxy) */}
            {(() => {
              const faveMealName = wrapped?.shame?.singleItemOrders?.mostCommon || wrapped?.flex?.coffeeAddiction?.mostOrdered || "Burgers";
              const fontSize = faveMealName.length < 12 ? 32 : (faveMealName.length < 20 ? 24 : 20);
              const lineHeight = fontSize * 1.2;
              return (
                <View style={styles.bentoCard}>
                  <View style={styles.bentoHeader}>
                    <Text style={styles.bentoIcon}>🍔</Text>
                    <Text style={styles.bentoLabel}>Fave Meal</Text>
                  </View>
                  <Text style={[styles.bentoValue, { color: '#FF7F6A', fontSize, lineHeight }]} numberOfLines={2}>
                    {faveMealName}
                  </Text>
                </View>
              );
            })()}
          </View>
          <Text style={styles.summaryFooter}>2025 Legend Status</Text>
        </>
      ),
    });

    if (showExportUpsell) {
      const summarySlideIndex = slides.length - 1;

      slides.push({
        id: 'export-upsell',
        gradient: 'hellofresh',
        emoji: '📦',
        shareTargetIndex: summarySlideIndex,
        content: (
          <>
            <Text style={[styles.slideTitle, styles.exportSlideTitle]}>Unlock your full delivery history</Text>
            <View style={styles.savingsHighlight}>
              <Text style={styles.savingsLabel}>You&apos;re already live with Gmail</Text>
              <Text style={styles.exportUpsellHeadline}>Add your full export for deeper history, fuller trends, and better long-term insights.</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Fill in older orders that never hit your inbox.</Text>
              <Text style={styles.detailText}>Strengthen yearly spending and restaurant trend analysis.</Text>
              <Text style={styles.detailText}>Keep Gmail for speed, then use export for completeness.</Text>
            </View>
            <View style={styles.exportActionStack}>
              <TouchableOpacity style={styles.affiliateButton} onPress={onExportUpgrade}>
                <Text style={styles.affiliateButtonText}>Upload Full Export</Text>
                <Ionicons name="arrow-forward" size={20} color="#222222" style={styles.affiliateButtonIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportSecondaryButton} onPress={onExportTutorial}>
                <Ionicons name="information-circle-outline" size={18} color="white" />
                <Text style={styles.exportSecondaryButtonText}>See how to request it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportDismissButton} onPress={onDismissExportUpsell}>
                <Text style={styles.exportDismissButtonText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </>
        ),
      });
    }

    return slides;
  }, [analytics, wrapped, formatCurrency, formatDate, showExportUpsell, onExportUpgrade, onExportTutorial, onDismissExportUpsell]);

  const slides = useMemo(() => buildSlides(), [buildSlides]);
  const activeSlide = slides[currentSlide];
  const shareTargetIndex = activeSlide?.shareTargetIndex ?? currentSlide;
  const shareTargetSlide = slides[shareTargetIndex];
  const shouldAutoAdvance = currentSlide < slides.length - 1 && activeSlide?.id !== 'export-upsell';

  React.useEffect(() => {
    if (currentSlide > slides.length - 1) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [currentSlide, slides.length]);

  React.useEffect(() => {
    if (activeSlide?.id === 'export-upsell') {
      onExportUpsellSeen?.();
    }
  }, [activeSlide, onExportUpsellSeen]);

  // useLayoutEffect so the off-screen reset happens BEFORE the new slide paints.
  // Otherwise the slide briefly renders at the previous slide's resting values
  // (in place, fully visible) and only then jumps to its start — the flash that
  // reads as "it goes to the current slide before animating".
  useLayoutEffect(() => {
    progressAnim.stopAnimation();
    progressAnim.setValue(0);

    // Haptic punch on every slide change — celebratory slides get a heavier
    // success buzz, the rest get a light tap synced to the entrance.
    if (activeSlide?.confetti) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const direction = directionRef.current;

    // Always start hidden + reset rotation; per-branch sets the offset.
    slideOpacity.setValue(0);
    slideRotate.setValue(0);

    if (direction === -1) {
      // Going BACK — natural reverse: slide in from the left. Consistent so the
      // gesture always reads as "backward" rather than a random forward entrance.
      slideTranslateX.setValue(-screenWidth * 0.9);
      slideTranslateY.setValue(0);
      slideScale.setValue(0.94);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateX, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Going FORWARD — cycle through 4 distinct "crazy" entrances.
    const animType = currentSlide % 4;

    if (animType === 0) {
      // Spring rise from below
      slideTranslateY.setValue(60);
      slideTranslateX.setValue(0);
      slideScale.setValue(0.88);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      ]).start();
    } else if (animType === 1) {
      // Zoom blast — scale from huge
      slideTranslateY.setValue(0);
      slideTranslateX.setValue(0);
      slideScale.setValue(1.55);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start();
    } else if (animType === 2) {
      // Slide in from right
      slideTranslateY.setValue(0);
      slideTranslateX.setValue(screenWidth * 0.9);
      slideScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateX, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      // Drop from top with spin
      slideTranslateY.setValue(-screenHeight * 0.35);
      slideTranslateX.setValue(0);
      slideScale.setValue(0.7);
      slideRotate.setValue(0.08);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideTranslateY, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(slideScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(slideRotate, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [currentSlide, activeSlide, progressAnim, slideOpacity, slideScale, slideTranslateY, slideTranslateX, slideRotate]);

  React.useEffect(() => {
    if (!shouldAutoAdvance) {
      progressAnim.stopAnimation();
      progressAnim.setValue(currentSlide === slides.length - 1 ? 1 : 0);
      return;
    }

    if (isPaused) {
      progressAnim.stopAnimation();
      return;
    }

    let animation: Animated.CompositeAnimation | null = null;

    progressAnim.stopAnimation((value) => {
      const remainingDuration = Math.max(300, STORY_SLIDE_DURATION * (1 - value));
      animation = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      animation.start(({ finished }) => {
        if (finished) {
          directionRef.current = 1; // auto-advance always moves forward
          setCurrentSlide((current) => Math.min(current + 1, slides.length - 1));
        }
      });
    });

    return () => {
      animation?.stop();
    };
  }, [currentSlide, isPaused, progressAnim, shouldAutoAdvance, slides.length]);

  // Swipe-down-to-dismiss (Stories/Wrapped convention). Capture-phase responder
  // only claims clearly-vertical downward drags, so left/right tap navigation
  // and hold-to-pause keep working untouched.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx) * 1.5,
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_evt, gesture) => {
        setIsPaused(false);
        if (gesture.dy > 140 || gesture.vy > 0.8) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          Animated.timing(dragY, {
            toValue: screenHeight,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsPaused(false);
        Animated.spring(dragY, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Container shrinks/fades slightly as you drag down — the rubber-band cue
  // that the sheet is dismissible.
  const dragScale = dragY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });
  const dragOpacity = dragY.interpolate({
    inputRange: [0, screenHeight * 0.5],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  // Ensure slides are available before rendering
  if (!slides || slides.length === 0) {
    return null;
  }

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ref = viewShotRefs.current[shareTargetIndex];
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
    directionRef.current = 1;
    setCurrentSlide((current) => {
      if (current >= slides.length - 1) {
        return current;
      }

      progressAnim.setValue(0);
      return current + 1;
    });
  };

  const goToPrevious = () => {
    directionRef.current = -1;
    setCurrentSlide((current) => {
      if (current <= 0) {
        return current;
      }

      progressAnim.setValue(0);
      return current - 1;
    });
  };

  const renderSlideInner = (slide: Slide, animatedContent = false) => {
    const content = (
      <Animated.View
        style={[
          styles.slideContent,
          slide.id === 'export-upsell' && styles.slideContentPromo,
          animatedContent && {
            opacity: slideOpacity,
            transform: [
              { translateX: slideTranslateX },
              { translateY: slideTranslateY },
              { scale: slideScale },
              {
                rotate: slideRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '30deg'],
                }),
              },
            ],
          },
        ]}
      >
        {slide.image ? (
          <Image source={slide.image} style={styles.logoImage} resizeMode="contain" />
        ) : slide.mascotPose ? (
          /* MASCOT: slide hero — pose varies per slide theme */
          <View style={styles.mascotHero}>
            <MascotPlaceholder pose={slide.mascotPose} size={104} variant="outline" />
          </View>
        ) : (
          <Text style={styles.emoji}>{slide.emoji}</Text>
        )}
        <View style={styles.frame}>
          {slide.content}
        </View>
      </Animated.View>
    );

    const watermark = (
      <View style={[styles.watermarkCorner, { bottom: Math.max(SAFE_BOTTOM, insets.bottom + 16) }]} pointerEvents="none">
        <Text style={styles.watermarkText}>@snacktrack</Text>
      </View>
    );

    if (slide.backgroundType === 'animated') {
      return (
        <AnimatedBackground>
          {content}
          {watermark}
        </AnimatedBackground>
      );
    }

    return (
      <LinearGradient
        colors={STORY_GRADIENTS[slide.gradient].colors}
        locations={STORY_GRADIENTS[slide.gradient].locations}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {content}
        {watermark}
      </LinearGradient>
    );
  };

  // Drive the active segment with a left-anchored scaleX on the native driver,
  // so the per-frame progress animation never touches the JS thread.
  const activeProgressScaleX = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Slide layer — drags down to dismiss, taps left/right to navigate */}
      <Animated.View
        style={[
          styles.dragLayer,
          { opacity: dragOpacity, transform: [{ translateY: dragY }, { scale: dragScale }] },
        ]}
        {...panResponder.panHandlers}
      >
        {activeSlide && (
          <ViewShot
            key={currentSlide}
            ref={(ref) => { viewShotRefs.current[currentSlide] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.slideContainer}
          >
            {renderSlideInner(activeSlide, true)}
          </ViewShot>
        )}

        {shareTargetSlide && shareTargetIndex !== currentSlide && (
          <ViewShot
            ref={(ref) => { viewShotRefs.current[shareTargetIndex] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.hiddenShareShot}
          >
            {renderSlideInner(shareTargetSlide)}
          </ViewShot>
        )}

        {activeSlide?.id !== 'export-upsell' && (
          <>
            <Pressable
              style={[styles.tapZone, styles.tapZoneLeft]}
              onPress={goToPrevious}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
            <Pressable
              style={[styles.tapZone, styles.tapZoneRight]}
              onPress={goToNext}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
          </>
        )}
      </Animated.View>

      {/* Celebratory confetti — decorative overlay, never blocks touches */}
      {activeSlide?.confetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            key={`confetti-${currentSlide}`}
            count={70}
            origin={{ x: screenWidth / 2, y: -20 }}
            autoStart
            fadeOut
            explosionSpeed={420}
            fallSpeed={2800}
          />
        </View>
      )}

      {/* Fixed chrome — stays put while the slide drags */}
      <View style={[styles.progressRail, { paddingTop: Math.max(12, insets.top + 8) }]}>
        {slides.map((_, index) => (
          <View key={index} style={styles.progressSegment}>
            <View
              style={[
                styles.progressFill,
                index < currentSlide && styles.progressFillComplete,
              ]}
            />
            {index === currentSlide && (
              <Animated.View
                style={[
                  styles.progressFill,
                  styles.progressFillActive,
                  { transform: [{ scaleX: activeProgressScaleX }] },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.iconButton, styles.closeButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={onClose}
        hitSlop={8}
      >
        <Ionicons name="close" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.iconButton, styles.shareIconButton, { top: Math.max(44, insets.top + 16) }]}
        onPress={handleShare}
        hitSlop={8}
      >
        <Ionicons name="share-outline" size={22} color="white" />
      </TouchableOpacity>
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
  dragLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  iconButton: {
    position: 'absolute',
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  closeButton: {
    left: 16,
  },
  shareIconButton: {
    right: 16,
  },
  progressRail: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  progressFill: {
    height: '100%',
    width: 0,
    borderRadius: 999,
    backgroundColor: 'white',
  },
  progressFillComplete: {
    width: '100%',
  },
  progressFillActive: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    transformOrigin: 'left',
  },
  slideContainer: {
    width: screenWidth,
    height: screenHeight,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  hiddenShareShot: {
    position: 'absolute',
    left: -screenWidth * 2,
    top: 0,
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
    paddingBottom: SAFE_BOTTOM + 48, // Clears the corner watermark; arrows/bar removed
    paddingHorizontal: SAFE_SIDE,
  },
  slideContentPromo: {
    paddingTop: SAFE_TOP, // Less top padding to bring content up for content-heavy slide
  },
  frame: {
    width: '100%',
    maxWidth: Math.min(560, screenWidth * 0.9), // comfortable reading width
    alignItems: 'center',
  },
  watermarkCorner: {
    position: 'absolute',
    left: SAFE_SIDE,
    // `bottom` is set inline from safe-area insets
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 40,
  },
  tapZoneLeft: {
    left: 0,
    width: '35%',
  },
  tapZoneRight: {
    right: 0,
    width: '35%',
  },
  emoji: {
    fontSize: EMOJI_SIZE,
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  mascotHero: {
    marginBottom: 20,
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
  exportSlideTitle: {
    marginBottom: 28,
    marginTop: -12,
  },
  exportUpsellHeadline: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    maxWidth: Math.min(480, screenWidth * 0.82),
  },
  exportActionStack: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
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
    color: '#222222',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  affiliateButtonIcon: {
    color: '#222222',
  },
  exportSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  exportSecondaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  exportDismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportDismissButtonText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.86)',
    fontWeight: '600',
  },
  bentoContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginTop: 8,
  },
  bentoCard: {
    width: '47%',
    backgroundColor: 'rgba(20, 20, 20, 0.4)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  bentoIcon: {
    fontSize: 18,
  },
  bentoLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bentoValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  summaryFooter: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  archetypeKicker: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  archetypeName: {
    fontSize: Math.min(52, Math.max(40, Math.round(screenWidth * 0.13))),
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  archetypeTagline: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
    maxWidth: Math.min(480, screenWidth * 0.85),
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  archetypeTraits: {
    width: '100%',
    maxWidth: Math.min(420, screenWidth * 0.86),
    gap: 10,
  },
  archetypeTraitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  archetypeTraitEmoji: {
    fontSize: 22,
  },
  archetypeTraitLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  archetypeTraitValue: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    maxWidth: '45%',
    textAlign: 'right',
  },
});
