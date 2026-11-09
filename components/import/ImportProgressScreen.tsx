import { ImportReadyNotification } from './ImportReadyNotification';
import { ImportStatPreview } from './ImportStatPreview';
import { useFirstImportProgress } from '@hooks/useFirstImportProgress';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { importStageLabel } from '@features/import-flow/importStatusPresentation';
import { importReturnDestination, type ImportReturnTo } from '@features/import-flow/importNavigation';
import { ImportResultScreen } from './ImportResultScreen';
import { Redirect } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useUser } from '@contexts/UserContext';
import { IMPORT_PROGRESS_ANIMATION_MS, IMPORT_PROGRESS_COMPLETE_HOLD_MS, resolveImportProgressPosition, resolveImportProgressPresentation, resolveOverallImportProgress } from '@features/import-flow/importProgressPresentation';
import { useImportOperation } from '@hooks/useImportOperation';
import { useImportProgressPacing } from '@hooks/useImportProgressPacing';
import { useStableImportTimeEstimate } from '@hooks/useStableImportTimeEstimate';
import { importTimeEstimateText } from '@features/import-flow/importTimeEstimate';
import { invalidateReceiptDerivedData } from '@lib/queryInvalidation';
import { trackAdminEvent } from '@services/adminAnalytics';
import { appDestinations, useAppNavigation } from '@features/navigation';

interface ImportProgressScreenProps {
  operationId?: string;
  returnTo?: ImportReturnTo;
  uploadActive?: boolean;
  uploadProgress?: number;
  providerName?: string;
}

const useAnimatedCounter = (
  target: number,
  reducedMotion: boolean,
  duration: number,
): { readonly animated: Animated.Value; readonly displayed: number } => {
  const animated = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const listener = animated.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => animated.removeListener(listener);
  }, [animated]);

  useEffect(() => {
    animated.stopAnimation();
    if (reducedMotion) {
      animated.setValue(target);
      setDisplayed(target);
      return;
    }
    const transition = Animated.timing(animated, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    transition.start();
    return () => transition.stop();
  }, [animated, duration, reducedMotion, target]);

  return { animated, displayed };
};

interface ImportProgressLoadingViewProps {
  readonly providerName?: string;
  readonly firstImport?: boolean;
  readonly notificationAction?: ReactNode;
  readonly progress: number;
  readonly progressStatus: string;
  readonly receiptsFound?: number | null;
  readonly estimateText?: string | null;
  readonly footerText?: string;
  readonly onContinue?: () => void;
  readonly onCompletionShown?: () => void;
}

/** Shared loading experience used before and after an upload is accepted. */
export function ImportProgressLoadingView({
  providerName,
  firstImport = false,
  notificationAction,
  progress,
  progressStatus,
  receiptsFound = null,
  estimateText = null,
  footerText = 'You can leave—your import continues in the background.',
  onContinue,
  onCompletionShown,
}: ImportProgressLoadingViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useAppReducedMotion();
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const animatedProgress = useAnimatedCounter(normalizedProgress, reducedMotion, IMPORT_PROGRESS_ANIMATION_MS);
  const animatedReceipts = useAnimatedCounter(Math.max(0, receiptsFound ?? 0), reducedMotion, 850);
  const progressDetails = receiptsFound !== null && receiptsFound > 0
    ? `${progressStatus} · ${animatedReceipts.displayed.toLocaleString()} receipts found`
    : progressStatus;

  useEffect(() => {
    if (normalizedProgress !== 100 || animatedProgress.displayed !== 100 || !onCompletionShown) return;
    const timer = setTimeout(onCompletionShown, IMPORT_PROGRESS_COMPLETE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [animatedProgress.displayed, normalizedProgress, onCompletionShown]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.progressPage}>
        <AppText variant="eyebrow" style={styles.eyebrow}>{firstImport ? 'YOUR FIRST SNACKTRACK' : 'ADDING MORE ORDERS'}</AppText>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="pageTitle" style={styles.title}>{firstImport ? 'Your delivery story is taking shape' : 'Your delivery story keeps growing'}</AppText>
            <AppText variant="body" style={styles.body}>{progressStatus === 'Waiting to start' ? 'Your import is saved and waiting to start.' : progressStatus === 'Retrying automatically' ? 'We hit a temporary issue and will try again automatically.' : firstImport ? 'We’re finding your orders and turning them into spending stats and a personal recap.' : 'We’re checking for more orders and updating your spending stats and personal recap.'}</AppText>
          </View>
          <Mascot pose="thinking" size={130} style={styles.mascot} accessibilityLabel="SnackTrack is thinking while your orders are imported" />
        </View>

        <View
          style={styles.progressSection}
          accessibilityRole="progressbar"
          accessibilityLabel={`${normalizedProgress}% complete. ${progressStatus}${receiptsFound !== null && receiptsFound > 0 ? `. ${receiptsFound.toLocaleString()} receipts found` : ''}`}
          accessibilityValue={{ min: 0, max: 100, now: normalizedProgress }}
        >
          <View style={styles.progressHeading}>
            <AppText variant="surfaceTitle" style={styles.animatedNumber}>{animatedProgress.displayed}% complete</AppText>
            {estimateText ? <AppText variant="metadata" tone="brand">{estimateText}</AppText> : null}
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: animatedProgress.animated.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }) }]} />
          </View>
          <AppText variant="metadata" tone="muted" style={[styles.progressDetails, styles.animatedNumber]}>{providerName ? `${providerName} · ${progressDetails}` : progressDetails}</AppText>
        </View>

        <ImportStatPreview complete={normalizedProgress === 100} />

        <View style={styles.footer}>
          {notificationAction ?? <AppText variant="metadata" tone="muted" style={styles.keepOpen}>{footerText}</AppText>}
          {onContinue && !firstImport ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue using SnackTrack"
              hitSlop={10}
              onPress={onContinue}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <AppText variant="button" tone="brand">Continue using SnackTrack</AppText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ImportProgressScreen({ operationId, returnTo = 'home', uploadActive = false, uploadProgress, providerName }: ImportProgressScreenProps) {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state } = useUser();
  const queryClient = useQueryClient();
  const { operation: savedOperation, isLoading, isUnavailable, refresh } = useImportOperation(Boolean(state.user?.id) && !uploadActive, false, operationId);
  // A previous terminal job must never replace the current upload/submission screen.
  const operation = uploadActive ? null : savedOperation;
  const firstImport = useFirstImportProgress(state.user?.id, operation);
  const handled = useRef<string | null>(null);
  const announced = useRef<string | null>(null);
  const stableTimeEstimate = useStableImportTimeEstimate(operation?.id, operation?.presentation?.timeEstimate);
  const timeEstimateText = importTimeEstimateText(stableTimeEstimate);
  const progress = resolveOverallImportProgress(operation, uploadActive ? uploadProgress ?? 0 : undefined);
  const receiptsFound = operation?.presentation?.discoveredOrderCount ?? null;
  const targetProgressPosition = useMemo(() => operation ? resolveImportProgressPosition(operation) : 0, [operation]);
  const {
    visibleProgress,
  } = useImportProgressPacing(operation?.id, targetProgressPosition, progress);
  const succeededOperationId = operation?.status === 'succeeded' ? operation.id : null;

  useEffect(() => {
    if (!operation?.presentation?.stage || announced.current === operation.presentation.stage) return;
    announced.current = operation.presentation.stage;
    const label = resolveImportProgressPresentation(operation).title;
    AccessibilityInfo.announceForAccessibility(label);
    void trackAdminEvent('import_stage_viewed', { properties: { stage: operation.presentation.stage, operationKind: operation.kind } }).catch(() => undefined);
  }, [operation]);

  useEffect(() => {
    if (!succeededOperationId || handled.current === `${succeededOperationId}:succeeded`) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const completionKey = `${succeededOperationId}:succeeded`;
    const showResult = () => {
      if (cancelled) return;
      const outcome = navigation.replace({ pathname: '/import-result', params: { operationId: succeededOperationId, returnTo } });
      if (outcome === 'transition-pending') {
        retryTimer = setTimeout(showResult, 100);
        return;
      }
      if (outcome === 'navigated' || outcome === 'already-current') handled.current = completionKey;
    };
    if (state.user?.id) void invalidateReceiptDerivedData(queryClient, state.user.id).catch(() => undefined);
    showResult();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [navigation, queryClient, returnTo, state.user?.id, succeededOperationId]);

  if (operation?.kind === 'export_ready_check') return <Redirect href={{ pathname: '/add-history', params: { returnTo, intent: 'resume_export', provider: operation.provider ?? undefined } }} />;

  if (!uploadActive && !isUnavailable && operation?.status === 'awaiting_upload') return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.centered}><AppText variant="pageTitle" style={styles.title}>Your file hasn’t been submitted yet</AppText><AppText variant="body" style={styles.body}>Choose the original file to finish uploading. Processing starts after the upload is accepted.</AppText><View style={styles.actions}><AppButton size="journey" label="Choose the file again" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo, journeyContext: operation.journeyContext === 'onboarding' ? 'onboarding' : 'post_onboarding', intent: 'provider', ...(operation.provider ? { provider: operation.provider, downloadedVersion: 'resume' } : {}) } })} /><AppButton label="Add orders" variant="tertiary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></View></ScrollView></SafeAreaView>;

  if (!uploadActive && isUnavailable) return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.centered}><AppText variant="pageTitle">Import status is unavailable</AppText><AppText variant="body" style={styles.body}>We can’t confirm whether this import has finished. Check its status before starting another copy.</AppText><AppButton size="journey" label="Reload status" onPress={() => void refresh()} /><AppButton label="View order history" variant="tertiary" onPress={() => navigation.replace(appDestinations.history)} /></ScrollView></SafeAreaView>;

  if (!operation && !isLoading && !uploadActive) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.centered}>
          <Mascot pose="sad" size={130} />
          <AppText variant="pageTitle" style={styles.title}>We couldn’t find that import</AppText>
          <AppText variant="body" style={styles.body}>Your saved history is available. Open Add orders to choose a source or find a saved import.</AppText>
          <View style={styles.actions}><AppButton size="journey" label="Choose another import" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (operation && ['failed', 'cancelled', 'expired', 'superseded'].includes(operation.status)) {
    return <ImportResultScreen operationId={operation.id} returnTo={returnTo} />;
  }

  const canContinueInBackground = !uploadActive && Boolean(operation && ['pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status));
  const progressStatus = uploadActive
    ? (uploadProgress ?? 0) < 1 ? 'Uploading your file' : 'Submitting your file'
    : importStageLabel(operation?.status, operation?.presentation?.stage);
  return (
    <ImportProgressLoadingView
      firstImport={firstImport === true}
      notificationAction={canContinueInBackground && operation
        ? <ImportReadyNotification key={operation.id} userId={state.user?.id} returningUser={firstImport === false} /> : undefined}
      providerName={providerName ?? (operation?.provider === 'doordash' ? 'DoorDash' : operation?.provider === 'uber_eats' ? 'Uber Eats' : operation?.kind === 'gmail_historical' ? 'Gmail' : operation?.kind === 'outlook_historical' ? 'Outlook' : undefined)}
      progress={visibleProgress}
      progressStatus={progressStatus}
      receiptsFound={receiptsFound}
      estimateText={timeEstimateText}
      footerText={uploadActive ? 'Keep SnackTrack open until your file is accepted.' : 'We’ll show your results when your history is ready.'}
      onContinue={firstImport === false && canContinueInBackground ? () => navigation.replace(importReturnDestination(returnTo)) : undefined}
    />
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressPage: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  centered: { flexGrow: 1, paddingVertical: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  eyebrow: { marginBottom: 12 },
  titleRow: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  titleCopy: { width: '100%' },
  mascot: { alignSelf: 'center' },
  title: { maxWidth: 280 },
  body: { marginTop: 12, maxWidth: 300 },
  progressSection: { marginTop: 36 },
  progressHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  progressTrack: { height: 7, marginTop: 12, overflow: 'hidden', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressTrack },
  progressFill: { height: '100%', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressFill },
  progressDetails: { marginTop: 10 },
  animatedNumber: { fontVariant: ['tabular-nums'] },
  footer: { alignItems: 'center', marginTop: 'auto', paddingTop: 32 },
  keepOpen: { maxWidth: 300, textAlign: 'center' },
  textAction: { minHeight: 44, marginTop: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.control },
  textActionPressed: { backgroundColor: theme.colors.chipActiveBg },
  actions: { width: '100%', gap: 10, marginTop: 28 },
});

export default ImportProgressScreen;
