import { formatReceiptMoney } from '@utils/receiptMoney';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FontFamily, Radius, Spacing, type AppTheme } from '@constants/theme';
import { Motion } from '@constants/motion';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { useAppTheme } from '@contexts/AppearanceContext';
import { DataSource, ReceiptType, type Receipt, type ReceiptItem } from '@/types/api';
import { AnimatedDisclosure } from '@components/ui/AnimatedDisclosure';
import { AppText } from '@components/ui/AppText';
import { receiptHistoryDay, receiptOutcomePresentation } from '@features/receipts/receiptOutcomePresentation';

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

export const receiptItemPricePresentation = (
  item: ReceiptItem,
  displayMoney: (value: number) => string,
): { primary: string; secondary?: string; accessibility: string } | null => {
  if (item.recordedPrice !== undefined)
    return { primary: displayMoney(item.recordedPrice), secondary: 'Recorded price', accessibility: `${displayMoney(item.recordedPrice)}, recorded price` };
  if (item.price <= 0) return null;
  if (item.quantity > 1)
    return item.configuredLineTotal === undefined
      ? { primary: `${displayMoney(item.price)} each`, accessibility: `${displayMoney(item.price)} each` }
      : { primary: `${displayMoney(item.price)} each`, secondary: `Line total ${displayMoney(item.configuredLineTotal)}`, accessibility: `${displayMoney(item.price)} each, line total ${displayMoney(item.configuredLineTotal)}` };
  return { primary: displayMoney(item.price), accessibility: displayMoney(item.price) };
};

export function ReceiptCard({ receipt, expanded, first = true, last = true, formatCurrency, onToggle }: ReceiptCardProps) {
  const theme = useAppTheme();
  const reduceMotion = useAppReducedMotion();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const source = sourcePresentation(receipt, theme);
  const displayMoney = (value: number) => formatReceiptMoney(value, receipt.currencyCode, formatCurrency);
  const hasItems = receipt.items.length > 0;
  const outcome = receiptOutcomePresentation(receipt, formatCurrency);
  const hasDetails = hasItems || Boolean(receipt.orderOutcome);
  const restaurantName = receipt.restaurantName ?? 'Unknown restaurant';
  const day = receiptHistoryDay(receipt);
  const date = day
    ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unavailable';
  const shortDate = day
    ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
    : 'Date unavailable';
  return (
    <Pressable
      accessibilityRole={hasDetails ? 'button' : undefined}
      accessibilityLabel={[restaurantName, outcome.amount, outcome.amountLabel, date, source.label, outcome.status, outcome.notice, outcome.sourceLabel,
        expanded ? outcome.details.map(detail => `${detail.label}: ${detail.value}`).join(', ') : undefined,
        expanded ? receipt.items.map(item => {
          const price = receiptItemPricePresentation(item, displayMoney);
          return `${item.quantity} × ${item.name}${item.customizations?.length ? `, ${item.customizations.join(', ')}` : ''}${price ? `, ${price.accessibility}` : ''}`;
        }).join('; ') : undefined,
      ].filter(Boolean).join(', ')}
      accessibilityState={hasDetails ? { expanded } : undefined}
      accessibilityHint={hasDetails ? expanded ? 'Hide order details' : 'Show order details' : 'Item details are not available for this order.'}
      onPress={() => hasDetails && onToggle(receipt.id)}
      disabled={!hasDetails}
      style={({ pressed }) => [pressed && hasDetails && styles.pressed, pressed && hasDetails && !reduceMotion && styles.pressedScale]}
    >
      <View style={[styles.card, first && styles.firstCard, last && styles.lastCard]}>
        <View style={styles.header}>
          <View style={[styles.providerIcon, { backgroundColor: theme.colors.alpha(source.accent, 0.12) }]}>
            <Ionicons name={source.icon} size={20} color={source.accent} />
          </View>
          <View style={styles.info}>
            <AppText variant="rowTitle" style={styles.restaurant}>{restaurantName}</AppText>
            <AppText variant="metadata" tone="muted" style={styles.meta}>{shortDate} · {source.label}</AppText>
          </View>
          <View style={styles.amountColumn}>
            <AppText variant="rowTitle" style={styles.amount}>{outcome.amount}</AppText>
            {outcome.amountLabel ? <AppText variant="metadata" tone="muted" style={styles.source}>{outcome.amountLabel}</AppText> : null}
          </View>
          {hasDetails ? <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={18} color={theme.colors.textSecondary} /> : null}
        </View>
        {outcome.status ? <AppText variant="metadata" style={styles.meta}>{outcome.status}</AppText> : null}
        {!receipt.orderOutcome && receipt.evidenceSummary ? <AppText variant="metadata" style={styles.meta}>{receipt.evidenceSummary}</AppText> : null}
        {outcome.notice ? <AppText variant="metadata" style={styles.meta}>{outcome.notice}</AppText> : null}
        <AnimatedDisclosure expanded={expanded}>
          {outcome.sourceLabel ? <AppText variant="metadata" style={styles.meta}>{outcome.sourceLabel}</AppText> : null}
          {receipt.orderOutcome ? <View style={styles.items}>
            <AppText variant="surfaceBody">Payments & adjustments</AppText>
            {outcome.details.map((detail, index) => <View key={`${detail.label}-${index}`} style={styles.itemRow}>
              <AppText variant="metadata" style={styles.itemDetails}>{detail.label}</AppText>
              <AppText variant="metadata">{detail.value}</AppText>
            </View>)}
          </View> : null}
          {hasItems ? (
            <View style={styles.items}>
              <AppText variant="metadata" tone="muted">{receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}</AppText>
              {receipt.items.map((item, index) => {
                const price = receiptItemPricePresentation(item, displayMoney);
                return <View key={`${receipt.id}-${index}`} style={styles.itemRow}>
                  <View style={styles.itemDetails}><AppText variant="surfaceBody" style={styles.itemName}>{item.name}</AppText><AppText variant="metadata" style={styles.quantity}>Qty: {item.quantity}{item.inferred ? ' · Estimated' : ''}</AppText>{item.customizations?.length ? <AppText variant="metadata">{item.customizations.join(' · ')}</AppText> : null}</View>
                  {price ? <View style={styles.itemPriceColumn}><AppText variant="surfaceBody" style={styles.itemPrice}>{price.primary}</AppText>{price.secondary ? <AppText variant="metadata" style={styles.itemPriceNote}>{price.secondary}</AppText> : null}</View> : null}
                </View>;
              })}
            </View>
          ) : null}
          {!hasItems ? <AppText variant="metadata" tone="muted" style={styles.meta}>{receipt.dataSource === DataSource.EMAIL ? 'Item details are not available from this email receipt.' : 'No item details available.'}</AppText> : null}
        </AnimatedDisclosure>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  pressed: { opacity: 0.72 },
  pressedScale: { transform: [{ scale: Motion.pressedScale }] },
  card: { padding: Spacing.control, minHeight: 76, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider, borderBottomWidth: 0 },
  firstCard: { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
  lastCard: { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card, borderBottomWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  providerIcon: { width: 40, height: 40, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  restaurant: { fontFamily: FontFamily.medium },
  meta: { marginTop: Spacing.xs },
  amountColumn: { maxWidth: '34%', alignItems: 'flex-end' },
  amount: { fontFamily: FontFamily.medium, textAlign: 'right' },
  source: { marginTop: Spacing.xs, textAlign: 'right' },
  items: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.gray100 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.gray50 },
  itemDetails: { flex: 1, marginRight: 12 },
  itemName: { fontFamily: FontFamily.medium, marginBottom: 4 },
  quantity: {},
  itemPrice: { color: theme.colors.primary, fontFamily: FontFamily.medium },
  itemPriceColumn: { alignItems: 'flex-end', maxWidth: '42%' },
  itemPriceNote: { marginTop: 4, textAlign: 'right' },
});
