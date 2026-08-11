import { Colors, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ImportPreferencesResponse } from '../../services/gmailApi';
import type { DashboardTrackingAction, DashboardTrackingCardState } from './dashboardTrackingState';

const TONES = {
  brand: { accent: Colors.primary, surface: Colors.infoBg, border: Colors.infoBorder },
  progress: { accent: Colors.infoStrong, surface: Colors.infoSurface, border: Colors.infoBorder },
  success: { accent: Colors.successDark, surface: Colors.successSurface, border: Colors.successBorder },
  warning: { accent: Colors.warningDeep, surface: Colors.warningSurface, border: Colors.warning },
  error: { accent: Colors.errorDark, surface: Colors.errorSurface, border: Colors.errorBorder },
};

const relativeTime = (value: string | null) => {
  if (!value) return null;
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'just now';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (state.id !== 'tracking_active' || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.65, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, state.id]);

  const activity = preferences?.ongoingTracking.activity;
  const checked = relativeTime(activity?.lastSuccessfulCheckAt ?? null);
  const updated = relativeTime(activity?.lastStatsUpdatedAt ?? null);

  return (
    <View accessibilityLabel={`${state.eyebrow}. ${state.title}. ${state.body}`} style={[styles.card, { borderColor: tone.border }]}>
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

      {state.showActivity && activity ? (
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{checked ?? 'Not yet'}</Text>
            <Text style={styles.activityLabel}>Last checked</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{updated ?? 'No changes yet'}</Text>
            <Text style={styles.activityLabel}>Last updated</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{activity.ordersAddedThisWeek}</Text>
            <Text style={styles.activityLabel}>Added this week</Text>
          </View>
        </View>
      ) : null}

      {state.primaryAction && state.primaryLabel ? (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          style={[styles.button, { backgroundColor: tone.accent }, busy && styles.buttonBusy]}
          onPress={() => onAction(state.primaryAction!)}
        >
          <Text style={styles.buttonText}>{busy ? 'Please wait…' : state.primaryLabel}</Text>
          {!busy ? <Ionicons name="arrow-forward" size={18} color={Colors.white} /> : null}
        </TouchableOpacity>
      ) : null}
      {state.secondaryAction && state.secondaryLabel ? (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          style={styles.secondaryButton}
          onPress={() => onAction(state.secondaryAction!)}
        >
          <Text style={[styles.secondaryButtonText, { color: tone.accent }]}>{state.secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderWidth: 1, borderRadius: Radius.card, backgroundColor: Colors.white, ...Shadows.card },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconSurface: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', right: 8, top: 8, width: 7, height: 7, borderRadius: 4, opacity: 0.35 },
  copy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  title: { color: Colors.textPrimary, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  body: { marginTop: 14, color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  button: { marginTop: 18, minHeight: 52, paddingHorizontal: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonBusy: { opacity: 0.65 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
  activityRow: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: Colors.background, flexDirection: 'row', alignItems: 'stretch' },
  activityItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activityValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  activityLabel: { marginTop: 4, color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  activityDivider: { width: 1, marginHorizontal: 7, backgroundColor: Colors.divider },
});
