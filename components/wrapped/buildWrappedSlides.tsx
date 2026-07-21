/**
 * Slide definitions for the Wrapped share journey. Pure function of the
 * analytics payload — no animation or gesture logic lives here, so slide
 * copy, poses, and ordering can change without touching the player.
 *
 * Deck shape (max MAX_DECK_SIZE slides):
 *   intro → The Damage → optional stats (escalating by intensity) →
 *   That's Your Year → archetype (climax, only confetti) → summary → upsell?
 *
 * Optional stat slides each carry an `intensity` score (0–100, normalized the
 * same way as utils/wrappedArchetype.ts). When there are more candidates than
 * the deck budget, the spiciest win; the survivors play in ascending order so
 * the deck escalates toward the archetype reveal.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary } from '../../types/api';
import { getDeterministicMessage } from '../../utils/wrappedMessages';
import { getArchetype } from '../../utils/wrappedArchetype';
import { MascotPose } from '../mascot/MascotPlaceholder';
import { STORY_GRADIENTS, BENTO_ACCENTS } from './wrappedTheme';
import { AnimatedCount, DelayedFadeIn, DelayedSlam, Spacer } from './WrappedSlideEffects';
import { styles } from './wrappedStyles';

export interface Slide {
  id?: string;
  gradient: keyof typeof STORY_GRADIENTS;
  emoji: string;
  /** When set, the mascot (outline variant) replaces the emoji as the slide's hero. */
  mascotPose?: MascotPose;
  image?: any; // For logo images
  content: React.ReactNode;
  backgroundType?: 'default' | 'animated';
  /** Soft radial glow behind the hero content — reserve for climactic slides. */
  glow?: boolean;
  shareTargetIndex?: number;
  confetti?: boolean;
  /** Delay confetti launch (ms after slide mount) — syncs with the archetype reveal. */
  confettiDelayMs?: number;
  /** Per-slide auto-advance duration; defaults to STORY_SLIDE_DURATION. */
  durationMs?: number;
  /** Render the explicit "Share this card" pill on this slide. */
  showShareCta?: boolean;
  /** Announced to screen readers when the slide appears. */
  a11y?: string;
}

export interface BuildWrappedSlidesParams {
  analytics: UserSummary;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  showExportUpsell?: boolean;
  onExportUpgrade?: () => void;
  onExportTutorial?: () => void;
  onDismissExportUpsell?: () => void;
}

/** Hard cap on deck length (upsell included) — attention is the budget. */
export const MAX_DECK_SIZE = 12;

/** Delay before the archetype name slams in (confetti + haptic sync to it). */
export const ARCHETYPE_REVEAL_DELAY_MS = 900;

interface RankedSlide {
  intensity: number;
  slide: Slide;
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

/** Beat between the hero number landing and the roast punchline fading in. */
const ROAST_DELAY_MS = 700;

export function buildWrappedSlides({
  analytics,
  formatCurrency,
  formatDate,
  showExportUpsell = false,
  onExportUpgrade,
  onExportTutorial,
  onDismissExportUpsell,
}: BuildWrappedSlidesParams): Slide[] {
  const wrapped = analytics.wrappedAnalytics;
  // The year this recap covers — from the analytics payload, not hardcoded.
  const wrappedYear = wrapped?.comparative?.spentThisYear?.year ?? new Date().getFullYear();

  // ---------------------------------------------------------------- core ----

  const intro: Slide = {
    gradient: 'forest',
    emoji: '🎊',
    mascotPose: 'wave',
    glow: true,
    durationMs: 3500,
    a11y: "Your SnackTrack Wrapped. Let's see your food delivery history.",
    content: (
      <>
        <Text style={styles.title}>Your SnackTrack</Text>
        <Text style={styles.introText}>Let&apos;s see your entire food delivery history...</Text>
      </>
    ),
  };

  const totalDamageMessage = getDeterministicMessage('totalDamage', analytics, undefined, 0);
  const damage: Slide = {
    gradient: 'ember',
    emoji: '😱',
    mascotPose: 'shocked',
    glow: true,
    a11y: `The Damage. ${formatCurrency(analytics.totalSpent)} spent on food delivery. ${totalDamageMessage}`,
    content: (
      <>
        <Text style={styles.slideTitle}>The Damage</Text>
        <AnimatedCount value={analytics.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
        <Text style={styles.bigNumberLabel}>spent on food delivery</Text>
        <Spacer h={6} />
        <DelayedFadeIn delay={ROAST_DELAY_MS}>
          <Text style={styles.roastText}>{totalDamageMessage}</Text>
        </DelayedFadeIn>
      </>
    ),
  };

  // ------------------------------------------------- optional stat slides ----

  const optional: RankedSlide[] = [];

  if (wrapped?.comparative?.spentThisYear) {
    const data = wrapped.comparative.spentThisYear;
    const spentThisYearMessage = getDeterministicMessage('spentThisYear', analytics, data.totalSpent, 14);
    optional.push({
      intensity: clamp100((data.totalSpent / 4000) * 100),
      slide: {
        gradient: 'lagoon',
        emoji: '📅',
        mascotPose: 'prop-receipt',
        a11y: `This Year. ${formatCurrency(data.totalSpent)} spent this year. ${spentThisYearMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>This Year</Text>
            <AnimatedCount value={data.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
            <Text style={styles.bigNumberLabel}>spent this year</Text>
            <Spacer h={6} />
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{spentThisYearMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.shame.lateNightOrders) {
    const data = wrapped.shame.lateNightOrders;
    const lateNightMessage = getDeterministicMessage('lateNightOrders', analytics, data.count, 1);
    optional.push({
      intensity: clamp100((data.count / 20) * 100),
      slide: {
        gradient: 'indigo',
        emoji: '🌙',
        mascotPose: 'sleepy',
        a11y: `3am Regret. ${data.count} orders between midnight and 6am. ${lateNightMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>3am Regret</Text>
            <AnimatedCount value={data.count} style={[styles.bigNumber, styles.bigNumberBleed]} />
            <Text style={styles.bigNumberLabel}>orders between midnight-6am</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Worst offense: {data.worstOffender.restaurant}</Text>
              <Text style={styles.detailText}>at {data.worstOffender.time} for {formatCurrency(data.worstOffender.amount)}</Text>
            </View>
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{lateNightMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.shame.laziestDay) {
    const data = wrapped.shame.laziestDay;
    const laziestDayMessage = getDeterministicMessage('laziestDay', analytics, data.orderCount, 2);
    optional.push({
      intensity: clamp100((data.orderCount / 5) * 100),
      slide: {
        gradient: 'berry',
        emoji: '😴',
        mascotPose: 'sheepish',
        a11y: `Laziest Day. ${data.orderCount} orders in one day. ${laziestDayMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{laziestDayMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.shame.longestStreak) {
    const data = wrapped.shame.longestStreak;
    const streakMessage = getDeterministicMessage('consecutiveDays', analytics, data.days, 3);
    optional.push({
      intensity: clamp100((data.days / 14) * 100),
      slide: {
        gradient: 'ember',
        emoji: '🔥',
        mascotPose: 'cheer',
        a11y: `Serial Orderer. ${data.days} consecutive days ordering. ${streakMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Serial Orderer</Text>
            <AnimatedCount value={data.days} style={[styles.bigNumber, styles.bigNumberBleed]} />
            <Text style={styles.bigNumberLabel}>consecutive days ordering</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.startDate)} - {formatDate(data.endDate)}</Text>
              <Text style={styles.detailText}>Total: {formatCurrency(data.totalSpent)}</Text>
            </View>
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{streakMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.shame.chainDependency) {
    const data = wrapped.shame.chainDependency;
    const chainMessage = getDeterministicMessage('chainDependency', analytics, data.worstOffender, 4);
    optional.push({
      intensity: clamp100(data.percentage),
      slide: {
        gradient: 'berry',
        emoji: '🍔',
        mascotPose: 'wink',
        a11y: `Chain Dependency. ${Math.round(data.percentage)} percent of orders were ${data.worstOffender}. ${chainMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{chainMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.shame.singleItemOrders) {
    const data = wrapped.shame.singleItemOrders;
    const singleItemMessage = getDeterministicMessage('singleItemOrders', analytics, data.count, 5);
    optional.push({
      intensity: clamp100((data.count / 30) * 100),
      slide: {
        gradient: 'amber',
        emoji: '🤏',
        mascotPose: 'neutral',
        a11y: `Couldn't Go Get It. ${data.count} single-item orders. ${singleItemMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{singleItemMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.flex.mostExpensiveOrder) {
    const data = wrapped.flex.mostExpensiveOrder;
    const expensiveMessage = getDeterministicMessage('mostExpensiveOrder', analytics, data.amount, 6);
    optional.push({
      intensity: clamp100((data.amount / 150) * 100),
      slide: {
        gradient: 'indigo',
        emoji: '💰',
        mascotPose: 'trophy',
        a11y: `Bougie Moment. Most expensive order: ${formatCurrency(data.amount)} at ${data.restaurant}. ${expensiveMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{expensiveMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.flex.coffeeAddiction) {
    const data = wrapped.flex.coffeeAddiction;
    const coffeeMessage = getDeterministicMessage('coffeeSpending', analytics, data.totalSpent, 7);
    optional.push({
      intensity: clamp100((data.orderCount / 50) * 100),
      slide: {
        gradient: 'amber',
        emoji: '☕',
        mascotPose: 'prop-coffee',
        a11y: `Coffee Addiction. ${formatCurrency(data.totalSpent)} spent on coffee. ${coffeeMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{coffeeMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.flex.nightOwl) {
    const data = wrapped.flex.nightOwl;
    const nightOwlMessage = getDeterministicMessage('nightOwlPercentage', analytics, data.percentage, 8);
    optional.push({
      intensity: clamp100(data.percentage),
      slide: {
        gradient: 'indigo',
        emoji: '🦉',
        mascotPose: 'wink',
        a11y: `Night Owl Badge. ${Math.round(data.percentage)} percent of orders after 10pm. ${nightOwlMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{nightOwlMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

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
    optional.push({
      intensity: clamp100((data.totalSpent / 5000) * 100),
      slide: {
        gradient: 'amber',
        emoji: emoji,
        mascotPose: 'thinking',
        a11y: `Could Have Bought ${selectedComparison.quantity} ${selectedComparison.item}. ${couldHaveBoughtMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{couldHaveBoughtMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.comparative.missedInvestment) {
    const data = wrapped.comparative.missedInvestment;
    const investmentMessage = getDeterministicMessage('missedInvestment', analytics, data.missedGains, 10);
    optional.push({
      intensity: clamp100((data.missedGains / 1500) * 100),
      slide: {
        gradient: 'lagoon',
        emoji: '📈',
        mascotPose: 'prop-piggy-bank',
        a11y: `The Investment You Didn't Make. Worth ${formatCurrency(data.wouldBeWorth)} if invested in the S&P 500. ${investmentMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>The Investment You Didn&apos;t Make</Text>
            <AnimatedCount value={data.wouldBeWorth} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
            <Text style={styles.bigNumberLabel}>if you&apos;d invested in S&P 500</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>That&apos;s {formatCurrency(data.missedGains)} in missed gains</Text>
            </View>
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{investmentMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.comparative.costPerMeal) {
    const data = wrapped.comparative.costPerMeal;
    const costPerMealMessage = getDeterministicMessage('costPerMeal', analytics, data.averageDeliveryFeePerMeal, 11);
    optional.push({
      intensity: clamp100((data.averageDeliveryFeePerMeal / 8) * 100),
      slide: {
        gradient: 'berry',
        emoji: '🏪',
        mascotPose: 'prop-receipt',
        a11y: `The Delivery Tax. ${formatCurrency(data.averageDeliveryFeePerMeal)} extra per meal. ${costPerMealMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{costPerMealMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

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

    const waitingTimeMessage = getDeterministicMessage('deliveryWaits', analytics, data.totalMinutes, 14);
    optional.push({
      intensity: clamp100((data.totalMinutes / 1440) * 100),
      slide: {
        gradient: 'lagoon',
        emoji: '⏱️',
        mascotPose: 'sad',
        durationMs: 8000, // dense slide — four detail rows to read
        a11y: `Waiting Time. ${formattedTotalTime} spent waiting for delivery. ${waitingTimeMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{waitingTimeMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.patterns.peakHungerHour) {
    const data = wrapped.patterns.peakHungerHour;
    const peakHungerMessage = getDeterministicMessage('peakHungerHour', analytics, data.hour, 12);
    optional.push({
      intensity: clamp100(data.percentageOfTotal * 2.5),
      slide: {
        gradient: 'amber',
        emoji: '⏰',
        mascotPose: 'prop-salad',
        a11y: `Peak Hunger Hour. ${data.hourDisplay} is your hungriest time. ${peakHungerMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Peak Hunger Hour</Text>
            <Text style={styles.bigNumber}>{data.hourDisplay}</Text>
            <Text style={styles.bigNumberLabel}>your hungriest time</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders ({data.percentageOfTotal}%)</Text>
            </View>
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{peakHungerMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (wrapped?.patterns.weekendWarrior) {
    const data = wrapped.patterns.weekendWarrior;
    const isWeekendMore = data.weekendSpending > data.weekdaySpending;
    const total = data.weekendSpending + data.weekdaySpending;
    const weekendShare = total > 0 ? data.weekendSpending / total : 0.5;
    const weekendWarriorMessage = getDeterministicMessage('weekendWarrior', analytics, undefined, 13);
    optional.push({
      // Interesting only insofar as spending skews away from an even split.
      intensity: clamp100(Math.abs(weekendShare - 0.5) * 200),
      slide: {
        gradient: 'berry',
        emoji: isWeekendMore ? '🎉' : '💼',
        mascotPose: 'cheer',
        a11y: `${isWeekendMore ? 'Weekend' : 'Weekday'} Warrior. ${isWeekendMore ? data.weekendOrders : data.weekdayOrders} ${isWeekendMore ? 'weekend' : 'weekday'} orders. ${weekendWarriorMessage}`,
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
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{weekendWarriorMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  // ------------------------------------------------------------- finale ----

  const closing: Slide = {
    gradient: 'forest',
    emoji: '✨',
    mascotPose: 'celebrate',
    glow: true,
    a11y: `That's your year. ${wrapped?.comparative?.spentThisYear?.orderCount ?? analytics.totalReceipts} orders, ${formatCurrency(wrapped?.comparative?.spentThisYear?.totalSpent ?? analytics.totalSpent)} spent.`,
    content: (
      <>
        <Text style={styles.title}>That&apos;s Your Year</Text>
        <Text style={styles.subtitle}>{wrapped?.comparative?.spentThisYear?.orderCount ?? analytics.totalReceipts} orders</Text>
        <Text style={styles.subtitle}>{formatCurrency(wrapped?.comparative?.spentThisYear?.totalSpent ?? analytics.totalSpent)} spent</Text>
        <Text style={styles.introText}>So... what does that make you?</Text>
      </>
    ),
  };

  // Personality Archetype — the climactic reveal. Only confetti in the deck,
  // launched in sync with the two-beat name slam.
  const archetype = getArchetype(analytics, formatCurrency);
  const archetypeSlide: Slide = {
    gradient: archetype.gradient,
    emoji: archetype.emoji,
    mascotPose: 'sunglasses',
    confetti: true,
    confettiDelayMs: ARCHETYPE_REVEAL_DELAY_MS,
    glow: true,
    durationMs: 9000,
    showShareCta: true,
    a11y: `Your food personality is ${archetype.name}. ${archetype.tagline}`,
    content: (
      <>
        <Text style={styles.archetypeKicker}>Your food personality is</Text>
        <DelayedSlam delay={ARCHETYPE_REVEAL_DELAY_MS} hapticOnReveal>
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
        </DelayedSlam>
      </>
    ),
  };

  // Your Summary — bento grid recap.
  const summary: Slide = {
    gradient: 'forest',
    backgroundType: 'animated',
    emoji: '🎯',
    durationMs: 9000,
    showShareCta: true,
    a11y: `Your Summary. ${analytics.totalReceipts} total orders, ${formatCurrency(analytics.totalSpent)} total spent.`,
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
            <Text style={[styles.bentoValue, { color: BENTO_ACCENTS.spend }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(analytics.totalSpent)}
            </Text>
          </View>

          {/* 2. Total Orders */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoIcon}>📦</Text>
              <Text style={styles.bentoLabel}>Total Orders</Text>
            </View>
            <Text style={[styles.bentoValue, { color: BENTO_ACCENTS.orders }]} numberOfLines={1} adjustsFontSizeToFit>
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
                <Text style={[styles.bentoValue, { color: BENTO_ACCENTS.topSpot, fontSize, lineHeight }]} numberOfLines={2}>
                  {topSpotName}
                </Text>
              </View>
            );
          })() : <View style={styles.bentoCard} />}

          {/* 4. Favorite Meal (proxy from single-item / coffee data — hidden
              rather than faked when neither source exists) */}
          {(() => {
            const faveMealName = wrapped?.shame?.singleItemOrders?.mostCommon || wrapped?.flex?.coffeeAddiction?.mostOrdered;
            if (!faveMealName) {
              return <View style={styles.bentoCard} />;
            }
            const fontSize = faveMealName.length < 12 ? 32 : (faveMealName.length < 20 ? 24 : 20);
            const lineHeight = fontSize * 1.2;
            return (
              <View style={styles.bentoCard}>
                <View style={styles.bentoHeader}>
                  <Text style={styles.bentoIcon}>🍔</Text>
                  <Text style={styles.bentoLabel}>Fave Meal</Text>
                </View>
                <Text style={[styles.bentoValue, { color: BENTO_ACCENTS.faveMeal, fontSize, lineHeight }]} numberOfLines={2}>
                  {faveMealName}
                </Text>
              </View>
            );
          })()}
        </View>
        <Text style={styles.summaryFooter}>{wrappedYear} Legend Status</Text>
      </>
    ),
  };

  // -------------------------------------------------- selection & order ----

  // Core slides always play; optional stats compete for the remaining budget.
  const coreCount = 5 + (showExportUpsell ? 1 : 0);
  const budget = Math.max(0, MAX_DECK_SIZE - coreCount);
  const picked = [...optional]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, budget)
    // Survivors escalate: mildest first, spiciest right before the finale.
    .sort((a, b) => a.intensity - b.intensity)
    .map((ranked) => ranked.slide);

  const slides: Slide[] = [intro, damage, ...picked, closing, archetypeSlide, summary];

  if (showExportUpsell) {
    const summarySlideIndex = slides.length - 1;

    slides.push({
      id: 'export-upsell',
      gradient: 'forest',
      emoji: '📦',
      shareTargetIndex: summarySlideIndex,
      a11y: 'Unlock your full delivery history. Add your full export for deeper history and better insights.',
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
}
