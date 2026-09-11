import { importReturnDestination, type ImportReturnTo } from '@features/import-flow/importNavigation';
import { ImportResultScreen } from './ImportResultScreen';
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
}

interface StatPreview {
  readonly title: string;
  readonly body: string;
  readonly icon: ComponentProps<typeof Ionicons>['name'];
}

const STAT_PREVIEWS: readonly StatPreview[] = [
  { title: 'Your late-night habits', body: 'See when your delivery cravings usually strike.', icon: 'moon-outline' },
  { title: 'Your favorite spots', body: 'Find the restaurants you return to most.', icon: 'location-outline' },
  { title: 'Your spending patterns', body: 'Understand how your delivery spending changes over time.', icon: 'bar-chart-outline' },
  { title: 'Your delivery personality', body: 'See the habits that make your order history yours.', icon: 'sparkles-outline' },
];

const importStageLabel = (status: string | undefined, stage: string | undefined): string => {
  if (status === 'retrying') return 'Waiting to retry safely';
  switch (stage) {
    case 'discovering': return 'Finding supported receipts';
    case 'building_history': return 'Building your stats';
    case 'preparing_recap': return 'Preparing your recap';
    default: return 'Getting ready';
  }
};

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
  const [reducedMotion, setReducedMotion] = useState(false);
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const animatedProgress = useAnimatedCounter(normalizedProgress, reducedMotion, IMPORT_PROGRESS_ANIMATION_MS);
  const animatedReceipts = useAnimatedCounter(Math.max(0, receiptsFound ?? 0), reducedMotion, 850);
  const progressDetails = receiptsFound !== null && receiptsFound > 0
    ? `${progressStatus} · ${animatedReceipts.displayed.toLocaleString()} receipts found`
    : progressStatus;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (normalizedProgress !== 100 || animatedProgress.displayed !== 100 || !onCompletionShown) return;
    const timer = setTimeout(onCompletionShown, IMPORT_PROGRESS_COMPLETE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [animatedProgress.displayed, normalizedProgress, onCompletionShown]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.progressPage}>
        <AppText variant="eyebrow" style={styles.eyebrow}>BUILDING YOUR HISTORY</AppText>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="pageTitle" style={styles.title}>Your SnackTrack is taking shape</AppText>
            <AppText variant="body" style={styles.body}>We’re turning your receipts into useful stats.</AppText>
          </View>
          <Mascot pose="thinking" size={78} accessibilityLabel="SnackTrack is thinking while your orders are imported" />
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
          <AppText variant="metadata" tone="muted" style={[styles.progressDetails, styles.animatedNumber]}>{progressDetails}</AppText>
        </View>

        <StatPreviewCarousel reducedMotion={reducedMotion} theme={theme} />

        <View style={styles.footer}>
          <AppText variant="metadata" tone="muted" style={styles.keepOpen}>{footerText}</AppText>
          {onContinue ? (
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

export function ImportProgressScreen({ operationId, returnTo = 'home', uploadActive = false, uploadProgress }: ImportProgressScreenProps) {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state } = useUser();
  const queryClient = useQueryClient();
  const { operation, isLoading, isUnavailable, refresh } = useImportOperation(Boolean(state.user?.id), false, operationId);
  const handled = useRef<string | null>(null);
  const announced = useRef<string | null>(null);
  const [completionShownFor, setCompletionShownFor] = useState<string | null>(null);
  const stableTimeEstimate = useStableImportTimeEstimate(operation?.id, operation?.presentation?.timeEstimate);
  const timeEstimateText = importTimeEstimateText(stableTimeEstimate);
  const progress = resolveOverallImportProgress(operation, uploadActive ? uploadProgress ?? 0 : undefined);
  const receiptsFound = operation?.presentation?.discoveredOrderCount ?? null;
  const targetProgressPosition = useMemo(() => operation ? resolveImportProgressPosition(operation) : 0, [operation]);
  const {
    visibleProgress,
  } = useImportProgressPacing(operation?.id, targetProgressPosition, progress);
  const operationIdForCompletion = operation?.id;
  const markCompletionShown = useCallback(() => {
    if (operationIdForCompletion) setCompletionShownFor(operationIdForCompletion);
  }, [operationIdForCompletion]);

  useEffect(() => {
    if (!operation?.presentation?.stage || announced.current === operation.presentation.stage) return;
    announced.current = operation.presentation.stage;
    const label = resolveImportProgressPresentation(operation).title;
    AccessibilityInfo.announceForAccessibility(label);
    void trackAdminEvent('import_stage_viewed', { properties: { stage: operation.presentation.stage, operationKind: operation.kind } }).catch(() => undefined);
  }, [operation]);

  useEffect(() => {
    if (isUnavailable || !operation || handled.current === `${operation.id}:${operation.status}`) return;
    if (!['succeeded', 'failed', 'cancelled', 'expired', 'superseded'].includes(operation.status)) return;
    if (operation.status === 'succeeded' && completionShownFor !== operation.id) return;
    handled.current = `${operation.id}:${operation.status}`;
    if (operation.status !== 'succeeded') return;
    void (async () => {
      const userId = state.user?.id;
      if (!userId) return;
      await invalidateReceiptDerivedData(queryClient, userId);
      navigation.replace({ pathname: '/import-result', params: { operationId: operation.id, returnTo } });
    })().catch(() => { navigation.replace({ pathname: '/import-result', params: { operationId: operation.id, returnTo } }); });
  }, [completionShownFor, operation, queryClient, state.user?.id, isUnavailable, navigation, returnTo]);

  if (!uploadActive && !isUnavailable && operation?.status === 'awaiting_upload') return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.centered}><AppText variant="pageTitle" style={styles.title}>Your file hasn’t been submitted yet</AppText><AppText variant="body" style={styles.body}>Choose the original file to finish uploading. Processing starts after the upload is accepted.</AppText><View style={styles.actions}><AppButton label="Choose the file again" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo, journeyContext: operation.journeyContext === 'onboarding' ? 'onboarding' : 'post_onboarding', intent: 'provider', ...(operation.provider ? { provider: operation.provider, downloadedVersion: 'resume' } : {}) } })} /><AppButton label="Add orders" variant="secondary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></View></ScrollView></SafeAreaView>;

  if (!uploadActive && isUnavailable) return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.centered}><AppText variant="pageTitle">Import status is unavailable</AppText><AppText variant="body" style={styles.body}>We can’t confirm whether this import has finished. Check its status before starting another copy.</AppText><AppButton label="Reload status" onPress={() => void refresh()} /><AppButton label="View order history" variant="secondary" onPress={() => navigation.replace(appDestinations.history)} /></ScrollView></SafeAreaView>;

  if (!operation && !isLoading && !uploadActive) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.centered}>
          <Mascot pose="sad" size={130} />
          <AppText variant="pageTitle" style={styles.title}>We couldn’t find that import</AppText>
          <AppText variant="body" style={styles.body}>Your saved history is available. Open Add orders to choose a source or find a saved import.</AppText>
          <View style={styles.actions}><AppButton label="Choose another import" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (operation && ['failed', 'cancelled', 'expired', 'superseded'].includes(operation.status)) {
    return <ImportResultScreen operationId={operation.id} returnTo={returnTo} />;
  }

  const progressStatus = uploadActive
    ? (uploadProgress ?? 0) < 1 ? 'Uploading your file' : 'Submitting your file'
    : importStageLabel(operation?.status, operation?.presentation?.stage);
  return (
    <ImportProgressLoadingView
      progress={visibleProgress}
      progressStatus={progressStatus}
      receiptsFound={receiptsFound}
      estimateText={timeEstimateText}
      footerText={uploadActive ? 'Keep SnackTrack open until your file is accepted.' : undefined}
      onContinue={!uploadActive && operation ? () => navigation.replace(importReturnDestination(returnTo)) : undefined}
      onCompletionShown={operation?.status === 'succeeded' ? markCompletionShown : undefined}
    />
  );
}

function StatPreviewCarousel({ reducedMotion, theme }: { reducedMotion: boolean; theme: AppTheme }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = Math.min(420, windowWidth - 48);
  const scroll = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const showSlide = useCallback((requestedIndex: number, animated = true) => {
    const next = (requestedIndex + STAT_PREVIEWS.length) % STAT_PREVIEWS.length;
    scroll.current?.scrollTo({ x: next * slideWidth, animated });
    setActiveIndex(next);
  }, [slideWidth]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => showSlide(activeIndex + 1), 5_000);
    return () => clearTimeout(timer);
  }, [activeIndex, reducedMotion, showSlide]);

  return (
    <View style={styles.carouselRegion} accessibilityLabel={`Upcoming stat preview ${activeIndex + 1} of ${STAT_PREVIEWS.length}`}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setActiveIndex(Math.max(0, Math.min(
          STAT_PREVIEWS.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / slideWidth),
        )))}
        accessibilityRole="adjustable"
        accessibilityHint="Swipe horizontally to preview the stats SnackTrack will unlock"
        accessibilityActions={[{ name: 'increment', label: 'Next preview' }, { name: 'decrement', label: 'Previous preview' }]}
        onAccessibilityAction={(event) => showSlide(
          activeIndex + (event.nativeEvent.actionName === 'decrement' ? -1 : 1),
          !reducedMotion,
        )}
      >
        {STAT_PREVIEWS.map(slide => (
          <View key={slide.title} style={[styles.previewSlide, { width: slideWidth }]}>
            <View style={styles.previewCard} accessibilityLabel={`${slide.title}. ${slide.body}`}>
              <AppText variant="eyebrow" tone="brand">COMING UP</AppText>
              <AppText variant="surfaceTitle" style={styles.previewTitle}>{slide.title}</AppText>
              <View style={styles.previewIconWell}>
                <Ionicons name={slide.icon} size={46} color={theme.colors.primary} />
              </View>
              <AppText variant="surfaceBody" tone="muted" style={styles.previewBody}>{slide.body}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {STAT_PREVIEWS.map((slide, index) => (
          <View key={slide.title} style={[styles.paginationDot, index === activeIndex && styles.paginationDotActive]} />
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressPage: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  centered: { flexGrow: 1, paddingVertical: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  eyebrow: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCopy: { flex: 1 },
  title: { maxWidth: 280 },
  body: { marginTop: 12, maxWidth: 300 },
  progressSection: { marginTop: 36 },
  progressHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  progressTrack: { height: 12, marginTop: 12, overflow: 'hidden', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressTrack },
  progressFill: { height: '100%', borderRadius: theme.radii.pill, backgroundColor: theme.colors.progressFill },
  progressDetails: { marginTop: 10 },
  animatedNumber: { fontVariant: ['tabular-nums'] },
  carouselRegion: { width: '100%', maxWidth: 420, alignSelf: 'center', marginTop: 24 },
  previewSlide: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  previewCard: { minHeight: 276, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 46, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  previewTitle: { marginTop: 8, textAlign: 'center' },
  previewIconWell: { width: 92, height: 92, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 46, backgroundColor: theme.colors.chipActiveBg },
  previewBody: { maxWidth: 260, marginTop: 18, textAlign: 'center' },
  pagination: { position: 'absolute', bottom: 42, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  paginationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.divider },
  paginationDotActive: { width: 18, backgroundColor: theme.colors.primary },
  footer: { alignItems: 'center', paddingTop: 20 },
  keepOpen: { maxWidth: 300, textAlign: 'center' },
  textAction: { minHeight: 44, marginTop: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.control },
  textActionPressed: { backgroundColor: theme.colors.chipActiveBg },
  actions: { width: '100%', gap: 10, marginTop: 28 },
});

export default ImportProgressScreen;
