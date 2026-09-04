import { Ionicons } from '@expo/vector-icons';
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius } from '@constants/theme';
import { useCurrency } from '@contexts/CurrencyContext';
import { useUser } from '@contexts/UserContext';
import { useAnalyticsQuery } from '@hooks/queries/useAnalyticsQueries';
import { useReceiptsQuery } from '@hooks/queries/useReceiptsQuery';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { resolveGmailBaselineState } from '@features/import-flow/gmailBaselineState';
import {
  receiptDateFilters,
  resolveReceiptHistorySections,
  type ReceiptHistoryDateRange,
} from '@features/receipts/receiptHistoryView';
import { ReceiptType } from '@/types/api';
import { ReceiptCard } from './ReceiptCard';
import { AppButton } from '@components/ui/AppButton';
import { EmptyState } from '@components/ui/EmptyState';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { resolveReceiptListState } from '@features/receipts/receiptListState';
import { trackAdminEvent } from '@services/adminAnalytics';
import { DashboardAdPlacement } from '@features/ads/DashboardAdPlacement';
import { isAdEligible } from '@features/ads/contracts';
import { useAdRuntimeConfiguration } from '@features/ads/useAdRuntimeConfiguration';
import { claimAdOpportunity, getDailyAdImpressions, getSessionAdImpressions, isAdSessionSuppressed, recordDailyAdImpression, recordSessionAdImpression } from '@features/ads/adSession';

type ProviderFilter = 'all' | 'uber_eats' | 'doordash';

export function ReceiptHistoryScreen({ showBack = false }: { showBack?: boolean }) {
  const { formatCurrency } = useCurrency();
  const { state } = useUser();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [dateRange, setDateRange] = useState<ReceiptHistoryDateRange>('all');
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [sessionAdImpressions, setSessionAdImpressions] = useState(0);
  const [dailyAdImpressions, setDailyAdImpressions] = useState<number | null>(null);
  const [adClaimed, setAdClaimed] = useState(false);
  const hasTrackedInitialFilters = useRef(false);
  const deferredSearch = useDeferredValue(search.trim());
  const filters = useMemo(() => ({
    ...(provider === 'all' ? {} : { receiptType: provider === 'uber_eats' ? ReceiptType.UBER_EATS : ReceiptType.DOORDASH }),
    ...(deferredSearch ? { restaurantName: deferredSearch } : {}),
    ...receiptDateFilters(dateRange),
  }), [dateRange, deferredSearch, provider]);
  const receiptsQuery = useReceiptsQuery(state.user?.id, { pageSize: 30, filters });
  const analyticsQuery = useAnalyticsQuery(state.user?.id);
  const { preferences } = useImportPreferences(Boolean(state.user?.id));
  const adRuntime = useAdRuntimeConfiguration(state.user?.id);
  const receipts = useMemo(
    () => receiptsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [receiptsQuery.data?.pages],
  );
  const total = receiptsQuery.data?.pages[0]?.pageInfo.total ?? receipts.length;
  const hasFilters = provider !== 'all' || dateRange !== 'all' || Boolean(deferredSearch);
  const adAnchorId = !hasFilters && receipts.length >= 5 ? receipts[4]?.id : null;
  const sections = useMemo(
    () => resolveReceiptHistorySections(
      receipts,
      analyticsQuery.data?.monthlyBreakdown,
      !hasFilters,
    ),
    [analyticsQuery.data?.monthlyBreakdown, hasFilters, receipts],
  );
  const listState = resolveReceiptListState({
    hasUser: Boolean(state.user),
    receipts,
    total,
    isPending: receiptsQuery.isPending,
    isError: receiptsQuery.isError,
    isRefetching: receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage,
  });
  const emptyMessage = hasFilters
    ? 'Try a different restaurant, delivery app, or date range.'
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
      properties: { filter: `${provider}:${dateRange}:${deferredSearch ? 'search' : 'none'}` },
    }).catch(() => undefined);
  }, [dateRange, deferredSearch, provider]);

  const refresh = async () => {
    setExpandedId(null);
    await Promise.all([receiptsQuery.refetch(), analyticsQuery.refetch()]);
  };
  const loadMore = () => {
    if (!receiptsQuery.isFetchingNextPage && receiptsQuery.hasNextPage) {
      void receiptsQuery.fetchNextPage();
    }
  };
  const clearFilters = () => {
    setSearch('');
    setProvider('all');
    setDateRange('all');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {showBack ? <AppButton label="Back" variant="icon" icon="arrow-back" onPress={() => router.back()} /> : null}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR ORDERS</Text>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            {hasFilters
              ? `${total} matching ${total === 1 ? 'order' : 'orders'}`
              : `${analyticsQuery.data?.totalReceipts ?? total} orders · ${formatCurrency(analyticsQuery.data?.totalSpent ?? 0)} tracked`}
          </Text>
        </View>
        <AppButton
          label="Filter orders"
          variant="icon"
          icon="options-outline"
          accessibilityState={{ expanded: showDateFilters }}
          onPress={() => setShowDateFilters(current => !current)}
        />
      </View>

      {showDateFilters ? <View style={styles.controls}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants"
            placeholderTextColor={Colors.gray500}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search restaurants"
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray500} />
            </Pressable>
          ) : null}
        </View>
      </View> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={provider === 'all'} onPress={() => setProvider('all')} />
        <FilterChip label="Uber Eats" selected={provider === 'uber_eats'} onPress={() => setProvider('uber_eats')} />
        <FilterChip label="DoorDash" selected={provider === 'doordash'} onPress={() => setProvider('doordash')} />
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => router.push('/data-tracking')} style={styles.coverageLink}>
        <Text style={styles.coverageLinkText}>Check coverage or import missing orders</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
      </Pressable>
      {showDateFilters ? (
        <View style={styles.dateFilters} accessibilityLabel="Date range filters">
          <FilterChip label="All dates" selected={dateRange === 'all'} onPress={() => setDateRange('all')} />
          <FilterChip label="This month" selected={dateRange === 'this_month'} onPress={() => setDateRange('this_month')} />
          <FilterChip label="Last 3 months" selected={dateRange === 'last_3_months'} onPress={() => setDateRange('last_3_months')} />
        </View>
      ) : null}

      {listState.id === 'loading' ? <LoadingSpinner text="Loading order history…" /> : listState.id === 'error' ? (
        <View style={styles.message}><ErrorMessage error="We couldn’t load your order history." type="network" onRetry={() => { void receiptsQuery.refetch(); }} /></View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={({ item }) => (
            <Fragment>
              <ReceiptCard
                receipt={item}
                expanded={expandedId === item.id}
                formatCurrency={formatCurrency}
                onToggle={(id) => setExpandedId((current) => current === id ? null : id)}
              />
              {item.id === adAnchorId && baseAdEligible && adClaimed && adRuntime.configuration ? (
                <DashboardAdPlacement placement="history_after_fifth_order" configurationVersion={adRuntime.configuration.configurationVersion} onImpression={recordAdImpression} />
              ) : null}
            </Fragment>
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.summary ? <Text style={styles.sectionSummary}>{section.summary}</Text> : null}
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, sections.length === 0 && styles.emptyList]}
          ListEmptyComponent={(
            <EmptyState
              icon="receipt-outline"
              title={hasFilters ? 'No matching orders' : 'No orders yet'}
              message={emptyMessage}
              actionText={hasFilters ? 'Clear filters' : 'Import missing orders'}
              onAction={hasFilters ? clearFilters : () => router.push('/data-tracking')}
            />
          )}
          ListFooterComponent={receiptsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={Colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage} onRefresh={refresh} tintColor={Colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: Colors.textPrimary, fontSize: 31, fontWeight: '600', letterSpacing: -0.4 },
  subtitle: { marginTop: 3, color: Colors.textSecondary, fontSize: 12 },
  controls: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  searchField: { flex: 1, minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: Colors.gray250, borderRadius: Radius.input, backgroundColor: Colors.surface },
  searchInput: { flex: 1, minHeight: 46, color: Colors.textPrimary, fontSize: 16 },
  chips: { minHeight: 58, alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  coverageLink: { minHeight: 40, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, backgroundColor: Colors.alpha(Colors.primary, 0.08) },
  coverageLinkText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  chip: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.chipInactiveBg },
  chipSelected: { backgroundColor: Colors.chipActiveBg },
  chipText: { color: Colors.chipInactiveText, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: Colors.chipActiveText },
  pressed: { opacity: 0.76 },
  dateFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  emptyList: { justifyContent: 'center' },
  sectionHeader: { minHeight: 42, paddingTop: 8, paddingBottom: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: Colors.background },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  sectionSummary: { color: Colors.textSecondary, fontSize: 12 },
  footer: { paddingVertical: 18 },
  message: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
});

export default ReceiptHistoryScreen;
