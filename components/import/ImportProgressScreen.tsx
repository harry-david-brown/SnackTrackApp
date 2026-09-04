import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import { AppButton } from '@components/ui/AppButton';
import { Colors, Radius } from '@constants/theme';
import { useUser } from '@contexts/UserContext';
import { resolveImportProgressPresentation, type ImportProgressStepState } from '@features/import-flow/importProgressPresentation';
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
  const { state } = useUser();
  const queryClient = useQueryClient();
  const { operation, isLoading, refresh } = useImportOperation(Boolean(state.user?.id), false, operationId);
  const handled = useRef<string | null>(null);
  const announced = useRef<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const view = useMemo(() => operation ? resolveImportProgressPresentation(operation) : null, [operation]);

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
  }, [operation, queryClient, state.user?.id]);

  if (completion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MascotPlaceholder pose={completion === 'zero' ? 'sad' : 'prop-receipt'} size={142} />
          <Text style={styles.eyebrow}>{completion === 'zero' ? 'LET’S TRY ANOTHER WAY' : 'A GOOD START'}</Text>
          <Text style={styles.title}>{completion === 'zero' ? 'No supported orders found' : 'Your history has started'}</Text>
          <Text style={styles.body}>{completion === 'zero' ? 'That inbox didn’t have supported receipts. Try another email or use a delivery-history download.' : 'We found a couple of orders. Add more history to unlock a meaningful recap.'}</Text>
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
          <MascotPlaceholder pose="sad" size={130} />
          <Text style={styles.title}>We couldn’t find that import</Text>
          <Text style={styles.body}>Your existing history is safe. Return to setup to try again.</Text>
          <View style={styles.actions}><AppButton label="Return to setup" onPress={() => router.replace('/data-setup')} /></View>
        </View>
      </SafeAreaView>
    );
  }

  if (operation?.status === 'failed' || operation?.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MascotPlaceholder pose="sad" size={142} />
          <Text style={styles.eyebrow}>YOUR HISTORY IS SAFE</Text>
          <Text style={styles.title}>This import needs another try</Text>
          <Text style={styles.body}>{operation.errorMessage || 'We couldn’t finish this import, but nothing you already added was removed.'}</Text>
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
          <MascotPlaceholder pose="thinking" size={150} />
          <Text style={styles.eyebrow}>STILL WORKING</Text>
          <Text style={styles.title}>This is taking longer than usual</Text>
          <Text style={styles.body}>Your import is safe and will keep running. We can let you know as soon as your history is ready.</Text>
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
          <MascotPlaceholder pose="thinking" size={132} />
        </View>
        <Text style={styles.eyebrow}>{view?.eyebrow ?? 'BUILDING YOUR HISTORY'}</Text>
        <Text style={styles.title}>{view?.title ?? 'Getting everything ready'}</Text>
        <Text style={styles.body}>{view?.body ?? 'Your secure import is starting now.'}</Text>
        <View style={styles.checklist}>
          {labels.map((label, index) => <ProgressRow key={label} label={label} state={view?.steps[index] ?? (index === 0 ? 'active' : 'pending')} />)}
        </View>
        <Text style={styles.keepOpen}>Keep SnackTrack open while we build your history.</Text>
      </View>
    </SafeAreaView>
  );
}

function ProgressRow({ label, state }: { label: string; state: ImportProgressStepState }) {
  return (
    <View style={styles.stepRow} accessibilityLabel={`${label}, ${state}`}>
      <View style={[styles.stepIcon, state === 'complete' && styles.stepComplete, state === 'active' && styles.stepActive]}>
        {state === 'complete' ? <Ionicons name="checkmark" size={17} color={Colors.white} /> : state === 'active' ? <View style={styles.activeDot} /> : null}
      </View>
      <Text style={[styles.stepLabel, state === 'pending' && styles.stepPending]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressPage: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 26 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  mascotRing: { width: 180, height: 180, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  spinner: { position: 'absolute', width: 174, height: 174, borderRadius: 87, borderWidth: 3, borderColor: Colors.alpha(Colors.primary, 0.12), borderTopColor: Colors.primary },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textAlign: 'center', marginBottom: 10 },
  title: { color: Colors.textPrimary, fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -0.6, textAlign: 'center' },
  body: { color: Colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, maxWidth: 340 },
  checklist: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 18, gap: 16, marginTop: 30, borderWidth: 1, borderColor: Colors.divider },
  stepRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.slate200 },
  stepComplete: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepActive: { borderColor: Colors.primary, backgroundColor: Colors.alpha(Colors.primary, 0.08) },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  stepLabel: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  stepPending: { color: Colors.textSecondary, fontWeight: '500' },
  keepOpen: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 22 },
  actions: { width: '100%', gap: 10, marginTop: 28 },
});

export default ImportProgressScreen;
