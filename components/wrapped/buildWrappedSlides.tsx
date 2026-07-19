/**
 * Slide definitions for the Wrapped share journey. Pure function of the
 * analytics payload — no animation or gesture logic lives here, so slide
 * copy, poses, and ordering can change without touching the player.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary } from '../../types/api';
import { getDeterministicMessage } from '../../utils/wrappedMessages';
import { getArchetype } from '../../utils/wrappedArchetype';
import { MascotPose } from '../mascot/MascotPlaceholder';
import { STORY_GRADIENTS } from './wrappedTheme';
import { AnimatedCount, Spacer } from './WrappedSlideEffects';
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
  shareTargetIndex?: number;
  confetti?: boolean;
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
}
