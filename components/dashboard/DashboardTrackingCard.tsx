import { Colors } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImportPreferencesResponse } from '@features/import-flow/contracts';
import type { DashboardTrackingAction, DashboardTrackingCardState } from './dashboardTrackingState';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';

const TONES = {
  brand: { accent: Colors.primary, actionAccent: Colors.primary, surface: Colors.infoBg },
  progress: { accent: Colors.infoStrong, actionAccent: Colors.infoStrong, surface: Colors.infoSurface },
  success: { accent: Colors.successDark, actionAccent: Colors.successDark, surface: Colors.successSurface },
  warning: { accent: Colors.warningDeep, actionAccent: Colors.primary, surface: Colors.warningSurface },
  error: { accent: Colors.errorDark, actionAccent: Colors.errorDark, surface: Colors.errorSurface },
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
  const isCompactStatus = (state.display === 'compact' && !state.secondaryAction)
    || (state.passive && !state.secondaryAction && !state.progress);

  if (isCompactStatus) {
    return (
      <Card accessibilityLabel={`${state.eyebrow}. ${state.title}. ${state.body}`} accessibilityState={{ busy: state.busy }} style={[styles.compactCard, { backgroundColor: tone.surface }]}>
        <View style={[styles.compactIcon, { backgroundColor: Colors.surface }]}>
          <Ionicons name={state.icon as any} size={21} color={tone.accent} />
          {state.id === 'tracking_active' ? (
            <Animated.View style={[styles.compactPulse, { backgroundColor: tone.accent, transform: [{ scale: pulse }] }]} />
          ) : null}
        </View>
        <View style={styles.compactCopy}>
          <Text style={styles.compactTitle}>{state.title}</Text>
          <Text style={styles.compactBody} numberOfLines={2}>{state.body}</Text>
          {state.showActivity && ordersAddedThisWeek > 0 ? (
            <Text style={[styles.compactActivity, { color: tone.accent }]}>+{ordersAddedThisWeek} this week</Text>
          ) : null}
        </View>
        {state.primaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.primaryLabel ?? state.title}
            disabled={busy}
            onPress={() => onAction(state.primaryAction!)}
            style={styles.compactAction}
          >
            <Ionicons name="arrow-forward" size={21} color={tone.accent} />
          </Pressable>
        ) : state.busy ? (
          <Animated.View accessibilityRole="progressbar">
            <Ionicons name="sync" size={22} color={tone.accent} />
          </Animated.View>
        ) : (
          <Ionicons name="checkmark-circle" size={22} color={tone.accent} />
        )}
      </Card>
    );
  }

  return (
    <Card accessibilityLabel={`${state.eyebrow}. ${state.title}. ${state.body}`} accessibilityState={{ busy: state.busy }} style={styles.card}>
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
            {ordersAddedThisWeek} {ordersAddedThisWeek === 1 ? 'order' : 'orders'} placed this week
          </Text>
        </View>
      ) : null}

      {state.progress ? (
        <View
          style={styles.progressRow}
          accessibilityLabel={`${state.progress.title}. ${state.progress.body}`}
        >
          <Ionicons name={state.progress.icon as any} size={20} color={Colors.infoStrong} />
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>{state.progress.title}</Text>
            <Text style={styles.progressBody}>{state.progress.body}</Text>
          </View>
          {state.progress.action && state.progress.actionLabel ? (
            <AppButton
              label={state.progress.actionLabel}
              variant="secondary"
              pending={busy}
              onPress={() => onAction(state.progress!.action!)}
            />
          ) : null}
        </View>
      ) : null}

      {state.primaryAction && state.primaryLabel ? (
        <AppButton label={state.primaryLabel} accentColor={tone.actionAccent} pending={busy} onPress={() => onAction(state.primaryAction!)} />
      ) : null}
      {state.secondaryAction && state.secondaryLabel ? (
        <AppButton label={state.secondaryLabel} variant="secondary" pending={busy} onPress={() => onAction(state.secondaryAction!)} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  compactCard: { minHeight: 84, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  compactPulse: { position: 'absolute', right: 7, top: 7, width: 6, height: 6, borderRadius: 3, opacity: 0.35 },
  compactCopy: { flex: 1 },
  compactTitle: { color: Colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  compactBody: { marginTop: 2, color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  compactActivity: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  compactAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
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
  progressRow: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressCopy: { flex: 1 },
  progressTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  progressBody: { marginTop: 2, color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
