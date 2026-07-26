import { Colors } from '@/constants/theme';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Pressable,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { receiptApi } from '../services/api';
import { Receipt, DataSource } from '../types/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useUser } from '../contexts/UserContext';

export default function ReceiptsScreen() {
  const { formatCurrency } = useCurrency();
  const { state } = useUser();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [totalReceipts, setTotalReceipts] = useState<number>(0);

  const ITEMS_PER_PAGE = 20;

  const fetchReceipts = async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (!state.user?.id) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      if (!append) {
        setLoading(true);
        // Reset expanded receipt when refreshing
        setExpandedReceiptId(null);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const offset = pageNum * ITEMS_PER_PAGE;
      const response = await receiptApi.getReceipts(state.user.id, ITEMS_PER_PAGE, offset);
      
      if (append) {
        setReceipts(prev => [...prev, ...response.data]);
      } else {
        setReceipts(response.data);
      }

      // Update total count from pagination
      if (response.pagination?.total !== undefined) {
        setTotalReceipts(response.pagination.total);
      }

      // Check if we have more items to load
      setHasMore(response.data.length === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (state.user?.id) {
      fetchReceipts(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReceipts(0, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReceipts(page + 1, true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReceiptTypeLabel = (receipt: Receipt): string => {
    // Use receiptType if available, otherwise fall back to dataSource
    if (receipt.receiptType) {
      switch (receipt.receiptType) {
        case 'uber_eats':
          return 'UberEats';
        case 'doordash':
          return 'DoorDash';
        default:
          // If receiptType exists but is unknown, fall back to dataSource
          return receipt.dataSource === DataSource.EMAIL ? 'Email' : 'CSV';
      }
    }
    // Fallback to dataSource for backward compatibility
    return receipt.dataSource === DataSource.EMAIL ? 'Email' : 'CSV';
  };

  const getReceiptTypeIcon = (receipt: Receipt): string => {
    if (receipt.receiptType) {
      switch (receipt.receiptType) {
        case 'uber_eats':
          return 'car-outline';
        case 'doordash':
          return 'bicycle-outline';
      default:
        return 'receipt-outline';
    }
    }
    // Fallback to dataSource icons
    return receipt.dataSource === DataSource.EMAIL ? 'mail-outline' : 'document-outline';
  };

  const getReceiptTypeColor = (receipt: Receipt): string => {
    if (receipt.receiptType) {
      switch (receipt.receiptType) {
        case 'uber_eats':
          return Colors.uber; // UberEats green (from UberDataTutorial)
        case 'doordash':
          return Colors.doorDash; // DoorDash red
      default:
        return Colors.textSecondary;
    }
    }
    // Fallback to dataSource colors
    return receipt.dataSource === DataSource.EMAIL ? Colors.success : Colors.info;
  };

  const toggleExpanded = (receiptId: string) => {
    setExpandedReceiptId((current) => {
      // Use functional update to ensure we have the latest state
      return current === receiptId ? null : receiptId;
    });
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    // Only check expansion if item has a valid ID
    const isExpanded = item.id && expandedReceiptId === item.id;
    // Ensure items is an array
    const items = Array.isArray(item.items) ? item.items : [];
    const hasItems = items.length > 0;

    return (
      <Pressable 
        style={({ pressed }) => [
          styles.receiptCard,
          hasItems && pressed && styles.receiptCardPressed
        ]}
        onPress={() => {
          if (hasItems && item.id) {
            toggleExpanded(item.id);
          }
        }}
        disabled={!hasItems}
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {item.restaurantName || 'Unknown Restaurant'}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.gray500} />
              <Text style={styles.dateText}>{formatDate(item.orderDate)}</Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatCurrency(item.amountSpent)}</Text>
            <View style={[styles.sourceBadge, { backgroundColor: getReceiptTypeColor(item) }]}>
              <Ionicons 
                name={getReceiptTypeIcon(item) as any} 
                size={12} 
                color={Colors.white}
              />
              <Text style={styles.sourceBadgeText}>
                {getReceiptTypeLabel(item)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.itemsHeaderRow}>
          {hasItems ? (
            <>
              <Text style={styles.itemsCountText}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.textSecondary}
              />
            </>
          ) : (
            <Text style={styles.itemsUnavailableText}>
              {item.dataSource === DataSource.EMAIL 
                ? 'Item details not available from email import'
                : 'No items'}
            </Text>
          )}
        </View>
        
        {hasItems && isExpanded && (
          <View style={styles.itemsContainer}>
            {items.map((receiptItem, index) => {
              // Ensure we're working with primitive values
              const itemName = typeof receiptItem?.name === 'string' ? receiptItem.name : 'Unknown item';
              const itemQuantity = typeof receiptItem?.quantity === 'number' ? receiptItem.quantity : 1;
              const itemPrice = typeof receiptItem?.price === 'number' ? receiptItem.price : 0;
              
              // Use a unique key combining receipt ID and index
              const uniqueKey = `${item.id}-item-${index}`;
              
              return (
                <View key={uniqueKey} style={styles.itemRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {itemName}
                    </Text>
                    <Text style={styles.itemQuantity}>
                      Qty: {itemQuantity}
                    </Text>
                  </View>
                  {itemPrice > 0 && (
                    <Text style={styles.itemPrice}>
                      {formatCurrency(itemPrice)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={Colors.gray400} />
      <Text style={styles.emptyTitle}>No receipts yet</Text>
      <Text style={styles.emptyText}>
        Connect Gmail to start importing receipts, or upload a full export for deeper history
      </Text>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => router.push('/(tabs)/upload')}
      >
        <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
        <Text style={styles.uploadButtonText}>Import Receipts</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  if (!state.user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading user...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            // Navigate to profile tab, or go back if there's a history
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Receipts</Text>
          <Text style={styles.headerSubtitle}>
            {totalReceipts > 0 ? totalReceipts : receipts.length} {totalReceipts > 0 ? (totalReceipts === 1 ? 'receipt' : 'receipts') : (receipts.length === 1 ? 'receipt' : 'receipts')}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={Colors.error} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchReceipts(0, false)}
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={receipts}
          renderItem={renderReceipt}
          keyExtractor={(item, index) => item.id || `receipt-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray250,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.inkStrong,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.inkStrong,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  receiptCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    cursor: 'pointer',
  },
  receiptCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.inkStrong,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.gray500,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sourceBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  itemsCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  itemsUnavailableText: {
    fontSize: 13,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  itemsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    color: Colors.inkStrong,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: Colors.gray500,
  },
  itemPrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.inkStrong,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
