import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontFamily, Radius, Spacing, type AppTheme } from '@constants/theme';
import { Motion } from '@constants/motion';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { useUser } from '@contexts/UserContext';
import { useAnalyticsQuery } from '@hooks/queries/useAnalyticsQueries';
import { useReceiptsQuery } from '@hooks/queries/useReceiptsQuery';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { resolveGmailBaselineState } from '@features/import-flow/gmailBaselineState';
import {
  receiptDateFilters,
  defaultReceiptHistoryFilters,
  receiptHistoryFilteredSpend,
  resolveReceiptHistorySections,
  type ReceiptHistorySection,
} from '@features/receipts/receiptHistoryView';
import { ReceiptType, type Receipt } from '@/types/api';
import { ReceiptCard } from './ReceiptCard';
import { ReceiptHistoryFilters } from './ReceiptHistoryFilters';
import { AppButton } from '@components/ui/AppButton';
import { EmptyState } from '@components/ui/EmptyState';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { resolveReceiptListState } from '@features/receipts/receiptListState';
import { trackAdminEvent } from '@services/adminAnalytics';
import { addHistoryDestination, appDestinations, useAppNavigation } from '@features/navigation';
import { NativeAdPlacement } from '@features/ads/NativeAdPlacement';
import { isAdEligible } from '@features/ads/contracts';
import { useAdRuntimeConfiguration } from '@features/ads/useAdRuntimeConfiguration';
import { claimAdOpportunity, getDailyAdImpressions, getSessionAdImpressions, isAdSessionSuppressed, recordDailyAdImpression, recordSessionAdImpression } from '@features/ads/adSession';
import { AppText } from '@components/ui/AppText';
import { orderMetricActivityLabel, orderMetricKnownCostLabel } from '@features/receipts/orderMetricPresentation';
import { formatReceiptMoney } from '@utils/receiptMoney';
import { ApiClientError } from '@services/api/apiError';

export interface InsightHistoryFilter {
  readonly snapshotId?: string;
  readonly id: string;
  readonly localDate: string;
  readonly label: string;
}

export function ReceiptHistoryScreen({ showBack = false, insightFilter }: { showBack?: boolean; insightFilter?: InsightHistoryFilter }) {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { formatCurrency } = useCurrency();
  const { state } = useUser();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(defaultReceiptHistoryFilters);
  const { provider, dateRange, outcome: outcomeFilter } = selection;
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const listRef = useRef<SectionList<Receipt, ReceiptHistorySection>>(null);
  const [sessionAdImpressions, setSessionAdImpressions] = useState(0);
  const [dailyAdImpressions, setDailyAdImpressions] = useState<number | null>(null);
  const [adClaimed, setAdClaimed] = useState(false);
  const reduceMotion = useAppReducedMotion();
  const hasTrackedInitialFilters = useRef(false);
  const deferredSearch = useDeferredValue(search.trim());
  const filters = useMemo(() => ({
    ...(provider === 'all' ? {} : { receiptType: provider === 'uber_eats' ? ReceiptType.UBER_EATS : ReceiptType.DOORDASH }),
    ...(deferredSearch ? { restaurantName: deferredSearch } : {}),
    ...(outcomeFilter === 'all' ? {} : { outcome: outcomeFilter }),
    ...receiptDateFilters(dateRange),
  }), [dateRange, deferredSearch, provider, outcomeFilter]);
  const receiptsQuery = useReceiptsQuery(state.user?.id, {
    pageSize: 30,
    filters,
    insight: insightFilter ? { id: insightFilter.id, localDate: insightFilter.localDate, snapshotId: insightFilter.snapshotId } : undefined,
  });
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const { preferences } = useImportPreferences(Boolean(state.user?.id));
  const adRuntime = useAdRuntimeConfiguration(state.user?.id);
  const receipts = useMemo(
    () => receiptsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [receiptsQuery.data?.pages],
  );
  const total = receiptsQuery.data?.pages[0]?.pageInfo.total ?? receipts.length;
  const hasFilters = Boolean(insightFilter) || provider !== 'all' || dateRange !== 'all' || outcomeFilter !== 'all' || Boolean(deferredSearch);
  const hasOutcomeEvidence = Boolean(analyticsQuery.data?.orderMetrics) || receipts.some(receipt => receipt.orderOutcome) || outcomeFilter !== 'all';
  const adAnchorId = !hasFilters && receipts.length >= 5 ? receipts[4]?.id : null;
  const sections = useMemo(
    () => resolveReceiptHistorySections(
      receipts,
      analyticsQuery.data?.monthlyBreakdown,
      !hasFilters,
      analyticsQuery.data?.orderMetricPeriods,
    ),
    [analyticsQuery.data?.monthlyBreakdown, analyticsQuery.data?.orderMetricPeriods, hasFilters, receipts],
  );
  const receiptIndexes = useMemo(
    () => new Map(receipts.map((receipt, index) => [receipt.id, index])),
    [receipts],
  );
  const listState = resolveReceiptListState({
    hasUser: Boolean(state.user),
    receipts,
    total,
    isPending: receiptsQuery.isPending,
    isError: receiptsQuery.isError,
    isRefetching: receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage,
  });
  const resultsReady = listState.id === 'success' || listState.id === 'refreshing' || listState.id === 'stale-success' || listState.id === 'empty';
  const errorType = receiptsQuery.error instanceof ApiClientError ? receiptsQuery.error.kind : 'unknown';
  const retryError = <ErrorMessage
    error={errorType === 'network'
      ? 'Check your internet connection and try again. Your current view will be kept.'
      : receiptsQuery.isFetchNextPageError
        ? 'We couldn’t load more orders. Your loaded orders are still available.'
        : 'We couldn’t load your order history. Please try again.'}
    type={errorType}
    onRetry={receiptsQuery.isFetching ? undefined : () => {
      if (receiptsQuery.isFetchNextPageError) void receiptsQuery.fetchNextPage();
      else void receiptsQuery.refetch();
    }}
  />;
  const searchPending = search.trim() !== deferredSearch;
  const allResultsLoaded = resultsReady && !receiptsQuery.hasNextPage && receipts.length === total;
  const resultNoun = hasOutcomeEvidence ? 'record' : 'order';
  const resultCountLabel = `${total} matching ${resultNoun}${total === 1 ? '' : 's'}`;
  const filteredSpend = useMemo(() => receiptHistoryFilteredSpend(
    receipts, total, Boolean(receiptsQuery.hasNextPage), formatCurrency,
  ), [receipts, total, receiptsQuery.hasNextPage, formatCurrency]);
  const allTimeActivity = analyticsQuery.data?.orderMetrics
    ? orderMetricActivityLabel(analyticsQuery.data.orderMetrics)
    : analyticsQuery.data ? `${analyticsQuery.data.totalReceipts} orders` : null;
  const allTimeSpend = analyticsQuery.data?.orderMetrics
    ? orderMetricKnownCostLabel(analyticsQuery.data.orderMetrics, formatCurrency)
    : analyticsQuery.data
      ? `${formatReceiptMoney(analyticsQuery.data.totalSpent, analyticsQuery.data.currencyCode, formatCurrency)} tracked`
      : null;
  const emptyMessage = insightFilter
    ? 'The order history changed after this stat was created. Return to the dashboard for a refreshed observation.'
    : hasFilters
    ? 'Try a different restaurant, delivery app, date range, or outcome. Missing outcome evidence is not treated as a confirmed delivery or refund.'
    : resolveGmailBaselineState(preferences).hasCompleted
      ? 'Your email scan found no supported delivery orders. Try another source to build the full picture.'
      : 'Find orders in your email or use a history download to build your first SnackTrack.';

  useEffect(() => {
    void trackAdminEvent('history_viewed').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!state.user?.id) return;
    setSessionAdImpressions(getSessionAdImpressions(state.user.id));
    void getDailyAdImpressions(state.user.id).then(setDailyAdImpressions);
  }, [adRuntime.appActive, state.user?.id]);
  const baseAdEligible = isAdEligible({
    configuration: adRuntime.configuration,
    configurationFresh: adRuntime.configurationFresh,
    receiptCount: analyticsQuery.data?.totalReceipts ?? null,
    insightsReady: listState.id === 'success' || listState.id === 'refreshing',
    appActive: adRuntime.appActive,
    impressionsThisSession: sessionAdImpressions,
    impressionsToday: dailyAdImpressions ?? Number.MAX_SAFE_INTEGER,
    placement: 'history_after_fifth_order',
    sessionSuppressed: state.user?.id ? isAdSessionSuppressed(state.user.id) : true,
  });
  useEffect(() => {
    if (baseAdEligible && adAnchorId && state.user?.id) setAdClaimed(claimAdOpportunity(state.user.id, 'history_after_fifth_order'));
  }, [adAnchorId, baseAdEligible, state.user?.id]);
  const insightFilterId = insightFilter?.id;
  const recordAdImpression = () => {
    if (!state.user?.id) return;
    setSessionAdImpressions(recordSessionAdImpression(state.user.id));
    void recordDailyAdImpression(state.user.id).then(setDailyAdImpressions);
  };

  useEffect(() => {
    if (!hasTrackedInitialFilters.current) {
      hasTrackedInitialFilters.current = true;
      return;
    }
    void trackAdminEvent('history_filter_changed', {
      properties: { filter: insightFilterId !== undefined ? 'dashboard-stat' : `${provider}:${dateRange}:${outcomeFilter}:${deferredSearch ? 'search' : 'none'}` },
    }).catch(() => undefined);
  }, [dateRange, deferredSearch, insightFilterId, provider, outcomeFilter]);

  const refresh = async () => {
    setExpandedId(null);
    await Promise.all([receiptsQuery.refetch(), analyticsQuery.refetch()]);
  };
  const loadMore = () => {
    if (resultsReady && !receiptsQuery.isError && !receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage && receiptsQuery.hasNextPage) {
      void receiptsQuery.fetchNextPage();
    }
  };
  const clearFilters = () => {
    if (insightFilter) {
      navigation.setParams({ insightId: undefined, insightDate: undefined, insightLabel: undefined, insightSnapshot: undefined });
      return;
    }
    setSearch('');
    setSelection(defaultReceiptHistoryFilters);
    setExpandedId(null);
  };
  const showResults = () => {
    setFiltersExpanded(false);
    Keyboard.dismiss();
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: !reduceMotion });
  };

  const listHeader = <View style={styles.listHeader}>
    {resultsReady && receiptsQuery.isError && !receiptsQuery.isFetchNextPageError ? retryError : null}
    {showBack || insightFilter ? <View style={styles.backAction}><AppButton label="Back" variant="icon" icon="arrow-back" onPress={() => navigation.backOr(appDestinations.home)} /></View> : null}
    <View style={styles.header}>
      <AppText variant="eyebrow" tone="brand">YOUR ORDERS</AppText>
      <View style={styles.titleRow}>
        <AppText variant="pageTitle" style={styles.title}>History</AppText>
        {!insightFilter ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add orders"
          onPress={() => navigation.open(addHistoryDestination({ returnTo: 'history' }))}
          style={({ pressed }) => [styles.addOrders, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={theme.colors.primary} />
          <AppText variant="metadata" tone="brand" style={styles.addOrdersLabel}>Add orders</AppText>
        </Pressable> : null}
      </View>
      {insightFilter ? <AppText variant="metadata" tone="muted">
        {resultsReady ? `${total} ${total === 1 ? 'order' : 'orders'} behind this stat` : 'Orders behind this stat'}
      </AppText> : <View style={styles.totals}>
        <AppText variant="metadata" tone="muted">{allTimeActivity ? `${allTimeActivity} · All time` : 'Your all-time history'}</AppText>
        <AppText variant="metadata" tone="muted">{allTimeSpend ?? 'Totals unavailable'}</AppText>
      </View>}
    </View>
    {insightFilter ? <View style={styles.insightFilterBar} accessibilityLiveRegion="polite">
      <View style={styles.insightFilterIcon}><Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} /></View>
      <View style={styles.insightFilterCopy}>
        <AppText variant="metadata" style={styles.insightFilterEyebrow}>ORDERS BEHIND THIS STAT</AppText>
        <AppText variant="surfaceBody">{insightFilter.label}</AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear dashboard stat filter" onPress={clearFilters} style={styles.insightFilterClose}>
        <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
      </Pressable>
    </View> : <>
      <ReceiptHistoryFilters
        search={search}
        selection={selection}
        expanded={filtersExpanded}
        hasOutcomeEvidence={hasOutcomeEvidence}
        resultCount={resultsReady && !searchPending ? total : null}
        resultNoun={resultNoun}
        onSearchChange={setSearch}
        onSelectionChange={next => { setSelection(next); setExpandedId(null); }}
        onToggleExpanded={() => filtersExpanded ? showResults() : setFiltersExpanded(true)}
        onShowResults={showResults}
        onClear={clearFilters}
      />
      {hasFilters && resultsReady && !searchPending ? <AppText variant="metadata" tone="muted" accessibilityLiveRegion="polite">
        {resultCountLabel}{filteredSpend ? ` · ${filteredSpend}` : ''}
      </AppText> : null}
    </>}
  </View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList<Receipt, ReceiptHistorySection>
        ref={listRef}
        style={styles.scroll}
        sections={resultsReady ? sections : []}
        ListHeaderComponent={listHeader}
        renderItem={({ item, index, section }) => (
          <ReceiptReveal
            enabled={Boolean(insightFilter) || hasFilters}
            transitionKey={`${insightFilter?.id ?? 'history'}:${provider}:${dateRange}:${outcomeFilter}:${deferredSearch}`}
            index={receiptIndexes.get(item.id) ?? index}
            reduceMotion={reduceMotion}
            theme={theme}
          >
            <ReceiptCard
              receipt={item}
              expanded={expandedId === item.id}
              first={index === 0}
              last={index === section.data.length - 1}
              formatCurrency={formatCurrency}
              onToggle={(id) => setExpandedId((current) => current === id ? null : id)}
            />
            {item.id === adAnchorId && baseAdEligible && adClaimed && adRuntime.configuration ? (
              <NativeAdPlacement placement="history_after_fifth_order" configurationVersion={adRuntime.configuration.configurationVersion} onImpression={recordAdImpression} />
            ) : null}
          </ReceiptReveal>
        )}
        renderSectionHeader={({ section }) => {
          const summary = section.summary ?? (allResultsLoaded
            ? `${section.data.length} ${resultNoun}${section.data.length === 1 ? '' : 's'}`
            : null);
          return <View style={styles.sectionHeader}>
            <AppText variant="surfaceTitle" style={styles.sectionTitle}>{section.title}</AppText>
            {summary ? <AppText variant="metadata" tone="muted">{summary}</AppText> : null}
          </View>;
        }}
        keyExtractor={(item) => `${insightFilter?.id ?? 'history'}:${item.id}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={listState.id === 'loading' ? <View style={styles.message}><LoadingSpinner text="Loading order history…" /></View> : listState.id === 'error' ? (
          <View style={styles.message}>{retryError}</View>
        ) : <EmptyState
          icon="receipt-outline"
          title={insightFilter ? 'These orders moved' : hasFilters ? hasOutcomeEvidence ? 'No matching records' : 'No matching orders' : 'No orders yet'}
          message={emptyMessage}
          actionText={hasFilters ? 'Clear filters' : 'Add orders'}
          onAction={hasFilters ? clearFilters : () => navigation.open(addHistoryDestination({ returnTo: 'history' }))}
        />}
        ListFooterComponent={receiptsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.colors.primary} />
          : resultsReady && receiptsQuery.isFetchNextPageError ? retryError
          : hasFilters && allResultsLoaded && !searchPending && total > 0 ? <AppText variant="metadata" tone="muted" style={styles.footer}>All matching {resultNoun}s shown</AppText> : null}
        refreshControl={<RefreshControl refreshing={receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage} onRefresh={refresh} tintColor={theme.colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
}

function ReceiptReveal({ enabled, transitionKey, index, reduceMotion, theme, children }: {
  transitionKey: string;
  enabled: boolean;
  index: number;
  reduceMotion: boolean;
  theme: AppTheme;
  children: ReactNode;
}) {
  const progress = useRef(new Animated.Value(enabled && !reduceMotion ? 0 : 1)).current;
  const previousKey = useRef(transitionKey);
  useEffect(() => {
    const changed = previousKey.current !== transitionKey;
    previousKey.current = transitionKey;
    if ((!enabled && !changed) || reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Motion.content,
      delay: index < 4 ? index * 25 : 0,
      easing: Motion.easing,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enabled, index, progress, reduceMotion, transitionKey]);

  return <Animated.View style={{
    borderRadius: Radius.md,
    opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [Motion.distance, 0] }) }],
    backgroundColor: progress.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [theme.colors.alpha(theme.colors.primary, 0.15), theme.colors.alpha(theme.colors.primary, 0.09), theme.colors.alpha(theme.colors.primary, 0)],
    }),
  }}>{children}</Animated.View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  list: { flexGrow: 1, paddingHorizontal: Spacing.page, paddingBottom: Spacing.xl },
  listHeader: { paddingTop: Spacing.control, paddingBottom: Spacing.md, gap: Spacing.section },
  backAction: { alignSelf: 'flex-start' },
  header: { gap: Spacing.xs },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  title: { flexShrink: 1 },
  totals: { gap: Spacing.xs },
  addOrders: { minHeight: 44, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: Radius.control, backgroundColor: theme.colors.surface },
  addOrdersLabel: { fontFamily: FontFamily.medium, flexShrink: 1 },
  insightFilterBar: { minHeight: 62, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.compact, borderRadius: Radius.md, backgroundColor: theme.colors.alpha(theme.colors.primary, 0.08) },
  insightFilterIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: theme.colors.surface },
  insightFilterCopy: { flex: 1 },
  insightFilterEyebrow: { color: theme.colors.primary, fontFamily: FontFamily.medium, fontSize: 10, letterSpacing: 0.7 },
  insightFilterClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.76 },
  sectionHeader: { minHeight: 42, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.background },
  sectionTitle: { fontFamily: FontFamily.medium, flexShrink: 1 },
  footer: { paddingVertical: Spacing.page, textAlign: 'center' },
  message: { paddingVertical: Spacing.xl },
});

export default ReceiptHistoryScreen;
