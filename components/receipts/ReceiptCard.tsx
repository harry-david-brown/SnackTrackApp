import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FontFamily, Radius, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { DataSource, ReceiptType, type Receipt } from '@/types/api';
import { AppText } from '@components/ui/AppText';

const sourcePresentation = (receipt: Receipt, theme: AppTheme) => {
  if (receipt.receiptType === ReceiptType.UBER_EATS) return { label: 'Uber Eats', icon: 'car-outline' as const, accent: theme.colors.uberDark };
  if (receipt.receiptType === ReceiptType.DOORDASH) return { label: 'DoorDash', icon: 'bicycle-outline' as const, accent: theme.colors.doorDash };
  return receipt.dataSource === DataSource.EMAIL
    ? { label: 'Email', icon: 'mail-outline' as const, accent: theme.colors.primary }
    : { label: 'History file', icon: 'document-outline' as const, accent: theme.colors.primary };
};

interface ReceiptCardProps {
  receipt: Receipt;
  expanded: boolean;
  first?: boolean;
  last?: boolean;
  formatCurrency: (value: number) => string;
  onToggle: (id: string) => void;
}

export function ReceiptCard({ receipt, expanded, first = true, last = true, formatCurrency, onToggle }: ReceiptCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const source = sourcePresentation(receipt, theme);
  const hasItems = receipt.items.length > 0;
  const restaurantName = receipt.restaurantName ?? 'Unknown restaurant';
  const date = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unavailable';
  return (
    <Pressable
      accessibilityRole={hasItems ? 'button' : undefined}
      accessibilityLabel={`${restaurantName}, ${formatCurrency(receipt.amountSpent)}, ${date}, ${source.label}`}
      accessibilityState={hasItems ? { expanded } : undefined}
      onPress={() => hasItems && onToggle(receipt.id)}
      disabled={!hasItems}
      style={({ pressed }) => [pressed && hasItems && styles.pressed]}
    >
      <View style={[styles.card, first && styles.firstCard, last && styles.lastCard]}>
        <View style={styles.header}>
          <View style={[styles.providerIcon, { backgroundColor: theme.colors.alpha(source.accent, 0.12) }]}>
            <Ionicons name={source.icon} size={20} color={source.accent} />
          </View>
          <View style={styles.info}>
            <AppText variant="rowTitle" style={styles.restaurant} numberOfLines={2}>{restaurantName}</AppText>
            <AppText variant="metadata" style={styles.meta}>{date} · {hasItems ? `${receipt.items.length} ${receipt.items.length === 1 ? 'item' : 'items'}` : source.label}</AppText>
          </View>
          <View style={styles.amountColumn}>
            <AppText variant="rowTitle" style={styles.amount} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>{formatCurrency(receipt.amountSpent)}</AppText>
            <AppText variant="metadata" style={styles.source}>{source.label}</AppText>
          </View>
        </View>
        {hasItems ? <View style={styles.expandHint}><AppText variant="metadata" style={styles.expandText}>{expanded ? 'Hide item details' : 'Show item details'}</AppText><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textSecondary} /></View> : (
          <AppText variant="metadata" style={styles.unavailable}>{receipt.dataSource === DataSource.EMAIL ? 'Item details are not available from this email receipt.' : 'No item details available.'}</AppText>
        )}
        {hasItems && expanded ? (
          <View style={styles.items}>
            {receipt.items.map((item, index) => (
              <View key={`${receipt.id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemDetails}><AppText variant="surfaceBody" style={styles.itemName}>{item.name}</AppText><AppText variant="metadata" style={styles.quantity}>Qty: {item.quantity}</AppText></View>
                {item.price > 0 ? <AppText variant="surfaceBody" style={styles.itemPrice}>{formatCurrency(item.price)}</AppText> : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  card: { padding: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider, borderBottomWidth: 0 },
  firstCard: { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
  lastCard: { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card, borderBottomWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  providerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  restaurant: { fontFamily: FontFamily.medium },
  meta: { marginTop: 4 },
  amountColumn: { maxWidth: '34%', alignItems: 'flex-end' },
  amount: { fontFamily: FontFamily.medium },
  source: { marginTop: 4 },
  expandHint: { minHeight: 36, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.colors.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  expandText: { fontFamily: FontFamily.medium },
  unavailable: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.colors.gray100 },
  items: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.gray100 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.gray50 },
  itemDetails: { flex: 1, marginRight: 12 },
  itemName: { fontFamily: FontFamily.medium, marginBottom: 4 },
  quantity: {},
  itemPrice: { color: theme.colors.primary, fontFamily: FontFamily.medium },
});
