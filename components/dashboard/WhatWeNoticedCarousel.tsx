import { Colors } from '@constants/theme';
import { DashboardInsight, DashboardInsightCategory, DashboardInsightIcon } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '@contexts/CurrencyContext';

interface Props {
  insights: DashboardInsight[];
  onOpenExport: () => void;
}

const AUTO_ADVANCE_MS = 4500;

const ICONS: Record<DashboardInsightIcon, React.ComponentProps<typeof Ionicons>['name']> = {
  restaurant: 'restaurant-outline',
  time: 'time-outline',
  calendar: 'calendar-outline',
  moon: 'moon-outline',
  heart: 'heart-outline',
  receipt: 'receipt-outline',
  meal: 'fast-food-outline',
  delivery: 'bicycle-outline',
  lock: 'lock-closed-outline',
};

const ACCENTS: Record<DashboardInsightCategory, { accent: string; surface: string }> = {
  favorites: { accent: Colors.primary, surface: Colors.successBg },
  habits: { accent: Colors.lagoonMid, surface: Colors.infoBg },
  extremes: { accent: Colors.berryMid, surface: Colors.errorSurfaceSoft },
  progress: { accent: Colors.amberMid, surface: Colors.warningSurface },
};

function InsightContent({
  insight,
  onOpenExport,
  opacity,
  isPaused,
  onTogglePaused,
}: {
  insight: DashboardInsight;
  onOpenExport: () => void;
  opacity: Animated.Value;
  isPaused: boolean;
  onTogglePaused: () => void;
}) {
  const { formatCurrency } = useCurrency();
  const tone = ACCENTS[insight.category];
  const formattedValue = useMemo(() => {
    if (insight.value == null) return null;
    if (insight.valueFormat === 'currency') return formatCurrency(insight.value);
    if (insight.valueFormat === 'percent') return `${Math.round(insight.value)}%`;
    if (insight.valueFormat === 'minutes') return `${Math.round(insight.value)} min`;
    return Math.round(insight.value).toLocaleString();
  }, [formatCurrency, insight.value, insight.valueFormat]);

  return (
    <Animated.View
      style={[styles.cardContent, { opacity }]}
      accessible
      accessibilityLabel={`${insight.eyebrow}. ${insight.title}. ${insight.headline ?? formattedValue ?? ''}. ${insight.detail ?? ''}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: tone.surface }]}>
          <Ionicons name={ICONS[insight.icon]} size={22} color={tone.accent} />
        </View>
        <Text style={[styles.eyebrow, { color: tone.accent }]}>{insight.eyebrow.toUpperCase()}</Text>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={onTogglePaused}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume rotating stats' : 'Pause on this stat'}
          accessibilityState={{ selected: isPaused }}
          hitSlop={8}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={17}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardTitle}>{insight.title}</Text>
      {formattedValue ? <Text style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit>{formattedValue}</Text> : null}
      {insight.headline ? <Text style={[styles.headline, formattedValue && styles.headlineAfterValue]} numberOfLines={2}>{insight.headline}</Text> : null}
      {insight.detail ? <Text style={styles.detail}>{insight.detail}</Text> : null}

      {insight.rows?.length ? (
        <View style={styles.rankingList}>
          {insight.rows.map((row, index) => (
            <View key={`${row.label}-${index}`} style={[styles.rankingRow, index < insight.rows!.length - 1 && styles.rankingDivider]}>
              <View style={[styles.rank, { backgroundColor: tone.accent }]}><Text style={styles.rankText}>{index + 1}</Text></View>
              <View style={styles.rankingCopy}>
                <Text style={styles.rankingName} numberOfLines={1}>{row.label}</Text>
                <Text style={styles.rankingDetail}>{row.count} {row.count === 1 ? 'order' : 'orders'} · {formatCurrency(row.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {insight.items?.length ? (
        <View style={styles.itemList}>
          {insight.items.map((item, index) => <Text key={`${item}-${index}`} style={styles.itemText} numberOfLines={1}>• {item}</Text>)}
        </View>
      ) : null}

      {insight.locked ? (
        <TouchableOpacity style={styles.unlockButton} onPress={onOpenExport} accessibilityRole="button" accessibilityLabel="Unlock this stat with an Uber data export">
          <Text style={styles.unlockButtonText}>Unlock this stat</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

export function WhatWeNoticedCarousel({ insights, onOpenExport }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setIsAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setIsPaused(false);
    opacity.setValue(1);
  }, [insights, opacity]);

  useEffect(() => () => opacity.stopAnimation(), [opacity]);

  useEffect(() => {
    if (insights.length < 2 || !isAppActive || isPaused) return;

    const timer = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % insights.length;
      if (reduceMotion) {
        setActiveIndex(nextIndex);
        return;
      }

      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setActiveIndex(nextIndex);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [activeIndex, insights.length, isAppActive, isPaused, opacity, reduceMotion]);

  const insight = insights[activeIndex] ?? insights[0];
  if (!insight) return null;

  return (
    <View style={styles.cardStage} testID="what-we-noticed-card">
      <View style={styles.card}>
        <InsightContent
          insight={insight}
          onOpenExport={onOpenExport}
          opacity={opacity}
          isPaused={isPaused}
          onTogglePaused={() => setIsPaused(paused => !paused)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardStage: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  card: {
    width: '100%',
    minHeight: 310,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.1 },
  pauseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  bigValue: { color: Colors.textPrimary, fontSize: 38, lineHeight: 46, fontWeight: '800', marginTop: 10 },
  headline: { color: Colors.textPrimary, fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 12 },
  headlineAfterValue: { fontSize: 18, lineHeight: 24, marginTop: 2 },
  detail: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10 },
  rankingList: { marginTop: 12 },
  rankingRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rankingDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  rankText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  rankingCopy: { flex: 1 },
  rankingName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  rankingDetail: { color: Colors.textSecondary, fontSize: 13, marginTop: 3 },
  itemList: { marginTop: 10, gap: 4 },
  itemText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  unlockButton: { marginTop: 'auto', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  unlockButtonText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
});
