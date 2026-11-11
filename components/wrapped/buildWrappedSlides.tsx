import { recapMascot } from '@components/mascot/storyMascots';
import { historicalInvestmentLabel, historicalInvestmentMethodology, investmentBenchmarkNames } from '@utils/historicalInvestmentPresentation';
import { formatReceiptMoney } from '@utils/receiptMoney';
/**
 * Slide definitions for the Wrapped share journey. Pure function of the
 * analytics payload — no animation or gesture logic lives here, so slide
 * copy, poses, and ordering can change without touching the player.
 *
 * Deck shape (max MAX_DECK_SIZE slides):
 *   lifetime damage → delivery picture/context → pattern chapter →
 *   extreme-moment chapter → case closed → lifetime archetype
 *
 * The archetype card closes the deck: it's the shareable artifact, so it carries
 * the all-time spend headline as well as the personality reveal.
 *
 * New payloads carry user-relative scores. The player keeps up to six
 * personalized facts so chapter transitions fit within the twelve-slide cap.
 * Legacy payloads retain their renderer.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { UserSummary, WrappedSpending } from '@/types/api';
import { getDeterministicMessage } from '@utils/wrappedMessages';
import { getArchetype, ARCHETYPE_COUNT } from '@utils/wrappedArchetype';
import { MascotPose } from '@components/mascot/Mascot';
import { STORY_GRADIENTS } from './wrappedTheme';
import { AnimatedCount, DelayedFadeIn, DelayedSlam, Spacer } from './WrappedSlideEffects';
import { RecapStorySlide, recapMoney, recapStoryText } from './RecapStorySlide';
import { groupSlidesByRecapChapter, selectPersonalizedStories } from './wrappedSlideSelection';
import { styles } from './wrappedStyles';
import { recapEvidenceText } from './RecapEvidencePanel';
import { recapOrdersText } from './RecapDayOrders';
import { orderRecapPresentation } from './orderRecapPresentation';
import { wrappedSpendingLines } from './wrappedSpendingPresentation';
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
  /** Optional secondary emoji accents around a mascot-led hero. */
  accentEmoji?: string;
  /** Number of supporting accents; the mascot always remains the dominant hero. */
  accentEmojiCount?: 1 | 2 | 3;
  /** Suppress the hero image entirely (mascot/emoji) — for slides whose body IS
   *  the hero, e.g. the month-by-month chart, which needs the vertical room. */
  hideHero?: boolean;
  compactHero?: boolean;
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
export const MAX_DECK_SIZE = 12;

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

type StoryHero = Pick<Slide, 'emoji'> & Partial<Pick<Slide, 'mascotPose' | 'accentEmoji' | 'accentEmojiCount'>>;

const emojiLed = (emoji: string): StoryHero => ({ emoji });
const hybrid = (mascotPose: MascotPose, accentEmoji: string, accentEmojiCount: 1 | 2 | 3 = 3): StoryHero => ({
  emoji: '',
  mascotPose,
  accentEmoji,
  accentEmojiCount,
});

/** Visual metaphors belong to presentation, while the API continues to own facts and scoring. */
const recapStoryHero = (storyId: string): StoryHero => {
  const mascot = recapMascot(storyId);
  if (mascot) return { emoji: '', ...mascot };
  if (storyId.startsWith('ordering-escalation-')) return hybrid('flex', '📈', 2);
  const treatments: Record<string, StoryHero> = {
    'restaurant-loyalty': hybrid('wink', '❤️', 2),
    'restaurant-concentration': hybrid('prop-receipt', '🍕', 2),
    'refunded-orders': hybrid('sad', '↩️', 2),
    'chain-dependency': hybrid('wink', '🍔', 2),
    'coffee-addiction': hybrid('prop-coffee', '☕', 2),
    'weekend-warrior': hybrid('thinking', '📅', 2),
    'peak-hunger-hour': emojiLed('⏰'),
    'top-spots': emojiLed('🏆'),
    'delivery-tax': emojiLed('💸'),
    'could-have-bought': emojiLed('🛒'),
    'history-restaurants': emojiLed('🗺️'),
    'history-provider': emojiLed('📱'),
    'history-duration': emojiLed('🗓️'),
    'history-average': emojiLed('🧾'),
    'history-top-restaurant': emojiLed('⭐'),
    'history-provider-count': emojiLed('📲'),
    'history-itemized': emojiLed('🧾'),
    'history-item-count': emojiLed('🍟'),
    'history-menu-variety': emojiLed('🍽️'),
    'history-ordering-days': emojiLed('📆'),
  };
  return treatments[storyId] ?? { emoji: '', mascotPose: 'prop-receipt' };
};

/** Beat between the hero number landing and the roast punchline fading in. */
const ROAST_DELAY_MS = 550;

export function buildWrappedSlides({
  analytics,
  formatCurrency: fallbackCurrency,
  formatDate,
  userName,
}: BuildWrappedSlidesParams): Slide[] {
  const formatCurrency = (value: number) => formatReceiptMoney(value, analytics.currencyCode, fallbackCurrency);
  const wrapped = analytics.wrappedAnalytics;
  const recap = wrapped?.recap;
  const orderRecap = orderRecapPresentation(analytics);
  const costDetails = (data: WrappedSpending) => wrappedSpendingLines(data, formatCurrency)
    .map((line) => <Text key={line} style={styles.detailText}>{line}</Text>);
  const percentiles = orderRecap && wrapped?.percentiles?.policyVersion !== 3 ? undefined : wrapped?.percentiles;
  const lifetimeScope = { kind: 'lifetime' } as const;
  const importedOrderCount = wrapped?.coverage?.orderCount ?? analytics.totalReceipts;
  // Each metric has its own eligible comparison group, not a rank among all users.
  const comparison = (metric: 'totalSpent' | 'nightOwl', noun: string) => {
    const standing = percentiles?.[metric];
    if (!standing || standing.topPercent > 50) return undefined;
    if (percentiles?.policyVersion !== 3) return { label: `Top ${standing.topPercent}% of ${noun}`, detail: '' };
    if (!standing.sampleSize || standing.sampleSize < 100 ||
      (metric === 'totalSpent' && percentiles.currencyCode !== analytics.currencyCode)) return undefined;
    return {
      label: `Top ${standing.topPercent}% by ${metric === 'totalSpent' ? `${percentiles.currencyCode} net cost` : 'late-night share'}`,
      detail: `${standing.sampleSize.toLocaleString()} comparable accounts · imported histories vary${metric === 'totalSpent' ? '; totals may include export estimates' : ''}`,
    };
  };
  const percentilePill = (value: ReturnType<typeof comparison>) => {
    if (!value) return null;
    return (
      <>
        <View style={styles.percentilePill}><Text style={styles.percentilePillText}>{value.label}</Text></View>
        {value.detail ? <Text style={styles.detailText}>{value.detail}</Text> : null}
      </>
    );
  };

  // ---------------------------------------------------------------- core ----

  const headlinePriceKnown = !orderRecap || (orderRecap.metrics.currencies.find((c) => c.currencyCode === analytics.currencyCode)?.pricedOrders ?? 0) > 0;
  const totalDamageMessage = getDeterministicMessage('totalDamage', analytics, undefined, 0);
  const spendComparison = comparison('totalSpent', 'spenders');
  const damage: Slide = {
    id: 'lifetime-damage',
    category: 'headline',
    scope: lifetimeScope,
    gradient: 'ember',
    emoji: '😱',
    mascotPose: 'prop-empty-wallet',
    accentEmoji: '💸',
    a11y: `The Lifetime Damage. ${headlinePriceKnown ? formatCurrency(analytics.totalSpent) : 'Net cost unavailable'} ${orderRecap ? 'in known net order costs, including charged cancellations and wallet payments' : 'across imported delivery orders'}.${
      spendComparison ? ` ${spendComparison.label}. ${spendComparison.detail}` : ''
    } ${totalDamageMessage}`,
    content: (
      <>
        <Text style={styles.slideTitle}>The Lifetime Damage</Text>
        {headlinePriceKnown ? <AnimatedCount value={analytics.totalSpent} format={formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit /> : <Text style={styles.bigNumber}>—</Text>}
        <Text style={styles.bigNumberLabel}>{!headlinePriceKnown ? 'Spending unavailable' : 'across your imported orders'}</Text>
        {orderRecap?.metrics.currencies.filter((c) => c.currencyCode !== analytics.currencyCode && c.pricedOrders > 0).map((c) => <Text key={c.currencyCode} style={styles.detailText}>Also {formatReceiptMoney(c.netSpend, c.currencyCode, fallbackCurrency)} in {c.currencyCode} orders</Text>)}
        {percentilePill(spendComparison)}
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
        ...recapStoryHero('late-night-orders'),
        a11y: `3am Regret. ${data.count} ${orderRecap ? 'deliveries ordered' : 'orders'} between 10pm and 4am. ${wrappedSpendingLines(data, formatCurrency).join('. ')}. ${lateNightMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>3am Regret</Text>
            <AnimatedCount value={data.count} style={[styles.bigNumber, styles.bigNumberBleed]} />
            <Text style={styles.bigNumberLabel}>{orderRecap ? 'deliveries ordered' : 'orders'} between 10pm–4am</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              {data.worstOffender ? <>
                <Text style={styles.detailText}>{orderRecap ? 'Highest net cost' : 'Worst offense'}: {data.worstOffender.restaurant}</Text>
                <Text style={styles.detailText}>at {data.worstOffender.time} · {formatReceiptMoney(data.worstOffender.amount, data.spending?.[0]?.currencyCode ?? analytics.currencyCode, fallbackCurrency)}{orderRecap ? ' net' : ''}</Text>
              </> : <Text style={styles.detailText}>Latest order time: {data.latestOrder}</Text>}
              {orderRecap ? <Text style={styles.detailText}>All late-night deliveries</Text> : null}
              {costDetails(data)}
            </View>
            <DelayedFadeIn delay={ROAST_DELAY_MS}>
              <Text style={styles.roastText}>{lateNightMessage}</Text>
            </DelayedFadeIn>
          </>
        ),
      },
    });
  }

  if (orderRecap?.ranking?.status === 'available') {
    const day = orderRecap.ranking;
    const amounts = day.spending.filter(currency => currency.pricedOrders > 0).map(currency =>
      `${currency.unknownPriceOrders ? 'Tracked spending' : 'Total'}: ${formatReceiptMoney(currency.deliveredNetSpend, currency.currencyCode, fallbackCurrency)}`,
    );
    optional.push({
      id: 'most-deliveries-day', category: 'extreme-moment', intensity: clamp100((day.deliveries / 5) * 100),
      slide: {
        id: 'most-deliveries-day', category: 'extreme-moment', scope: lifetimeScope,
        gradient: 'berry', ...recapStoryHero('most-deliveries-day'),
        a11y: `Most deliveries in a day. ${day.deliveries} deliveries on ${formatDate(day.day)}. ${amounts.join('. ')}. Canceled orders excluded; refunded deliveries count once.`,
        content: <>
          <Text style={styles.slideTitle}>Most deliveries in a day</Text>
          <AnimatedCount value={day.deliveries} style={styles.bigNumber} />
          <Text style={styles.bigNumberLabel}>completed deliveries</Text>
          <Spacer h={6} />
          <View style={styles.detailBox}>
            <Text style={styles.detailText}>{formatDate(day.day)}</Text>
            {amounts.map((amount) => <Text key={amount} style={styles.detailText}>{amount}</Text>)}
          </View>
          <Text style={styles.roastText}>{getDeterministicMessage('laziestDay', analytics, day.deliveries, 2)}</Text>
        </>,
      },
    });
  } else if (!orderRecap && wrapped?.shame.laziestDay) {
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
        ...recapStoryHero('laziest-day'),
        a11y: `Laziest Day. ${data.orderCount} orders in one day. ${laziestDayMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Laziest Day</Text>
            <AnimatedCount value={data.orderCount} style={styles.bigNumber} />
            <Text style={styles.bigNumberLabel}>orders in one day</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.date)} ({data.dayOfWeek})</Text>
              {costDetails(data)}
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
        ...recapStoryHero('longest-streak'),
        a11y: `Serial Orderer. ${data.days} consecutive days ${orderRecap ? 'with completed deliveries' : 'ordering'}. ${wrappedSpendingLines(data, formatCurrency).join('. ')}. ${streakMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Serial Orderer</Text>
            <AnimatedCount value={data.days} style={[styles.bigNumber, styles.bigNumberBleed]} />
            <Text style={styles.bigNumberLabel}>consecutive days {orderRecap ? 'with deliveries' : 'ordering'}</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{formatDate(data.startDate)} - {formatDate(data.endDate)}</Text>
              {costDetails(data)}
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
        emoji: '',
        mascotPose: 'wink',
        accentEmoji: '🍔',
        accentEmojiCount: 2,
        a11y: `Chain Dependency. ${Math.round(data.percentage)} percent of orders were ${data.worstOffender}. ${chainMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Chain Dependency</Text>
            <AnimatedCount value={data.percentage} format={(n) => `${Math.round(n)}%`} style={styles.bigNumber} />
            <Text style={styles.bigNumberLabel}>of {orderRecap ? 'deliveries' : 'orders'} were {data.worstOffender}</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.orderCount} orders</Text>
              {costDetails(data)}
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
        ...recapStoryHero('single-item-orders'),
        a11y: `${orderRecap ? 'Just one item' : "Couldn't Go Get It"}. ${data.count} single-item orders. ${singleItemMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Couldn’t Go Get It</Text>
            <AnimatedCount value={data.count} style={styles.bigNumber} />
            <Text style={styles.bigNumberLabel}>single-item orders</Text>
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Most common: {data.mostCommon}</Text>
              {costDetails(data)}
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
    const expensiveCurrency = (amount: number) => formatReceiptMoney(amount, data.currencyCode ?? analytics.currencyCode, fallbackCurrency);
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
        ...recapStoryHero('most-expensive-order'),
        a11y: `Bougie Moment. ${orderRecap ? 'Highest delivery net cost' : 'Most expensive order'}: ${expensiveCurrency(data.amount)} at ${data.restaurant}. ${expensiveMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Bougie Moment</Text>
            <AnimatedCount value={data.amount} format={expensiveCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
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
    const coffeeCountOnly = Boolean(orderRecap) || data.totalSpent === null;
    const coffeeMessage = coffeeCountOnly ? 'Your coffee habit has a delivery history of its own.' : getDeterministicMessage('coffeeSpending', analytics, data.totalSpent!, 7);
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
        emoji: '',
        mascotPose: 'prop-coffee',
        accentEmoji: '☕',
        accentEmojiCount: 2,
        a11y: coffeeCountOnly ? `Coffee deliveries. ${data.orderCount} completed restaurant deliveries included coffee items. ${coffeeMessage}` : `The Caffeine Economy. ${formatCurrency(data.totalSpent!)} spent on coffee. ${coffeeMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>{coffeeCountOnly ? 'Coffee deliveries' : 'The Caffeine Economy'}</Text>
            <AnimatedCount value={coffeeCountOnly ? data.orderCount : data.totalSpent!} format={coffeeCountOnly ? undefined : formatCurrency} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
            <Text style={styles.bigNumberLabel}>{coffeeCountOnly ? 'restaurant deliveries with coffee items' : 'spent on coffee'}</Text>
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
    const owlComparison = comparison('nightOwl', 'night owls');
    const nightLabel = orderRecap ? 'timed deliveries ordered between 10pm–4am' : 'orders after 10pm';
    optional.push({
      id: 'night-owl',
      category: 'pattern',
      intensity: clamp100(data.percentage),
      slide: {
        id: 'night-owl',
        category: 'pattern',
        scope: lifetimeScope,
        gradient: 'indigo',
        ...recapStoryHero('night-owl'),
        a11y: `Night Owl Badge. ${Math.round(data.percentage)} percent of ${nightLabel}.${
          owlComparison ? ` ${owlComparison.label}. ${owlComparison.detail}` : ''
        } ${nightOwlMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Night Owl Badge</Text>
            <AnimatedCount value={data.percentage} format={(n) => `${Math.round(n)}%`} style={styles.bigNumber} />
            <Text style={styles.bigNumberLabel}>{nightLabel}</Text>
            {percentilePill(owlComparison)}
            <Spacer h={6} />
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{data.count} late-night {orderRecap ? 'deliveries' : 'orders'}</Text>
              {costDetails(data)}
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

  const historical = wrapped?.comparative.historicalInvestment;
  if (historical) {
    const chosen = historical.outcomes[historical.selectedBenchmark];
    const other = historical.selectedBenchmark === 'sp500' ? 'nasdaq' : 'sp500';
    const money = (amount: number) => formatReceiptMoney(amount, historical.currencyCode, fallbackCurrency);
    const label = historicalInvestmentLabel(historical);
    const comparison = `Higher of the Nasdaq and S&P 500 scenarios. ${investmentBenchmarkNames[other]}: ${money(historical.outcomes[other].value)}.`;
    optional.push({ id: 'historical-investment', category: 'perspective', intensity: clamp100(chosen.gain / 1500 * 100), slide: {
      id: 'historical-investment', category: 'perspective', scope: lifetimeScope, gradient: 'lagoon', ...recapStoryHero('historical-investment'),
      a11y: `If your orders were investments. ${money(historical.contributed)} across ${historical.contributionCount} orders could have been worth ${money(chosen.value)}. ${label}. Hypothetical gain ${money(chosen.gain)}. ${comparison} ${historicalInvestmentMethodology}`,
      content: <>
        <Text style={styles.slideTitle}>If your orders were investments</Text>
        <AnimatedCount value={chosen.value} format={money} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit />
        <Text style={styles.bigNumberLabel}>{label}</Text>
        <View style={styles.detailBox}>
          <Text style={styles.detailText}>{money(historical.contributed)} across {historical.contributionCount} orders</Text>
          <Text style={styles.detailText}>{money(chosen.gain)} hypothetical gain</Text>
          <Text style={styles.detailText}>{comparison}</Text>
          <Text style={styles.detailText}>{historicalInvestmentMethodology}</Text>
        </View>
      </>,
    } });
  }

  if (!historical && wrapped?.comparative.missedInvestment) {
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
        ...recapStoryHero('missed-investment'),
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
        emoji: '💸',
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
        ...recapStoryHero('delivery-waits'),
        durationMs: 7200, // dense slide — four detail rows to read
        a11y: `${orderRecap ? 'Delivery timing' : 'Waiting Time'}. ${formattedTotalTime} ${orderRecap ? 'across recorded delivery intervals' : 'spent waiting for delivery'}. ${waitingTimeMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>{orderRecap ? 'Delivery timing' : 'Waiting Time'}</Text>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formattedTotalTime}</Text>
            <Text style={styles.bigNumberLabel}>{orderRecap ? 'across recorded delivery intervals' : 'spent waiting for delivery'}</Text>
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
        a11y: `Peak Hunger Hour. ${data.hourDisplay} is your ${orderRecap ? 'most common placement hour' : 'hungriest time'}. ${peakHungerMessage}`,
        content: (
          <>
            <Text style={styles.slideTitle}>Peak Hunger Hour</Text>
            <Text style={styles.bigNumber}>{data.hourDisplay}</Text>
            <Text style={styles.bigNumberLabel}>{orderRecap ? 'most common placement hour' : 'your hungriest time'}</Text>
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

  if (wrapped?.patterns.weekendWarrior && wrapped.patterns.weekendWarrior.ratio !== null) {
    const data = wrapped.patterns.weekendWarrior;
    const ratio = data.ratio!;
    const isWeekendMore = ratio > 1;
    const normalizedWeekendShare = ratio > 0 ? ratio / (1 + ratio) : 0;
    const weekendWarriorMessage = data.ratioBasis === 'deliveries_per_day' ? data.message : getDeterministicMessage('weekendWarrior', analytics, undefined, 13);
    if (Math.abs(normalizedWeekendShare - 0.5) >= 0.1) {
      optional.push({
        id: 'weekend-warrior',
        category: 'pattern',
        // Policy 3 measures frequency; legacy payloads measure spending.
        intensity: clamp100(Math.abs(normalizedWeekendShare - 0.5) * 200),
        slide: {
          id: 'weekend-warrior',
          category: 'pattern',
          scope: lifetimeScope,
          gradient: 'berry',
          emoji: '',
          mascotPose: 'thinking',
          accentEmoji: isWeekendMore ? '🎉' : '📅',
          accentEmojiCount: 2,
          a11y: `${isWeekendMore ? 'Weekend' : 'Weekday'} Warrior. ${isWeekendMore ? data.weekendOrders : data.weekdayOrders} ${isWeekendMore ? 'weekend' : 'weekday'} orders. ${weekendWarriorMessage}`,
          content: (
            <>
              <Text style={styles.slideTitle}>{isWeekendMore ? 'Weekend Warrior' : 'Weekday Warrior'}</Text>
              <AnimatedCount value={isWeekendMore ? data.weekendOrders : data.weekdayOrders} style={styles.bigNumber} />
              <Text style={styles.bigNumberLabel}>{isWeekendMore ? 'weekend' : 'weekday'} orders</Text>
              <Spacer h={6} />
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>Weekend · {data.weekendOrders} {orderRecap ? 'deliveries' : 'orders'}</Text>
                {costDetails({ totalSpent: data.weekendSpending, spending: data.weekendCosts })}
                <Text style={styles.detailText}>Weekday · {data.weekdayOrders} {orderRecap ? 'deliveries' : 'orders'}</Text>
                {costDetails({ totalSpent: data.weekdaySpending, spending: data.weekdayCosts })}
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

  const patternTransition: Slide = {
    id: 'pattern-emerged',
    category: 'transition',
    scope: lifetimeScope,
    gradient: 'berry',
    emoji: '',
    mascotPose: 'prop-detective',
    durationMs: 2800,
    a11y: 'The numbers were one thing. Then a pattern emerged. And it had a schedule.',
    content: (
      <>
        <Text style={styles.chapterEyebrow}>THE NUMBERS WERE ONE THING.</Text>
        <Text style={styles.chapterTitle}>Then a pattern emerged.</Text>
        <Text style={styles.chapterBody}>And it had a schedule.</Text>
      </>
    ),
  };

  const escalationTransition: Slide = {
    id: 'things-escalated',
    category: 'transition',
    scope: lifetimeScope,
    gradient: 'ember',
    emoji: '',
    mascotPose: 'flex',
    durationMs: 2800,
    a11y: 'The overall damage was one thing. Then things escalated. A few moments stood out.',
    content: (
      <>
        <Text style={styles.chapterEyebrow}>THE OVERALL DAMAGE WAS ONE THING.</Text>
        <Text style={styles.chapterTitle}>Then things escalated.</Text>
        <Text style={styles.chapterBody}>A few moments stood out.</Text>
      </>
    ),
  };

  // Personality Archetype — the climactic reveal. Only confetti in the deck,
  // launched in sync with the two-beat name slam.
  const recapTotal = recap?.spending.amount ?? analytics.totalSpent;
  const recapTotalText = recap ? recapMoney(recapTotal, recap.currency) : headlinePriceKnown ? formatCurrency(recapTotal) : '';
  const archetype = getArchetype(recap ? { ...analytics, totalSpent: recapTotal, currencyCode: recap.currency } : analytics, value => recap ? recapMoney(value, recap.currency) : headlinePriceKnown ? formatCurrency(value) : '—');
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
    a11y: `Your all-time food personality is ${archetype.name}. ${archetype.tagline} ${recapTotalText} across ${importedOrderCount} imported orders.`,
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
            {recap || headlinePriceKnown ? <Text style={styles.archetypeHeadlineValue} numberOfLines={1} adjustsFontSizeToFit>
              {recapTotalText}
            </Text> : null}
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

  const picked = recap ? selectPersonalizedStories(recap.stories, { minStories: historical ? 5 : 6, maxStories: historical ? 5 : 6 }).map((story): Slide => ({
    id: story.id, category: story.category, scope: lifetimeScope,
    gradient: CATEGORY_GRADIENTS[story.category] ?? 'forest', ...recapStoryHero(story.id),
    compactHero: Boolean(story.orders?.length || story.evidence?.orders.length),
    durationMs: story.orders?.length || story.evidence?.orders.length ? 10000 : undefined,
    a11y: `${story.title} ${recapStoryText(story, recap.currency)} ${story.label}. ${story.startDate ? formatDate(story.startDate) : ''} ${story.endDate ? formatDate(story.endDate) : ''}. ${story.detail}. ${recapOrdersText(story.orders)}. ${recapEvidenceText(story.evidence, recap.currency)}. ${story.punchline}`,
    content: <RecapStorySlide story={story} currency={recap.currency} formatDate={formatDate} />,
  })) : selectEditorialCandidates(
    optional.map(candidate => ({
      id: candidate.id,
      category: candidate.category,
      intensity: candidate.intensity,
      confidence: candidate.confidence,
      value: candidate.slide,
    }))
  ).map(candidate => candidate.value);

  if (recap && historical) {
    const investmentSlide = optional.find(candidate => candidate.id === 'historical-investment')?.slide;
    if (investmentSlide) picked.push(investmentSlide);
  }

  const orderPicture: Slide | undefined = orderRecap ? {
    id: 'order-picture', category: 'headline', scope: lifetimeScope, gradient: 'forest', emoji: '📦',
    mascotPose: 'prop-delivery-haul', showShareCta: true,
    a11y: `Your delivery picture. ${orderRecap.metrics.deliveries} completed deliveries, ${orderRecap.metrics.attempts} order attempts, ${orderRecap.metrics.canceled} canceled, ${orderRecap.metrics.confirmedRefunds} confirmed refunds.`,
    content: <>
      <Text style={styles.slideTitle}>Your delivery picture</Text>
      <AnimatedCount value={orderRecap.metrics.deliveries} style={styles.bigNumber} />
      <Text style={styles.bigNumberLabel}>completed deliveries</Text>
      <View style={styles.detailBox}>
        <Text style={styles.detailText}>{orderRecap.metrics.attempts} order attempts · {orderRecap.metrics.canceled} canceled</Text>
        <Text style={styles.detailText}>{orderRecap.metrics.confirmedRefunds} confirmed {orderRecap.metrics.confirmedRefunds === 1 ? 'refund' : 'refunds'}</Text>
      </View>
    </>,
  } : undefined;
  const recapDamage: Slide = recap ? { ...damage,
    a11y: `The Lifetime Damage. ${recapMoney(recap.spending.amount, recap.currency)} across your tracked orders.`,
    content: <>
      <Text style={styles.slideTitle}>The Lifetime Damage</Text>
      <AnimatedCount value={recap.spending.amount} format={n => recapMoney(n, recap.currency)} style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} />
      <Text style={styles.bigNumberLabel}>across your tracked orders</Text>
      <DelayedFadeIn delay={ROAST_DELAY_MS}><Text style={styles.roastText}>{totalDamageMessage}</Text></DelayedFadeIn>
    </>,
  } : damage;
  const chapters = groupSlidesByRecapChapter(picked);
  const slides: Slide[] = [
    recapDamage,
    ...(orderPicture ? [orderPicture] : []),
    ...chapters.opening,
    ...(chapters.patterns.length ? [patternTransition, ...chapters.patterns] : []),
    ...(chapters.extremes.length ? [escalationTransition, ...chapters.extremes] : []),
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
    const mascotPose = slide.mascotPose && !recapMascot(slide.id) && previous?.mascotPose === slide.mascotPose
      ? REPEATED_POSE_FALLBACKS[slide.category]
      : slide.mascotPose;

    directed.push({ ...slide, gradient, mascotPose });
    return directed;
  }, []);
}
