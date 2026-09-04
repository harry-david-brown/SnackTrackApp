import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { FontFamily, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useUser } from '@contexts/UserContext';
import { IMPORT_PROGRESS_MIN_STEP_MS, resolveImportProgressPosition, resolveImportProgressPresentation, resolveImportProgressSteps, type ImportProgressStepState } from '@features/import-flow/importProgressPresentation';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';
import { suppressAdsForSession } from '@features/ads/adSession';
import { useImportOperation } from '@hooks/useImportOperation';
import { invalidateReceiptDerivedData } from '@lib/queryInvalidation';
import { experienceApi } from '@services/experienceApi';
import { analyticsApi } from '@services/analyticsApi';
import { trackAdminEvent } from '@services/adminAnalytics';
import { requestImportNotifications } from './ImportNotificationController';

interface ImportProgressScreenProps { operationId?: string }
type CompletionState = 'zero' | 'small' | null;

export function ImportProgressScreen({ operationId }: ImportProgressScreenProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state } = useUser();
  const queryClient = useQueryClient();
  const { operation, isLoading, refresh } = useImportOperation(Boolean(state.user?.id), false, operationId);
  const handled = useRef<string | null>(null);
  const announced = useRef<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [visibleProgressPosition, setVisibleProgressPosition] = useState(0);
  const view = useMemo(() => operation ? resolveImportProgressPresentation(operation) : null, [operation]);
  const targetProgressPosition = useMemo(() => operation ? resolveImportProgressPosition(operation) : 0, [operation]);
  const visibleSteps = useMemo(() => resolveImportProgressSteps(visibleProgressPosition), [visibleProgressPosition]);

  useEffect(() => {
    setVisibleProgressPosition(0);
  }, [operation?.id]);

  useEffect(() => {
    if (!operation || visibleProgressPosition >= targetProgressPosition) return;
    const timer = setTimeout(() => {
      setVisibleProgressPosition(position => Math.min(position + 1, targetProgressPosition));
    }, IMPORT_PROGRESS_MIN_STEP_MS);
    return () => clearTimeout(timer);
  }, [operation?.id, targetProgressPosition, visibleProgressPosition]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reducedMotion || !operation || !['pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status)) return;
    const animation = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => { animation.stop(); spin.setValue(0); };
  }, [operation, reducedMotion, spin]);

  useEffect(() => {
    if (!operation?.presentation?.stage || announced.current === operation.presentation.stage) return;
    announced.current = operation.presentation.stage;
    const label = resolveImportProgressPresentation(operation).title;
    AccessibilityInfo.announceForAccessibility(label);
    void trackAdminEvent('import_stage_viewed', { properties: { stage: operation.presentation.stage, operationKind: operation.kind } }).catch(() => undefined);
  }, [operation]);

  useEffect(() => {
    if (!operation || handled.current === `${operation.id}:${operation.status}`) return;
    if (!['succeeded', 'failed', 'cancelled'].includes(operation.status)) return;
    if (operation.status === 'succeeded' && visibleProgressPosition < 4) return;
    handled.current = `${operation.id}:${operation.status}`;
    if (operation.status !== 'succeeded') return;
    void (async () => {
      const userId = state.user?.id;
      if (!userId) return;
      await invalidateReceiptDerivedData(queryClient, userId);
      const experience = await experienceApi.getState();
      const destination = resolvePostImportDestination({ experience, outcome: 'succeeded' });
      if (destination === 'quick_setup') {
        setCompletion('zero');
        return;
      }
      if (destination === 'small_history') {
        setCompletion('small');
        return;
      }
      if (destination === 'automatic_recap') {
        suppressAdsForSession(userId);
        await analyticsApi.getUserSummary(userId, true);
        router.replace({ pathname: '/(tabs)/wrapped-journey', params: { auto: 'true', entryPoint: 'automatic_first_import' } });
        return;
      }
      router.replace({ pathname: '/data-tracking', params: { imported: 'true' } });
    })().catch(() => { handled.current = null; });
  }, [operation, queryClient, state.user?.id, visibleProgressPosition]);

  if (completion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Mascot pose={completion === 'zero' ? 'sad' : 'prop-receipt'} size={142} />
          <AppText variant="eyebrow" style={styles.eyebrow}>{completion === 'zero' ? 'LET’S TRY ANOTHER WAY' : 'A GOOD START'}</AppText>
          <AppText variant="pageTitle" style={styles.title}>{completion === 'zero' ? 'No supported orders found' : 'Your history has started'}</AppText>
          <AppText variant="body" style={styles.body}>{completion === 'zero' ? 'That inbox didn’t have supported receipts. Try another email or use a delivery-history download.' : 'We found a couple of orders. Add more history to unlock a meaningful recap.'}</AppText>
          <View style={styles.actions}>
            <AppButton label="Import missing orders" onPress={() => router.replace('/data-setup')} />
            {completion === 'small' ? <AppButton label="Explore SnackTrack" variant="secondary" onPress={() => router.replace('/(tabs)')} /> : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!operation && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Mascot pose="sad" size={130} />
          <AppText variant="pageTitle" style={styles.title}>We couldn’t find that import</AppText>
          <AppText variant="body" style={styles.body}>Your existing history is safe. Return to setup to try again.</AppText>
          <View style={styles.actions}><AppButton label="Return to setup" onPress={() => router.replace('/data-setup')} /></View>
        </View>
      </SafeAreaView>
    );
  }

  if (operation?.status === 'failed' || operation?.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Mascot pose="sad" size={142} />
          <AppText variant="eyebrow" style={styles.eyebrow}>YOUR HISTORY IS SAFE</AppText>
          <AppText variant="pageTitle" style={styles.title}>This import needs another try</AppText>
          <AppText variant="body" style={styles.body}>{operation.errorMessage || 'We couldn’t finish this import, but nothing you already added was removed.'}</AppText>
          <View style={styles.actions}>
            <AppButton label="Try another method" onPress={() => router.replace('/data-setup')} />
            <AppButton label="Check again" variant="secondary" onPress={() => void refresh()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (operation?.presentation?.mode === 'delayed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Mascot pose="thinking" size={150} />
          <AppText variant="eyebrow" style={styles.eyebrow}>STILL WORKING</AppText>
          <AppText variant="pageTitle" style={styles.title}>This is taking longer than usual</AppText>
          <AppText variant="body" style={styles.body}>Your import is safe and will keep running. We can let you know as soon as your history is ready.</AppText>
          <View style={styles.actions}>
            <AppButton label={notificationsEnabled ? 'Notifications are on' : 'Notify me when it’s ready'} icon="notifications-outline" disabled={notificationsEnabled} onPress={() => {
              if (!state.user?.id) return;
              void requestImportNotifications(state.user.id).then(setNotificationsEnabled).catch(() => setNotificationsEnabled(false));
            }} />
            <AppButton label="Explore SnackTrack" variant="secondary" onPress={() => {
              void trackAdminEvent('delayed_import_explore_selected', { properties: { operationKind: operation.kind } }).catch(() => undefined);
              router.replace('/(tabs)');
            }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isArchive = operation?.kind === 'export_file';
  const labels = [isArchive ? 'File uploaded securely' : 'Connected securely', isArchive ? 'Read your delivery history' : 'Found supported receipts', 'Building your stats', 'Preparing your recap'];
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressPage}>
        <View style={styles.mascotRing}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
          <Mascot pose="thinking" size={96} accessibilityLabel="SnackTrack is thinking while your orders are imported" />
        </View>
        <AppText variant="eyebrow" style={styles.eyebrow}>{view?.eyebrow ?? 'BUILDING YOUR HISTORY'}</AppText>
        <AppText variant="pageTitle" style={styles.title}>{view?.title ?? 'Getting everything ready'}</AppText>
        <AppText variant="body" style={styles.body}>{view?.body ?? 'Your secure import is starting now.'}</AppText>
        <View style={styles.checklist}>
          {labels.map((label, index) => <ProgressRow key={label} label={label} state={visibleSteps[index]} theme={theme} />)}
        </View>
        <AppText variant="metadata" style={styles.keepOpen}>Keep SnackTrack open while we build your history.</AppText>
      </View>
    </SafeAreaView>
  );
}

function ProgressRow({ label, state, theme }: { label: string; state: ImportProgressStepState; theme: AppTheme }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.stepRow} accessibilityLabel={`${label}, ${state}`}>
      <View style={styles.stepIcon}>
        {state === 'complete' ? <Ionicons name="checkmark" size={15} color={theme.colors.primary} /> : <View style={[styles.stepDot, state === 'active' && styles.activeDot]} />}
      </View>
      <AppText variant="rowTitle" style={[styles.stepLabel, state === 'pending' && styles.stepPending]}>{label}</AppText>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressPage: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  mascotRing: { width: 132, height: 132, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  spinner: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 3, borderColor: theme.colors.alpha(theme.colors.primary, 0.12), borderTopColor: theme.colors.primary },
  eyebrow: { textAlign: 'center', marginBottom: 10 },
  title: { textAlign: 'center', maxWidth: 344 },
  body: { textAlign: 'center', marginTop: 12, maxWidth: 340 },
  checklist: { paddingHorizontal: 4, gap: 14, marginTop: 30 },
  stepRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.slate500 },
  activeDot: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  stepLabel: { fontFamily: FontFamily.medium },
  stepPending: { color: theme.colors.textSecondary },
  keepOpen: { textAlign: 'center', marginTop: 22 },
  actions: { width: '100%', gap: 10, marginTop: 28 },
});

export default ImportProgressScreen;
