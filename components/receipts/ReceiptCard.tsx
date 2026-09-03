import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';
import { DataSource, ReceiptType, type Receipt } from '@/types/api';
import { Card } from '@components/ui/Card';

const sourcePresentation = (receipt: Receipt) => {
  if (receipt.receiptType === ReceiptType.UBER_EATS) return { label: 'Uber Eats', icon: 'car-outline' as const, accent: Colors.uberDark };
  if (receipt.receiptType === ReceiptType.DOORDASH) return { label: 'DoorDash', icon: 'bicycle-outline' as const, accent: Colors.doorDash };
  return receipt.dataSource === DataSource.EMAIL
    ? { label: 'Email', icon: 'mail-outline' as const, accent: Colors.primary }
    : { label: 'History file', icon: 'document-outline' as const, accent: Colors.primary };
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
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.providerIcon, { backgroundColor: Colors.alpha(source.accent, 0.12) }]}>
            <Ionicons name={source.icon} size={20} color={source.accent} />
          </View>
          <View style={styles.info}>
            <Text style={styles.restaurant} numberOfLines={2}>{restaurantName}</Text>
            <Text style={styles.meta}>{date} · {hasItems ? `${receipt.items.length} ${receipt.items.length === 1 ? 'item' : 'items'}` : source.label}</Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amount} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>{formatCurrency(receipt.amountSpent)}</Text>
            <Text style={styles.source}>{source.label}</Text>
          </View>
        </View>
        {hasItems ? <View style={styles.expandHint}><Text style={styles.expandText}>{expanded ? 'Hide item details' : 'Show item details'}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} /></View> : (
          <Text style={styles.unavailable}>{receipt.dataSource === DataSource.EMAIL ? 'Item details are not available from this email receipt.' : 'No item details available.'}</Text>
        )}
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
  card: { padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  providerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  restaurant: { fontSize: 16, fontWeight: '700', color: Colors.inkStrong },
  meta: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  amountColumn: { maxWidth: '34%', alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  source: { marginTop: 4, fontSize: 11, color: Colors.textSecondary },
  expandHint: { minHeight: 36, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: Colors.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  expandText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  unavailable: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: Colors.gray100, fontSize: 12, lineHeight: 17, color: Colors.gray500 },
  items: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  itemDetails: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, color: Colors.inkStrong, fontWeight: '500', marginBottom: 4 },
  quantity: { fontSize: 13, color: Colors.gray500 },
  itemPrice: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
