import type {
  DashboardInsight,
  DashboardInsightCategory,
  DashboardInsightIcon,
  DashboardInsightValueFormat,
} from '@/types/api';
import { Card } from '@components/ui/Card';
import { Colors, Radius, Spacing } from '@constants/theme';
import { useCurrency } from '@contexts/CurrencyContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  AccessibilityInfo,
  AppState,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

interface Props {
  insights: DashboardInsight[];
  onOpenExport: () => void;
}

type CarouselSlide =
  | { id: string; kind: 'insight'; insight: DashboardInsight }
  | { id: 'daily-outro'; kind: 'outro' };

const AUTO_ADVANCE_MS = 6000;
const CHAMPION_VISIBLE_ROWS = 4;
const CHAMPION_VIEWPORT_HEIGHT = 192;

const ICONS: Record<DashboardInsightIcon, React.ComponentProps<typeof Ionicons>['name']> = {
  restaurant: 'restaurant-outline', time: 'time-outline', calendar: 'calendar-outline', moon: 'moon-outline',
  heart: 'heart-outline', receipt: 'receipt-outline', meal: 'fast-food-outline', delivery: 'bicycle-outline',
  lock: 'lock-closed-outline', repeat: 'repeat-outline', trend: 'trending-up-outline', trophy: 'trophy-outline', sparkles: 'sparkles-outline',
};

const ACCENTS: Record<DashboardInsightCategory, { accent: string; surface: string }> = {
  favorites: { accent: Colors.primary, surface: Colors.successBg },
  habits: { accent: Colors.lagoonMid, surface: Colors.infoBg },
  extremes: { accent: Colors.berryMid, surface: Colors.errorSurfaceSoft },
  progress: { accent: Colors.amberMid, surface: Colors.warningSurface },
};

function formatValue(value: number, format: DashboardInsightValueFormat, formatCurrency: (amount: number) => string) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return `${Math.round(value)}%`;
  if (format === 'minutes') return `${Math.round(value)} min`;
  if (format === 'hours') return `${value.toLocaleString()} hr`;
  if (format === 'days') return `${Math.round(value)} days`;
  return Math.round(value).toLocaleString();
}

function formatLocalDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00.000Z`));
}

function formatPeriod(insight: DashboardInsight) {
  if (!insight.period) return null;
  const start = formatLocalDate(insight.period.startDate);
  if (!insight.period.endDate || insight.period.endDate === insight.period.startDate) return start;
  return `${start} – ${formatLocalDate(insight.period.endDate)}`;
}

function accessibilityCopy(insight: DashboardInsight, formatCurrency: (amount: number) => string) {
  const pieces = [insight.eyebrow, insight.title, formatPeriod(insight), insight.detail];
  if (insight.presentation === 'hero') pieces.push(insight.headline, formatValue(insight.value, insight.valueFormat, formatCurrency));
  if (insight.presentation === 'comparison') {
    if (insight.comparison.subject) pieces.push(insight.comparison.subject.name, insight.comparison.subject.restaurant);
    pieces.push(`${insight.comparison.previousLabel}: ${insight.comparison.previous}`, `${insight.comparison.currentLabel}: ${insight.comparison.current}`);
  }
  if (insight.presentation === 'ranking') pieces.push(...insight.rows.map(row => `${row.label}${row.context ? `, ${row.context}` : ''}, ${row.count} orders`));
  if (insight.presentation === 'order') pieces.push(...(insight.order.restaurants ?? [insight.order.restaurant]), formatCurrency(insight.order.amount), ...insight.order.items);
  if (insight.presentation === 'timeline') pieces.push(...insight.events.flatMap(event => [event.label, String(event.value), event.detail]));
  if (insight.presentation === 'yearly-champions') pieces.push(...insight.years.flatMap(year => [`${year.year}${year.currentYear ? ' so far' : ''}`, year.winners.join(' and '), `${year.orderCount} orders${year.winners.length > 1 ? ' each' : ''}`]));
  return pieces.filter(Boolean).join('. ');
}

function Methodology({ insight }: { insight: DashboardInsight }) {
  const methodology = insight.methodology;
  if (!methodology) return null;
  const text = [
    methodology.sampleSize ? `Based on ${methodology.sampleSize} tracked ${methodology.sampleSize === 1 ? 'order' : 'orders'}` : null,
    methodology.assumption,
    methodology.disclaimer,
  ].filter(Boolean).join(' · ');
  return text ? <Text style={styles.methodology} accessibilityLabel={`Methodology. ${text}`}>{text}</Text> : null;
}

function YearlyChampions({
  insight,
  onInteract,
}: {
  insight: Extract<DashboardInsight, { presentation: 'yearly-champions' }>;
  onInteract: () => void;
}) {
  const likelyOverflow = insight.years.length > CHAMPION_VISIBLE_ROWS;
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);
  const hasEarlierYears = likelyOverflow || (viewportHeight > 0 && contentHeight > viewportHeight + 1);
  const [showScrollCue, setShowScrollCue] = React.useState(likelyOverflow);
  const years = React.useMemo(() => [...insight.years].sort((a, b) => b.year - a.year), [insight.years]);

  React.useEffect(() => setShowScrollCue(hasEarlierYears), [hasEarlierYears, insight.id]);

  const updateScrollCue = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasEarlierYears) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const reachedEarlierYears = contentOffset.y + layoutMeasurement.height >= contentSize.height - 4;
    setShowScrollCue(!reachedEarlierYears);
  };

  return <View style={styles.championViewport}>
    <ScrollView
      testID="yearly-champions-scroll"
      style={styles.championScroll}
      contentContainerStyle={[styles.championList, hasEarlierYears && styles.championListOverflow]}
      nestedScrollEnabled
      directionalLockEnabled
      showsVerticalScrollIndicator={false}
      scrollEnabled={hasEarlierYears}
      onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      onTouchStart={onInteract}
      onScrollBeginDrag={onInteract}
      onScroll={updateScrollCue}
      scrollEventThrottle={16}
      accessibilityLabel={hasEarlierYears ? 'Yearly restaurant champions. Scroll for earlier years.' : 'Yearly restaurant champions.'}
    >
      {years.map(year => <View key={year.year} style={styles.championRow}>
        <View style={styles.championYearColumn}>
          <Text testID={`champion-year-${year.year}`} style={styles.championYear}>{year.year}</Text>
          {year.currentYear ? <Text style={[styles.championCurrent, { color: ACCENTS[insight.category].accent }]}>SO FAR</Text> : null}
        </View>
        <View style={[styles.championMarker, { backgroundColor: ACCENTS[insight.category].accent }]} />
        <View style={styles.championCopy}>
          <Text style={styles.championName}>{year.winners.join(' & ')}</Text>
          <Text style={styles.championOrders}>{year.orderCount} {year.orderCount === 1 ? 'order' : 'orders'}{year.winners.length > 1 ? ' each' : ''}</Text>
        </View>
      </View>)}
    </ScrollView>
    {showScrollCue ? <LinearGradient
      pointerEvents="none"
      colors={[Colors.alpha(Colors.surface, 0), Colors.surface]}
      style={styles.championScrollCue}
    >
      <Text style={styles.championScrollCueText}>Scroll for earlier years</Text>
      <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} accessibilityElementsHidden />
    </LinearGradient> : null}
  </View>;
}

function InsightBody({ insight, onOpenExport, onInteract }: { insight: DashboardInsight; onOpenExport: () => void; onInteract: () => void }) {
  const { formatCurrency } = useCurrency();
  if (insight.presentation === 'hero') return <>
    {insight.headline ? <Text style={styles.headline}>{insight.headline}</Text> : null}
    <Text style={styles.bigValue} adjustsFontSizeToFit numberOfLines={1}>{formatValue(insight.value, insight.valueFormat, formatCurrency)}</Text>
  </>;
  if (insight.presentation === 'comparison') {
    const comparison = insight.comparison;
    const value = (amount: number) => comparison.valueFormat === 'currency' ? formatCurrency(amount) : Math.round(amount).toLocaleString();
    const direction = comparison.direction === 'down' ? 'Lower' : comparison.direction === 'up' ? 'Higher' : 'About the same';
    if (comparison.variant === 'investment') return <View style={styles.investmentComparison}>
      <View style={styles.investmentValueColumn}>
        <Text style={styles.comparisonLabel}>{comparison.previousLabel}</Text>
        <Text style={styles.investmentSpent} adjustsFontSizeToFit numberOfLines={1}>{value(comparison.previous)}</Text>
      </View>
      <View style={[styles.investmentArrow, { backgroundColor: ACCENTS[insight.category].surface }]} accessibilityElementsHidden>
        <Ionicons name="arrow-forward" size={20} color={ACCENTS[insight.category].accent} />
      </View>
      <View style={styles.investmentValueColumn}>
        <Text style={styles.comparisonLabel}>{comparison.currentLabel}</Text>
        <Text style={styles.investmentValue} adjustsFontSizeToFit numberOfLines={1}>{value(comparison.current)}</Text>
      </View>
    </View>;
    if (comparison.subject) return <View style={styles.foodflation}>
      <View style={styles.foodflationSubject}>
        <Text style={styles.foodflationContext}>{comparison.subject.kind === 'meal' ? 'IDENTICAL ORDER' : 'SAME ITEM'}{comparison.subject.restaurant ? ` · ${comparison.subject.restaurant}` : ''}</Text>
        <Text style={styles.foodflationName}>{comparison.subject.name}</Text>
      </View>
      <View style={styles.foodflationPrices}>
        <View style={styles.foodflationPriceColumn}>
          <Text style={styles.comparisonLabel}>{comparison.previousLabel}</Text>
          <Text style={styles.comparisonPrevious}>{value(comparison.previous)}</Text>
        </View>
        <View style={[styles.foodflationArrow, { backgroundColor: ACCENTS[insight.category].surface }]} accessibilityElementsHidden>
          <Ionicons name="arrow-forward" size={20} color={ACCENTS[insight.category].accent} />
        </View>
        <View style={styles.foodflationPriceColumn}>
          <Text style={styles.comparisonLabel}>{comparison.currentLabel}</Text>
          <Text style={styles.foodflationRecentPrice}>{value(comparison.current)}</Text>
        </View>
      </View>
      <View style={[styles.foodflationDelta, { backgroundColor: ACCENTS[insight.category].surface }]}>
        <Ionicons name={comparison.direction === 'down' ? 'arrow-down' : 'arrow-up'} size={15} color={ACCENTS[insight.category].accent} accessibilityElementsHidden />
        <Text style={[styles.foodflationDeltaText, { color: ACCENTS[insight.category].accent }]}>{value(Math.abs(comparison.delta))} {comparison.direction === 'down' ? 'less' : 'more'}</Text>
      </View>
    </View>;
    return <View style={styles.comparison}>
      <Text style={styles.direction}>{direction}{comparison.percentDelta === null ? '' : ` · ${Math.abs(comparison.percentDelta)}%`}</Text>
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonColumn}><Text style={styles.comparisonLabel}>{comparison.currentLabel}</Text><Text style={styles.comparisonValue}>{value(comparison.current)}</Text></View>
        <Ionicons name={comparison.direction === 'down' ? 'arrow-down' : comparison.direction === 'up' ? 'arrow-up' : 'remove'} size={24} color={ACCENTS[insight.category].accent} accessibilityElementsHidden />
        <View style={styles.comparisonColumn}><Text style={styles.comparisonLabel}>{comparison.previousLabel}</Text><Text style={styles.comparisonPrevious}>{value(comparison.previous)}</Text></View>
      </View>
    </View>;
  }
  if (insight.presentation === 'ranking') return <View style={styles.list}>{insight.rows.map((row, index) => <View key={`${row.label}-${index}`} style={styles.rankingRow}>
    <View style={[styles.rank, { backgroundColor: ACCENTS[insight.category].accent }]}><Text style={styles.rankText}>{index + 1}</Text></View>
    <View style={styles.listCopy}><Text style={styles.listTitle}>{row.label}</Text><Text style={styles.listDetail}>{row.context ? `${row.context} · ` : ''}{row.count} {row.count === 1 ? 'order' : 'orders'}{row.amount === undefined ? '' : ` · ${formatCurrency(row.amount)}`}</Text></View>
  </View>)}</View>;
  if (insight.presentation === 'order') {
    const restaurants = insight.order.restaurants ?? [insight.order.restaurant];
    return <View style={styles.orderBlock}>
    {restaurants.length > 1 ? <View style={styles.restaurantLineup}>
      <Text style={styles.restaurantLineupLabel}>THE LINEUP</Text>
      {restaurants.map((restaurant, index) => <View key={`${restaurant}-${index}`} style={styles.restaurantRow}>
        <View style={[styles.restaurantNumber, { backgroundColor: ACCENTS[insight.category].accent }]}>
          <Text testID={`restaurant-number-${index + 1}`} style={styles.restaurantNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.restaurantName}>{restaurant}</Text>
      </View>)}
    </View> : <Text style={styles.orderRestaurant}>{restaurants[0]}</Text>}
    <Text style={styles.bigValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(insight.order.amount)}</Text>
    {insight.order.items.map((item, index) => <Text key={`${item}-${index}`} style={styles.item}>• {item}</Text>)}
  </View>;
  }
  if (insight.presentation === 'timeline') return <View style={styles.timeline}>{insight.events.map((event, index) => {
    const eventValue = typeof event.value === 'number' && event.valueFormat ? formatValue(event.value, event.valueFormat, formatCurrency) : String(event.value);
    return <View key={`${event.label}-${index}`} style={styles.timelineRow}><View style={[styles.timelineDot, { backgroundColor: ACCENTS[insight.category].accent }]} /><View style={styles.listCopy}><Text style={styles.comparisonLabel}>{event.label}</Text><Text style={styles.timelineValue}>{eventValue}</Text>{event.detail ? <Text style={styles.listDetail}>{event.detail}</Text> : null}</View></View>;
  })}</View>;
  if (insight.presentation === 'yearly-champions') return <YearlyChampions insight={insight} onInteract={onInteract} />;
  return <TouchableOpacity style={styles.unlockButton} onPress={onOpenExport} accessibilityRole="button" accessibilityLabel="Unlock this insight with a delivery data export">
    <Text style={styles.unlockButtonText}>Unlock with your export</Text><Ionicons name="arrow-forward" size={20} color={Colors.white} />
  </TouchableOpacity>;
}

function InsightCard({ insight, index, total, paused, onTogglePaused, onInteract, onOpenExport }: {
  insight: DashboardInsight; index: number; total: number; paused: boolean; onTogglePaused: () => void; onInteract: () => void; onOpenExport: () => void;
}) {
  const { formatCurrency } = useCurrency();
  const tone = ACCENTS[insight.category];
  const period = formatPeriod(insight);
  return <Card style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconBadge, { backgroundColor: tone.surface }]}><Ionicons name={ICONS[insight.icon]} size={22} color={tone.accent} /></View>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>{insight.eyebrow.toLocaleUpperCase()}</Text>
      {total > 1 ? <TouchableOpacity style={styles.pauseButton} onPress={onTogglePaused} accessibilityRole="button" accessibilityLabel={paused ? 'Resume automatic insight rotation' : 'Pause automatic insight rotation'} accessibilityState={{ selected: paused }} hitSlop={8}>
        <Ionicons name={paused ? 'play' : 'pause'} size={17} color={Colors.textSecondary} />
      </TouchableOpacity> : null}
    </View>
    <View accessible accessibilityLabel={`Insight ${index + 1} of ${total}. ${accessibilityCopy(insight, formatCurrency)}`}>
      <Text style={styles.cardTitle}>{insight.title}</Text>
      {period ? <View style={[styles.periodBadge, { backgroundColor: tone.surface }]}>
        <Ionicons name="calendar-outline" size={14} color={tone.accent} accessibilityElementsHidden />
        <Text style={[styles.periodText, { color: tone.accent }]}>{period}</Text>
      </View> : null}
      {insight.presentation !== 'locked' ? <InsightBody insight={insight} onOpenExport={onOpenExport} onInteract={onInteract} /> : null}
      {insight.detail ? <Text style={styles.detail}>{insight.detail}</Text> : null}
      <Methodology insight={insight} />
    </View>
    {insight.presentation === 'locked' ? <InsightBody insight={insight} onOpenExport={onOpenExport} onInteract={onInteract} /> : null}
  </Card>;
}

function OutroCard({ paused, onTogglePaused }: { paused: boolean; onTogglePaused: () => void }) {
  return <Card style={[styles.card, styles.outroCard]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconBadge, styles.outroIconBadge]}><Ionicons name="calendar-outline" size={22} color={Colors.primary} /></View>
      <Text style={[styles.eyebrow, styles.outroEyebrow]}>TODAY&apos;S EDITION</Text>
      <TouchableOpacity style={styles.pauseButton} onPress={onTogglePaused} accessibilityRole="button" accessibilityLabel={paused ? 'Resume automatic insight rotation' : 'Pause automatic insight rotation'} accessibilityState={{ selected: paused }} hitSlop={8}>
        <Ionicons name={paused ? 'play' : 'pause'} size={17} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
    <View style={styles.outroBody} accessible accessibilityLabel="That’s all for today. Come back tomorrow for new stats. We’ll keep snooping.">
      <View style={styles.outroSparkles} accessibilityElementsHidden>
        <Ionicons name="sparkles-outline" size={42} color={Colors.primary} />
      </View>
      <Text style={styles.outroTitle}>That’s all for today</Text>
      <Text style={styles.outroDetail}>Come back tomorrow for new stats.</Text>
      <Text style={styles.outroSignoff}>We’ll keep snooping.</Text>
    </View>
  </Card>;
}

export function WhatWeNoticedCarousel({ insights, onOpenExport }: Props) {
  const listRef = React.useRef<FlatList<CarouselSlide>>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [stageWidth, setStageWidth] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [appActive, setAppActive] = React.useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const cardWidth = stageWidth || Math.max(280, windowWidth - 40);
  const slides = React.useMemo<CarouselSlide[]>(() => [
    ...insights.map(insight => ({ id: insight.id, kind: 'insight' as const, insight })),
    { id: 'daily-outro', kind: 'outro' },
  ], [insights]);
  const outroActive = activeIndex === slides.length - 1;

  React.useEffect(() => {
    const appSubscription = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { appSubscription.remove(); motionSubscription.remove(); };
  }, []);

  React.useEffect(() => { setActiveIndex(0); setPaused(false); listRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [insights]);

  React.useEffect(() => {
    if (slides.length < 2 || paused || reduceMotion || !appActive) return;
    const timer = setTimeout(() => {
      const next = (activeIndex + 1) % slides.length;
      setActiveIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, appActive, paused, reduceMotion, slides.length]);

  const settleIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!cardWidth) return;
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / cardWidth))));
  };
  const moveForAccessibility = (actionName: string) => {
    const direction = actionName === 'increment' ? 1 : -1;
    const next = Math.max(0, Math.min(slides.length - 1, activeIndex + direction));
    setPaused(true);
    setActiveIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
  };
  if (!insights.length) return null;
  return <View style={styles.stage} onLayout={event => setStageWidth(Math.round(event.nativeEvent.layout.width))} testID="what-we-noticed-carousel">
    <FlatList
      ref={listRef}
      testID="what-we-noticed-list"
      horizontal
      pagingEnabled
      data={slides}
      keyExtractor={slide => slide.id}
      renderItem={({ item, index }) => <View testID={`insight-card-frame-${index}`} style={[styles.cardFrame, { width: cardWidth }]}>
        {item.kind === 'insight'
          ? <InsightCard insight={item.insight} index={index} total={insights.length} paused={paused} onTogglePaused={() => setPaused(value => !value)} onInteract={() => setPaused(true)} onOpenExport={() => { setPaused(true); onOpenExport(); }} />
          : <OutroCard paused={paused} onTogglePaused={() => setPaused(value => !value)} />}
      </View>}
      getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
      onScrollBeginDrag={() => setPaused(true)}
      onMomentumScrollEnd={settleIndex}
      showsHorizontalScrollIndicator={false}
    />
    <View
      style={styles.pagination}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={outroActive ? 'Daily insights. That’s all for today.' : `Daily insights. Insight ${activeIndex + 1} of ${insights.length}`}
      accessibilityActions={[{ name: 'increment', label: 'Next insight' }, { name: 'decrement', label: 'Previous insight' }]}
      onAccessibilityAction={event => moveForAccessibility(event.nativeEvent.actionName)}
    >
      <Text style={styles.position} accessibilityLiveRegion="polite">{outroActive ? 'That’s today’s edition' : `${activeIndex + 1} of ${insights.length}`}</Text>
      <View style={styles.dots} accessibilityElementsHidden>{slides.map((slide, index) => <View key={slide.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />)}</View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  stage: { marginHorizontal: -2 },
  cardFrame: { paddingBottom: Spacing.xl },
  card: { marginHorizontal: 2, padding: Spacing.lg, minHeight: 330 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  iconBadge: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.1 },
  pauseButton: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray50 },
  cardTitle: { color: Colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: '800' },
  periodBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, marginTop: Spacing.sm },
  periodText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  headline: { color: Colors.textPrimary, fontSize: 27, lineHeight: 34, fontWeight: '800', marginTop: Spacing.md },
  bigValue: { color: Colors.textPrimary, fontSize: 38, lineHeight: 46, fontWeight: '800', marginTop: Spacing.sm },
  detail: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: Spacing.md },
  methodology: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: Spacing.md, fontStyle: 'italic' },
  list: { marginTop: Spacing.md },
  rankingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  rank: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  rankText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  listCopy: { flex: 1 },
  listTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  listDetail: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  orderBlock: { marginTop: Spacing.md },
  orderRestaurant: { color: Colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  restaurantLineup: { gap: Spacing.sm },
  restaurantLineupLabel: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 1 },
  restaurantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  restaurantNumber: { width: 22, height: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  restaurantNumberText: { color: Colors.white, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  restaurantName: { flex: 1, color: Colors.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  item: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  comparison: { marginTop: Spacing.md },
  direction: { color: Colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '800' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  comparisonColumn: { flex: 1 },
  comparisonLabel: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  comparisonValue: { color: Colors.textPrimary, fontSize: 19, lineHeight: 25, fontWeight: '800', marginTop: 3 },
  comparisonPrevious: { color: Colors.textSecondary, fontSize: 17, lineHeight: 23, fontWeight: '700', marginTop: 3 },
  investmentComparison: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  investmentValueColumn: { flex: 1 },
  investmentSpent: { color: Colors.textSecondary, fontSize: 22, lineHeight: 29, fontWeight: '800', marginTop: 3 },
  investmentValue: { color: Colors.textPrimary, fontSize: 25, lineHeight: 32, fontWeight: '800', marginTop: 3 },
  investmentArrow: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  foodflation: { marginTop: Spacing.md },
  foodflationSubject: { paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  foodflationContext: { color: Colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.8 },
  foodflationName: { color: Colors.textPrimary, fontSize: 17, lineHeight: 23, fontWeight: '800', marginTop: 3 },
  foodflationPrices: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  foodflationPriceColumn: { flex: 1 },
  foodflationArrow: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  foodflationRecentPrice: { color: Colors.textPrimary, fontSize: 21, lineHeight: 27, fontWeight: '800', marginTop: 3 },
  foodflationDelta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, marginTop: Spacing.md },
  foodflationDeltaText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  timeline: { marginTop: Spacing.md, gap: Spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  timelineDot: { width: 12, height: 12, borderRadius: Radius.pill, marginTop: 5 },
  timelineValue: { color: Colors.textPrimary, fontSize: 17, lineHeight: 23, fontWeight: '800', marginTop: 2 },
  championViewport: { position: 'relative', marginTop: Spacing.md },
  championScroll: { maxHeight: CHAMPION_VIEWPORT_HEIGHT },
  championList: { gap: Spacing.sm },
  championListOverflow: { paddingBottom: Spacing.xl },
  championRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  championYearColumn: { width: 48 },
  championYear: { color: Colors.textSecondary, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  championCurrent: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.6 },
  championMarker: { width: 8, height: 8, borderRadius: Radius.pill, marginRight: Spacing.sm },
  championCopy: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, paddingBottom: Spacing.xs },
  championName: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  championOrders: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 1 },
  championScrollCue: { position: 'absolute', right: 0, bottom: 0, left: 0, height: 42, paddingTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  championScrollCueText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  unlockButton: { marginTop: Spacing.xl, minHeight: 48, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  unlockButtonText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -Spacing.md, paddingHorizontal: Spacing.xs },
  position: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: Colors.gray300 },
  dotActive: { width: 18, backgroundColor: Colors.primary },
  outroCard: { backgroundColor: Colors.successBg },
  outroIconBadge: { backgroundColor: Colors.white },
  outroEyebrow: { color: Colors.primary },
  outroBody: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
  outroSparkles: { width: 76, height: 76, borderRadius: Radius.pill, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  outroTitle: { color: Colors.textPrimary, fontSize: 27, lineHeight: 34, fontWeight: '800', textAlign: 'center' },
  outroDetail: { color: Colors.textSecondary, fontSize: 17, lineHeight: 24, marginTop: Spacing.md, textAlign: 'center' },
  outroSignoff: { color: Colors.primary, fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: Spacing.lg, textAlign: 'center' },
});
