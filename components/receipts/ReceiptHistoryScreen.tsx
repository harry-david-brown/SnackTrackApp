import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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

type ProviderFilter = 'all' | 'uber_eats' | 'doordash';

export function ReceiptHistoryScreen({ showBack = false }: { showBack?: boolean }) {
  const { formatCurrency } = useCurrency();
  const { state } = useUser();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [dateRange, setDateRange] = useState<ReceiptHistoryDateRange>('all');
  const [showDateFilters, setShowDateFilters] = useState(false);
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
  const receipts = useMemo(
    () => receiptsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [receiptsQuery.data?.pages],
  );
  const total = receiptsQuery.data?.pages[0]?.pageInfo.total ?? receipts.length;
  const hasFilters = provider !== 'all' || dateRange !== 'all' || Boolean(deferredSearch);
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
      ? 'Your email scan found no supported delivery orders. Check again later or add history from Uber Eats or DoorDash.'
      : 'Connect Gmail or Outlook and run a history scan, or add Uber Eats or DoorDash history another way.';

  useEffect(() => {
    void trackAdminEvent('history_viewed').catch(() => undefined);
  }, []);

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
          <Text style={styles.title}>Order history</Text>
          <Text style={styles.subtitle}>
            {hasFilters
              ? `${total} matching ${total === 1 ? 'order' : 'orders'}`
              : `${analyticsQuery.data?.totalReceipts ?? total} orders · ${formatCurrency(analyticsQuery.data?.totalSpent ?? 0)}`}
          </Text>
        </View>
        <AppButton
          label="Add history"
          variant="secondary"
          icon="add"
          onPress={() => router.push('/(tabs)/upload')}
        />
      </View>

      <View style={styles.controls}>
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
        <AppButton
          label={showDateFilters ? 'Hide date filters' : 'Filter by date'}
          variant="icon"
          icon="options-outline"
          accessibilityState={{ expanded: showDateFilters }}
          onPress={() => setShowDateFilters((current) => !current)}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={provider === 'all'} onPress={() => setProvider('all')} />
        <FilterChip label="Uber Eats" selected={provider === 'uber_eats'} onPress={() => setProvider('uber_eats')} />
        <FilterChip label="DoorDash" selected={provider === 'doordash'} onPress={() => setProvider('doordash')} />
      </ScrollView>
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
            <ReceiptCard
              receipt={item}
              expanded={expandedId === item.id}
              formatCurrency={formatCurrency}
              onToggle={(id) => setExpandedId((current) => current === id ? null : id)}
            />
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
              actionText={hasFilters ? 'Clear filters' : 'Add order history'}
              onAction={hasFilters ? clearFilters : () => router.push('/(tabs)/upload')}
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
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  title: { color: Colors.textPrimary, fontSize: 25, fontWeight: '800' },
  subtitle: { marginTop: 3, color: Colors.textSecondary, fontSize: 12 },
  controls: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  searchField: { flex: 1, minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: Colors.gray250, borderRadius: Radius.input, backgroundColor: Colors.surface },
  searchInput: { flex: 1, minHeight: 46, color: Colors.textPrimary, fontSize: 16 },
  chips: { minHeight: 58, alignItems: 'center', gap: 8, paddingHorizontal: 16 },
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
