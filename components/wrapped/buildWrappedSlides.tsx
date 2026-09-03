/**
 * Slide definitions for the Wrapped share journey. Pure function of the
 * analytics payload — no animation or gesture logic lives here, so slide
 * copy, poses, and ordering can change without touching the player.
 *
 * Deck shape (max MAX_DECK_SIZE slides):
 *   lifetime intro → lifetime damage → one strong candidate per editorial
 *   category → case closed → lifetime archetype (climax + share card)
 *
 * The archetype card closes the deck: it's the shareable artifact, so it carries
 * the all-time spend headline as well as the personality reveal.
 *
 * Optional stats carry an `intensity` score and category. Selection preserves
 * a fixed narrative order while choosing the strongest non-conflicting slide
 * in each category; sparse categories are simply omitted.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { UserSummary } from '@/types/api';
import { getDeterministicMessage } from '@utils/wrappedMessages';
import { getArchetype, ARCHETYPE_COUNT } from '@utils/wrappedArchetype';
import { MascotPose } from '@components/mascot/MascotPlaceholder';
import { STORY_GRADIENTS } from './wrappedTheme';
import { AnimatedCount, DelayedFadeIn, DelayedSlam, Spacer } from './WrappedSlideEffects';
import { MonthlySpendChart } from './MonthlySpendChart';
import { styles } from './wrappedStyles';
import {
  selectEditorialCandidates,
  type AnalyticsScope,
  type SlideCategory,
} from './wrappedSlideSelection';

export interface Slide {
  id: string;
  category: SlideCategory;
  scope: AnalyticsScope;
  gradient: keyof typeof STORY_GRADIENTS;
  emoji: string;
  /** When set, the mascot (outline variant) replaces the emoji as the slide's hero. */
  mascotPose?: MascotPose;
  /** Suppress the hero image entirely (mascot/emoji) — for slides whose body IS
   *  the hero, e.g. the month-by-month chart, which needs the vertical room. */
  hideHero?: boolean;
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
  /** First name for personalized cards ("Sam's 2025 Wrapped"). The API's User
   *  has no name field yet, so this only lights up once the backend adds one. */
  userName?: string;
}

/** Hard cap on deck length — attention is the budget. */
export const MAX_DECK_SIZE = 10;

/** Delay before the archetype name slams in (confetti + haptic sync to it). */
export const ARCHETYPE_REVEAL_DELAY_MS = 700;

interface RankedSlide {
  id: string;
  category: SlideCategory;
  intensity: number;
  confidence?: number;
  slide: Slide;
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

const CATEGORY_GRADIENTS: Partial<Record<SlideCategory, keyof typeof STORY_GRADIENTS>> = {
  perspective: 'amber',
  trend: 'lagoon',
  places: 'hallOfFame',
  habit: 'berry',
  pattern: 'indigo',
  'extreme-moment': 'ember',
  transition: 'verdict',
};

const ALTERNATE_GRADIENTS: Partial<Record<SlideCategory, keyof typeof STORY_GRADIENTS>> = {
  headline: 'forest',
  perspective: 'hallOfFame',
  trend: 'indigo',
  places: 'amber',
  habit: 'lagoon',
  pattern: 'forest',
  'extreme-moment': 'berry',
  transition: 'verdict',
  identity: 'hallOfFame',
};

const REPEATED_POSE_FALLBACKS: Partial<Record<SlideCategory, MascotPose>> = {
  headline: 'neutral',
  perspective: 'thinking',
  places: 'trophy',
  habit: 'wink',
  pattern: 'prop-salad',
  'extreme-moment': 'flex',
  identity: 'sunglasses',
};

/** Beat between the hero number landing and the roast punchline fading in. */
const ROAST_DELAY_MS = 550;

export function buildWrappedSlides({
  analytics,
  formatCurrency,
  formatDate,
  userName,
}: BuildWrappedSlidesParams): Slide[] {
  const wrapped = analytics.wrappedAnalytics;
  const percentiles = wrapped?.percentiles;
  const lifetimeScope = { kind: 'lifetime' } as const;
  const coverage = wrapped?.coverage;
  const importedOrderCount = coverage?.orderCount ?? analytics.totalReceipts;
  const formatCoverageMonth = (dateString: string) => {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };
  const coverageWindow = coverage?.earliestOrderDate && coverage?.latestOrderDate
    ? `${formatCoverageMonth(coverage.earliestOrderDate)}–${formatCoverageMonth(coverage.latestOrderDate)}`
    : null;
  const coverageHeadline = coverageWindow
    ? `${importedOrderCount} imported orders · ${coverageWindow}`
    : `${importedOrderCount} imported orders currently in SnackTrack`;

  // "Top X% of eaters" pill — cross-user standing, shown only when the pool was
  // large enough for the API to return a percentile. Suppressed for unremarkable
  // middle-of-the-pack standings (top >50% isn't a flex).
  const percentilePill = (topPercent: number | undefined, noun: string) => {
    if (topPercent == null || topPercent > 50) {
      return null;
    }
    return (
      <View style={styles.percentilePill}>
        <Text style={styles.percentilePillText}>Top {topPercent}% of {noun}</Text>
      </View>
    );
  };

  // ---------------------------------------------------------------- core ----

  const intro: Slide = {
    id: 'lifetime-intro',
    category: 'headline',
    scope: lifetimeScope,
    gradient: 'forest',
    emoji: '🎊',
    mascotPose: 'wave',
    durationMs: 2700,
    a11y: `The Lifetime Damage. Based on ${coverageHeadline}.${coverage?.hasExportData ? ' Includes downloaded provider history.' : ''}`,
    content: (
      <>
        <Text style={styles.wrappedYearTag}>LIFETIME</Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          The Lifetime Damage
        </Text>
        <Text style={styles.introText}>{coverageHeadline}</Text>
        {coverage?.hasExportData && (
          <Text style={styles.coverageSourceText}>Includes your downloaded delivery history</Text>
        )}
      </>
    ),
  };

  const totalDamageMessage = getDeterministicMessage('totalDamage', analytics, undefined, 0);
  const spendTop = percentiles?.totalSpent?.topPercent;
  const damage: Slide = {
    id: 'lifetime-damage',
    category: 'headline',
    scope: lifetimeScope,
    gradient: 'ember',
    emoji: '😱',
    mascotPose: 'prop-receipt',
    a11y: `The Lifetime Damage. ${formatCurrency(analytics.totalSpent)} across imported delivery orders.${
      spendTop != null && spendTop <= 50 ? ` Top ${spendTop} percent of spenders.` : ''
    } ${totalDamageMessage}`,
    content: (
      <>
        <Text style={styles.slideTitle}>The Lifetime Damage</Text>
        <AnimatedCount value={analytics.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
        <Text style={styles.bigNumberLabel}>across your imported orders</Text>
        {percentilePill(spendTop, 'spenders')}
        <Spacer h={6} />
        <DelayedFadeIn delay={ROAST_DELAY_MS}>
          <Text style={styles.roastText}>{totalDamageMessage}</Text>
        </DelayedFadeIn>
      </>
    ),
  };

  // ------------------------------------------------- optional stat slides ----

  const optional: RankedSlide[] = [];

  if (wrapped?.shame.lateNightOrders) {
    const data = wrapped.shame.lateNightOrders;
    const lateNightMessage = getDeterministicMessage('lateNightOrders', analytics, data.count, 1);
    optional.push({
      id: 'late-night-orders',
      category: 'extreme-moment',
      intensity: clamp100((data.count / 20) * 100),
      slide: {
        id: 'late-night-orders',
        category: 'extreme-moment',
        scope: lifetimeScope,
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
      id: 'laziest-day',
      category: 'extreme-moment',
      intensity: clamp100((data.orderCount / 5) * 100),
      slide: {
        id: 'laziest-day',
        category: 'extreme-moment',
        scope: lifetimeScope,
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
      id: 'longest-streak',
      category: 'extreme-moment',
      intensity: clamp100((data.days / 14) * 100),
      slide: {
        id: 'longest-streak',
        category: 'extreme-moment',
        scope: lifetimeScope,
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

  if (wrapped?.shame.chainDependency && wrapped.shame.chainDependency.orderCount >= 3) {
    const data = wrapped.shame.chainDependency;
    const chainMessage = getDeterministicMessage('chainDependency', analytics, data.worstOffender, 4);
    optional.push({
      id: 'chain-dependency',
      category: 'habit',
      intensity: clamp100(data.percentage),
      slide: {
        id: 'chain-dependency',
        category: 'habit',
        scope: lifetimeScope,
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

  if (wrapped?.shame.singleItemOrders && wrapped.shame.singleItemOrders.count >= 3) {
    const data = wrapped.shame.singleItemOrders;
    const singleItemMessage = getDeterministicMessage('singleItemOrders', analytics, data.count, 5);
    optional.push({
      id: 'single-item-orders',
      category: 'habit',
      intensity: clamp100((data.count / 30) * 100),
      slide: {
        id: 'single-item-orders',
        category: 'habit',
        scope: lifetimeScope,
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
      id: 'most-expensive-order',
      category: 'extreme-moment',
      intensity: clamp100((data.amount / 150) * 100),
      slide: {
        id: 'most-expensive-order',
        category: 'extreme-moment',
        scope: lifetimeScope,
        gradient: 'indigo',
        emoji: '💰',
        mascotPose: 'flex',
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

  if (wrapped?.flex.coffeeAddiction && wrapped.flex.coffeeAddiction.orderCount >= 3) {
    const data = wrapped.flex.coffeeAddiction;
    const coffeeMessage = getDeterministicMessage('coffeeSpending', analytics, data.totalSpent, 7);
    optional.push({
      id: 'coffee-addiction',
      category: 'habit',
      intensity: clamp100((data.orderCount / 50) * 100),
      confidence: Math.min(1, data.orderCount / 3),
      slide: {
        id: 'coffee-addiction',
        category: 'habit',
        scope: lifetimeScope,
        gradient: 'amber',
        emoji: '☕',
        mascotPose: 'prop-coffee',
        a11y: `The Caffeine Economy. ${formatCurrency(data.totalSpent)} spent on coffee. ${coffeeMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>The Caffeine Economy</Text>
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

  if (wrapped?.flex.nightOwl && wrapped.flex.nightOwl.count >= 3) {
    const data = wrapped.flex.nightOwl;
    const nightOwlMessage = getDeterministicMessage('nightOwlPercentage', analytics, data.percentage, 8);
    const owlTop = percentiles?.nightOwl?.topPercent;
    optional.push({
      id: 'night-owl',
      category: 'pattern',
      intensity: clamp100(data.percentage),
      slide: {
        id: 'night-owl',
        category: 'pattern',
        scope: lifetimeScope,
        gradient: 'indigo',
        emoji: '🦉',
        mascotPose: 'wink',
        a11y: `Night Owl Badge. ${Math.round(data.percentage)} percent of orders after 10pm.${
          owlTop != null && owlTop <= 50 ? ` Top ${owlTop} percent of night owls.` : ''
        } ${nightOwlMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Night Owl Badge</Text>
            <AnimatedCount value={data.percentage} format={(n) => `${Math.round(n)}%`} style={styles.bigNumber} />
            <Text style={styles.bigNumberLabel}>orders after 10pm</Text>
            {percentilePill(owlTop, 'night owls')}
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
      id: 'could-have-bought',
      category: 'perspective',
      intensity: clamp100((data.totalSpent / 5000) * 100),
      slide: {
        id: 'could-have-bought',
        category: 'perspective',
        scope: lifetimeScope,
        gradient: 'amber',
        emoji: emoji,
        mascotPose: 'thinking',
        a11y: `Could Have Bought ${selectedComparison.quantity} ${selectedComparison.item}. ${couldHaveBoughtMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Could Have Bought</Text>
            <View style={styles.comparisonSplit}>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonEyebrow}>YOU GOT</Text>
                <Text style={styles.comparisonValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalSpent)}
                </Text>
                <Text style={styles.comparisonLabel}>in delivery receipts</Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonEyebrow}>COULD HAVE HAD</Text>
                <AnimatedCount value={selectedComparison.quantity} style={styles.comparisonValue} />
                <Text style={styles.comparisonLabel}>{selectedComparison.item}</Text>
              </View>
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
      id: 'missed-investment',
      category: 'perspective',
      intensity: clamp100((data.missedGains / 1500) * 100),
      slide: {
        id: 'missed-investment',
        category: 'perspective',
        scope: lifetimeScope,
        gradient: 'lagoon',
        emoji: '📈',
        mascotPose: 'prop-piggy-bank',
        a11y: `The Investment You Didn't Make. Worth ${formatCurrency(data.wouldBeWorth)} at a hypothetical ${data.sp500Return} percent annual return. ${investmentMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>The Investment You Didn&apos;t Make</Text>
            <AnimatedCount value={data.wouldBeWorth} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
            <Text style={styles.bigNumberLabel}>at a hypothetical {data.sp500Return}% annual return</Text>
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
      id: 'delivery-tax',
      category: 'perspective',
      intensity: clamp100((data.averageDeliveryFeePerMeal / 8) * 100),
      slide: {
        id: 'delivery-tax',
        category: 'perspective',
        scope: lifetimeScope,
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
      id: 'delivery-waits',
      category: 'perspective',
      intensity: clamp100((data.totalMinutes / 1440) * 100),
      slide: {
        id: 'delivery-waits',
        category: 'perspective',
        scope: lifetimeScope,
        gradient: 'lagoon',
        emoji: '⏱️',
        mascotPose: 'sad',
        durationMs: 7200, // dense slide — four detail rows to read
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

  if (wrapped?.patterns.peakHungerHour && wrapped.patterns.peakHungerHour.orderCount >= 3) {
    const data = wrapped.patterns.peakHungerHour;
    const peakHungerMessage = getDeterministicMessage('peakHungerHour', analytics, data.hour, 12);
    optional.push({
      id: 'peak-hunger-hour',
      category: 'pattern',
      intensity: clamp100(data.percentageOfTotal * 2.5),
      slide: {
        id: 'peak-hunger-hour',
        category: 'pattern',
        scope: lifetimeScope,
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
    const isWeekendMore = data.ratio > 1;
    const normalizedWeekendShare = data.ratio > 0 ? data.ratio / (1 + data.ratio) : 0;
    const weekendWarriorMessage = getDeterministicMessage('weekendWarrior', analytics, undefined, 13);
    if (Math.abs(normalizedWeekendShare - 0.5) >= 0.1) {
      optional.push({
        id: 'weekend-warrior',
        category: 'pattern',
        // Interesting only insofar as spending skews away from an even split.
        intensity: clamp100(Math.abs(normalizedWeekendShare - 0.5) * 200),
        slide: {
          id: 'weekend-warrior',
          category: 'pattern',
          scope: lifetimeScope,
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
  }

  // Month-by-month spending chart — one visual slide to break up the
  // number-title-roast rhythm. Needs at least 3 months to be worth showing.
  if (analytics.monthlyBreakdown && analytics.monthlyBreakdown.length >= 3) {
    const months = [...analytics.monthlyBreakdown]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
    const peak = months.reduce((best, m) => (m.totalSpent > best.totalSpent ? m : best), months[0]);
    optional.push({
      id: 'spending-timeline',
      category: 'trend',
      intensity: clamp100(months.length * 8),
      slide: {
        id: 'spending-timeline',
        category: 'trend',
        scope: lifetimeScope,
        gradient: 'lagoon',
        emoji: '📊',
        hideHero: true, // the chart is the hero — reclaim the mascot's vertical room
        durationMs: 7200,
        a11y: `Month by Month. Your peak month cost ${formatCurrency(peak.totalSpent)}.`,
        content: (
          <>
            <Text style={styles.slideTitle}>The Damage Over Time</Text>
            <Text style={styles.bigNumberLabel}>your recent spending timeline</Text>
            <MonthlySpendChart data={months} formatCurrency={formatCurrency} />
            <Spacer h={10} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Peak month: {formatCurrency(peak.totalSpent)}</Text>
            </View>
          </>
        ),
      },
    });
  }

  // ------------------------------------------------------------- finale ----

  // Top 5 restaurants — the iconic "top artists" moment. Core when the data
  // supports it (needs at least 3 spots to feel like a ranking).
  const topSpots = (analytics.topRestaurants ?? [])
    .map((spot) => ({
      ...spot,
      name: typeof spot.name === 'string' ? spot.name.trim() : '',
    }))
    .filter((spot) => /[\p{L}\p{N}]/u.test(spot.name))
    .slice(0, 5);
  const top5: Slide | null = topSpots.length >= 3
    ? {
        id: 'top-spots',
        category: 'places',
        scope: lifetimeScope,
        gradient: 'indigo',
        emoji: '🏆',
        mascotPose: 'trophy',
        durationMs: 7200,
        a11y: `Your Top 5 Spots. Number one: ${topSpots[0].name} with ${topSpots[0].count} orders.`,
        content: (
          <>
            <Text style={styles.slideTitle}>Your Top 5 Spots</Text>
            <View style={styles.topSpotsList}>
              {topSpots.map((spot, i) => (
                <View key={`${spot.name}-${i}`} style={styles.topSpotRow}>
                  <Text style={styles.topSpotRank}>{i + 1}</Text>
                  <Text style={styles.topSpotName} numberOfLines={1} ellipsizeMode="tail">{spot.name}</Text>
                  <Text style={styles.topSpotCount}>{spot.count} orders</Text>
                </View>
              ))}
            </View>
          </>
        ),
      }
    : null;

  if (top5) {
    optional.push({
      id: 'top-spots',
      category: 'places',
      intensity: 100,
      slide: top5,
    });
  }

  const closing: Slide = {
    id: 'case-closed',
    category: 'transition',
    scope: lifetimeScope,
    gradient: 'verdict',
    emoji: '',
    hideHero: true,
    durationMs: 2800,
    a11y: 'The case is closed. We reviewed the evidence, and the pattern is undeniable.',
    content: (
      <>
        <Text style={styles.verdictEyebrow}>EVIDENCE REVIEWED</Text>
        <View style={styles.verdictRule} />
        <Text style={styles.verdictTitle}>The Case{`\n`}Is Closed</Text>
        <Text style={styles.verdictBody}>We reviewed the receipts.{`\n`}The pattern is undeniable.</Text>
      </>
    ),
  };

  // Personality Archetype — the climactic reveal. Only confetti in the deck,
  // launched in sync with the two-beat name slam.
  const archetype = getArchetype(analytics, formatCurrency);
  const archetypeSlide: Slide = {
    id: 'lifetime-archetype',
    category: 'identity',
    scope: lifetimeScope,
    gradient: archetype.gradient,
    emoji: archetype.emoji,
    mascotPose: 'sunglasses',
    confetti: true,
    confettiDelayMs: ARCHETYPE_REVEAL_DELAY_MS,
    glow: true,
    durationMs: 8000,
    showShareCta: true,
    a11y: `Your all-time food personality is ${archetype.name}. ${archetype.tagline} ${formatCurrency(analytics.totalSpent)} across ${importedOrderCount} imported orders.`,
    content: (
      <>
        {/* Personalized card header — name lights up once the API provides one */}
        <Text style={styles.wrappedYearTag}>
          {userName ? `${userName}'s ` : ''}LIFETIME
        </Text>
        <Text style={styles.archetypeKicker}>Your all-time food personality is</Text>
        <DelayedSlam delay={ARCHETYPE_REVEAL_DELAY_MS} hapticOnReveal>
          <Text style={styles.archetypeName} numberOfLines={2} adjustsFontSizeToFit>{archetype.name}</Text>
          <Text style={styles.archetypeTagline}>{archetype.tagline}</Text>
          {/* All-time headline — this is the share card, so the money number is
              guaranteed here. Only 2 of the 9 archetypes surface it in traits. */}
          <View style={styles.archetypeHeadline}>
            <Text style={styles.archetypeHeadlineValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(analytics.totalSpent)}
            </Text>
            <Text style={styles.archetypeHeadlineLabel}>
              imported lifetime · {importedOrderCount} orders
            </Text>
          </View>
          {/* Two flavour traits — the headline above carries the hero stat. */}
          <View style={styles.archetypeTraits}>
            {archetype.traits.slice(0, 2).map((trait, i) => (
              <View key={i} style={styles.archetypeTraitRow}>
                <Text style={styles.archetypeTraitEmoji}>{trait.emoji}</Text>
                <Text style={styles.archetypeTraitLabel} numberOfLines={1}>{trait.label}</Text>
                <Text style={styles.archetypeTraitValue} numberOfLines={1}>{trait.value}</Text>
              </View>
            ))}
          </View>
          {/* Collection framing — invites comparing personalities with friends */}
          <Text style={styles.archetypeRarity}>1 of {ARCHETYPE_COUNT} food personalities</Text>
        </DelayedSlam>
      </>
    ),
  };

  // -------------------------------------------------- selection & order ----

  const picked = selectEditorialCandidates(
    optional.map(candidate => ({
      id: candidate.id,
      category: candidate.category,
      intensity: candidate.intensity,
      confidence: candidate.confidence,
      value: candidate.slide,
    }))
  ).map(candidate => candidate.value);

  const slides: Slide[] = [
    intro,
    damage,
    ...picked,
    closing,
    archetypeSlide,
  ];

  // Apply the Phase 6 visual grammar after selection. This keeps category
  // colour and repetition rules correct even when sparse data removes beats.
  return slides.reduce<Slide[]>((directed, slide) => {
    const previous = directed[directed.length - 1];
    const categoryGradient = CATEGORY_GRADIENTS[slide.category] ?? slide.gradient;
    const gradient = previous?.gradient === categoryGradient
      ? (ALTERNATE_GRADIENTS[slide.category] ?? categoryGradient)
      : categoryGradient;
    const mascotPose = slide.mascotPose && previous?.mascotPose === slide.mascotPose
      ? REPEATED_POSE_FALLBACKS[slide.category]
      : slide.mascotPose;

    directed.push({ ...slide, gradient, mascotPose });
    return directed;
  }, []);
}
