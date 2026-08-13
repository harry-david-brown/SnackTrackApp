import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import { DataSource, ReceiptType, type Receipt } from '@/types/api';
import { Card } from '@components/ui/Card';
import { StatusBadge } from '@components/ui/StatusBadge';

const sourcePresentation = (receipt: Receipt) => {
  if (receipt.receiptType === ReceiptType.UBER_EATS) return { label: 'Uber Eats', icon: 'car-outline' as const };
  if (receipt.receiptType === ReceiptType.DOORDASH) return { label: 'DoorDash', icon: 'bicycle-outline' as const };
  return receipt.dataSource === DataSource.EMAIL
    ? { label: 'Email', icon: 'mail-outline' as const }
    : { label: 'Export', icon: 'document-outline' as const };
};

interface ReceiptCardProps {
  receipt: Receipt;
  expanded: boolean;
  formatCurrency: (value: number) => string;
  onToggle: (id: string) => void;
}

export function ReceiptCard({ receipt, expanded, formatCurrency, onToggle }: ReceiptCardProps) {
  const source = sourcePresentation(receipt);
  const hasItems = receipt.items.length > 0;
  const date = new Date(receipt.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <Pressable
      accessibilityRole={hasItems ? 'button' : undefined}
      accessibilityLabel={`${receipt.restaurantName}, ${formatCurrency(receipt.amountSpent)}, ${date}, ${source.label}`}
      accessibilityState={hasItems ? { expanded } : undefined}
      onPress={() => hasItems && onToggle(receipt.id)}
      disabled={!hasItems}
      style={({ pressed }) => [pressed && hasItems && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.restaurant} numberOfLines={2}>{receipt.restaurantName}</Text>
            <View style={styles.dateRow}><Ionicons name="calendar-outline" size={14} color={Colors.gray500} /><Text style={styles.date}>{date}</Text></View>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amount} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>{formatCurrency(receipt.amountSpent)}</Text>
            <StatusBadge label={source.label} tone="optional" />
          </View>
        </View>
        <View style={styles.itemsHeader}>
          <Text style={hasItems ? styles.itemCount : styles.unavailable}>
            {hasItems ? `${receipt.items.length} ${receipt.items.length === 1 ? 'item' : 'items'}` : receipt.dataSource === DataSource.EMAIL ? 'Item details not available from email import' : 'No items'}
          </Text>
          {hasItems ? <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} /> : null}
        </View>
        {hasItems && expanded ? (
          <View style={styles.items}>
            {receipt.items.map((item, index) => (
              <View key={`${receipt.id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemDetails}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.quantity}>Qty: {item.quantity}</Text></View>
                {item.price > 0 ? <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  card: { padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, marginRight: 12 },
  restaurant: { fontSize: 18, fontWeight: '600', color: Colors.inkStrong, marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 14, color: Colors.gray500 },
  amountColumn: { maxWidth: '46%', alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  itemCount: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  unavailable: { flex: 1, fontSize: 13, color: Colors.gray500, fontStyle: 'italic' },
  items: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  itemDetails: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, color: Colors.inkStrong, fontWeight: '500', marginBottom: 4 },
  quantity: { fontSize: 13, color: Colors.gray500 },
  itemPrice: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
