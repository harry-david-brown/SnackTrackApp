import { Colors } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet, Text, View } from 'react-native';
import type { ImportPreferencesResponse } from '@services/gmailApi';
import type { DashboardTrackingAction, DashboardTrackingCardState } from './dashboardTrackingState';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';

const TONES = {
  brand: { accent: Colors.primary, surface: Colors.infoBg },
  progress: { accent: Colors.infoStrong, surface: Colors.infoSurface },
  success: { accent: Colors.successDark, surface: Colors.successSurface },
  warning: { accent: Colors.warningDeep, surface: Colors.warningSurface },
  error: { accent: Colors.errorDark, surface: Colors.errorSurface },
};

export function DashboardTrackingCard({
  state,
  preferences,
  busy,
  onAction,
}: {
  state: DashboardTrackingCardState;
  preferences: ImportPreferencesResponse | null;
  busy: boolean;
  onAction: (action: DashboardTrackingAction) => void;
}) {
  const tone = TONES[state.tone];
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (state.id !== 'tracking_active' || reduceMotion || !appActive) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.65, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [appActive, pulse, reduceMotion, state.id]);

  const activity = preferences?.ongoingTracking.activity;
  const ordersAddedThisWeek = activity?.ordersAddedThisWeek ?? 0;

  return (
    <Card accessibilityLabel={`${state.eyebrow}. ${state.title}. ${state.body}`} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconSurface, { backgroundColor: tone.surface }]}>
          <Ionicons name={state.icon as any} size={26} color={tone.accent} />
          {state.id === 'tracking_active' ? (
            <Animated.View style={[styles.pulse, { backgroundColor: tone.accent, transform: [{ scale: pulse }] }]} />
          ) : null}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: tone.accent }]}>{state.eyebrow}</Text>
          <Text style={styles.title}>{state.title}</Text>
        </View>
      </View>
      <Text style={styles.body}>{state.body}</Text>

      {state.showActivity && ordersAddedThisWeek > 0 ? (
        <View style={styles.activityNote}>
          <Ionicons name="receipt-outline" size={17} color={tone.accent} />
          <Text style={[styles.activityNoteText, { color: tone.accent }]}>
            {ordersAddedThisWeek} new {ordersAddedThisWeek === 1 ? 'order' : 'orders'} added this week
          </Text>
        </View>
      ) : null}

      {state.primaryAction && state.primaryLabel ? (
        <AppButton label={state.primaryLabel} accentColor={tone.accent} pending={busy} onPress={() => onAction(state.primaryAction!)} />
      ) : null}
      {state.secondaryAction && state.secondaryLabel ? (
        <AppButton label={state.secondaryLabel} variant="secondary" pending={busy} onPress={() => onAction(state.secondaryAction!)} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconSurface: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', right: 8, top: 8, width: 7, height: 7, borderRadius: 4, opacity: 0.35 },
  copy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  title: { color: Colors.textPrimary, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  body: { marginTop: 14, color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  activityNote: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  activityNoteText: { fontSize: 13, fontWeight: '700' },
});
