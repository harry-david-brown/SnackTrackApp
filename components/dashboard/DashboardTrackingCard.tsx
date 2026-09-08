import { FontFamily, type AppTheme } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import type { ImportPreferencesResponse } from '@features/import-flow/contracts';
import type { DashboardTrackingAction, DashboardTrackingCardState } from './dashboardTrackingState';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { useAppTheme } from '@contexts/AppearanceContext';

const tonesForTheme = (theme: AppTheme) => ({
  brand: { accent: theme.colors.primary, actionAccent: theme.colors.primary, surface: theme.colors.infoBg },
  progress: { accent: theme.colors.infoStrong, actionAccent: theme.colors.infoStrong, surface: theme.colors.infoSurface },
  success: { accent: theme.colors.successDark, actionAccent: theme.colors.successDark, surface: theme.colors.successSurface },
  warning: { accent: theme.colors.warningDeep, actionAccent: theme.colors.primary, surface: theme.colors.warningSurface },
  error: { accent: theme.colors.errorDark, actionAccent: theme.colors.errorDark, surface: theme.colors.errorSurface },
});

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
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const tone = tonesForTheme(theme)[state.tone];
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
    const compactContent = (
      <Card
        accessibilityLabel={state.primaryAction ? undefined : `${state.eyebrow}. ${state.title}. ${state.body}`}
        accessibilityState={state.primaryAction ? undefined : { busy: state.busy }}
        style={[styles.compactCard, { backgroundColor: tone.surface }]}
      >
        <View style={[styles.compactIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={state.icon as any} size={21} color={tone.accent} />
          {state.id === 'tracking_active' ? (
            <Animated.View style={[styles.compactPulse, { backgroundColor: tone.accent, transform: [{ scale: pulse }] }]} />
          ) : null}
        </View>
        <View style={styles.compactCopy}>
          <AppText variant="rowTitle" style={styles.compactTitle}>{state.title}</AppText>
          <AppText variant="metadata" style={styles.compactBody} numberOfLines={2}>{state.body}</AppText>
          {state.showActivity && ordersAddedThisWeek > 0 ? (
            <AppText variant="metadata" style={[styles.compactActivity, { color: tone.accent }]}>+{ordersAddedThisWeek} this week</AppText>
          ) : null}
        </View>
        {state.primaryAction ? (
          <View style={styles.compactAction}>
            <Ionicons name="arrow-forward" size={21} color={tone.accent} />
          </View>
        ) : state.busy ? (
          <Animated.View accessibilityRole="progressbar">
            <Ionicons name="sync" size={22} color={tone.accent} />
          </Animated.View>
        ) : (
          <Ionicons name="checkmark-circle" size={22} color={tone.accent} />
        )}
      </Card>
    );

    if (!state.primaryAction) return compactContent;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.primaryLabel ?? state.title}
        accessibilityHint={state.body}
        accessibilityState={{ busy: state.busy || busy, disabled: busy }}
        disabled={busy}
        onPress={() => onAction(state.primaryAction!)}
        style={({ pressed }) => pressed && styles.compactPressed}
      >
        {compactContent}
      </Pressable>
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
          <AppText variant="eyebrow" style={[styles.eyebrow, { color: tone.accent }]}>{state.eyebrow}</AppText>
          <AppText variant="surfaceTitle" style={styles.title}>{state.title}</AppText>
        </View>
      </View>
      <AppText variant="body" style={styles.body}>{state.body}</AppText>

      {state.showActivity && ordersAddedThisWeek > 0 ? (
        <View style={styles.activityNote}>
          <Ionicons name="receipt-outline" size={17} color={tone.accent} />
          <AppText variant="metadata" style={[styles.activityNoteText, { color: tone.accent }]}>
            {ordersAddedThisWeek} {ordersAddedThisWeek === 1 ? 'order' : 'orders'} placed this week
          </AppText>
        </View>
      ) : null}

      {state.progress ? (
        <View
          style={styles.progressRow}
          accessibilityLabel={`${state.progress.title}. ${state.progress.body}`}
        >
          <Ionicons name={state.progress.icon as any} size={20} color={theme.colors.infoStrong} />
          <View style={styles.progressCopy}>
            <AppText variant="rowTitle" style={styles.progressTitle}>{state.progress.title}</AppText>
            <AppText variant="metadata" style={styles.progressBody}>{state.progress.body}</AppText>
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  compactCard: { minHeight: 84, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  compactPulse: { position: 'absolute', right: 7, top: 7, width: 6, height: 6, borderRadius: 3, opacity: 0.35 },
  compactCopy: { flex: 1 },
  compactTitle: { fontFamily: FontFamily.medium },
  compactBody: { marginTop: 2 },
  compactActivity: { marginTop: 4, fontFamily: FontFamily.medium },
  compactAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  compactPressed: { opacity: 0.78 },
  card: {
    padding: 20,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconSurface: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', right: 8, top: 8, width: 7, height: 7, borderRadius: 4, opacity: 0.35 },
  copy: { flex: 1 },
  eyebrow: { marginBottom: 4 },
  title: {},
  body: { marginTop: 14 },
  activityNote: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  activityNoteText: { fontFamily: FontFamily.medium },
  progressRow: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressCopy: { flex: 1 },
  progressTitle: { fontFamily: FontFamily.medium },
  progressBody: { marginTop: 2 },
});
