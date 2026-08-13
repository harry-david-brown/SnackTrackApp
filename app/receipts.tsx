import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../constants/theme';
import { useCurrency } from '../contexts/CurrencyContext';
import { useUser } from '../contexts/UserContext';
import { useReceiptsQuery } from '../hooks/queries/useReceiptsQuery';
import { ReceiptCard } from '../components/receipts/ReceiptCard';
import { AppButton } from '../components/ui/AppButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function ReceiptsScreen() {
  const { formatCurrency } = useCurrency();
  const { state } = useUser();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const receiptsQuery = useReceiptsQuery(state.user?.id, 20);
  const receipts = receiptsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const total = receiptsQuery.data?.pages[0]?.pagination.total ?? receipts.length;

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile');
  const refresh = async () => { setExpandedId(null); await receiptsQuery.refetch(); };
  const loadMore = () => { if (!receiptsQuery.isFetchingNextPage && receiptsQuery.hasNextPage) void receiptsQuery.fetchNextPage(); };

  if (!state.user) return <SafeAreaView style={styles.container}><LoadingSpinner text="Loading user…" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppButton label="Back" variant="icon" icon="arrow-back" onPress={goBack} />
        <View style={styles.headerCopy}><Text style={styles.title}>My Receipts</Text><Text style={styles.subtitle}>{total} {total === 1 ? 'receipt' : 'receipts'}</Text></View>
        <View style={styles.spacer} />
      </View>
      {receiptsQuery.isPending ? <LoadingSpinner text="Loading receipts…" /> : receiptsQuery.isError ? (
        <View style={styles.message}><ErrorMessage error="Failed to load receipts. Please try again." type="network" onRetry={() => { void receiptsQuery.refetch(); }} /></View>
      ) : (
        <FlatList
          data={receipts}
          renderItem={({ item }) => <ReceiptCard receipt={item} expanded={expandedId === item.id} formatCurrency={formatCurrency} onToggle={(id) => setExpandedId((current) => current === id ? null : id)} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No receipts yet" message="Connect Gmail to start importing receipts, or upload a full export for deeper history." actionText="Import Receipts" onAction={() => router.push('/(tabs)/upload')} />}
          ListFooterComponent={receiptsQuery.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={receiptsQuery.isRefetching && !receiptsQuery.isFetchingNextPage} onRefresh={refresh} tintColor={Colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.gray250 },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.inkStrong },
  subtitle: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  spacer: { width: 48 },
  list: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  message: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
});
