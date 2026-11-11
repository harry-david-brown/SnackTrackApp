import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@constants/theme';
import type { RecapEvidence, RecapEvidenceOrder } from '@/types/recap';
import { recapOrderTime } from './RecapDayOrders';
import { styles } from './wrappedStyles';

const money = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
const orderMoney = (order: RecapEvidenceOrder, currency: string) => order.amount === undefined ? '' : `${order.approximate ? '≈' : ''}${money(order.amount, currency)}`;
const shortDate = (date?: string) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : '';
const itemText = (item: { name: string; quantity: number }) => `${item.quantity}× ${item.name}`;

export function recapEvidenceText(evidence: RecapEvidence | undefined, currency: string): string {
  if (!evidence) return '';
  const gap = evidence.kind === 'streak' && evidence.total > evidence.orders.length ? `${evidence.total - evidence.orders.length} intervening days omitted from the timeline. ` : '';
  return gap + evidence.orders.map(order => [order.restaurant, order.date, order.localTime && recapOrderTime(order.localTime), orderMoney(order, currency), order.items?.map(itemText).join(', ')].filter(Boolean).join('. ')).join('. ');
}

export function RecapEvidencePanel({ evidence, currency, showReceiptHeader = true }: {
  evidence: RecapEvidence; currency: string; showReceiptHeader?: boolean;
}) {
  const first = evidence.orders[0];
  if (!first) return null;
  if (evidence.kind === 'receipt' || evidence.kind === 'items') {
    const items = first.items ?? [];
    if (!showReceiptHeader && !items.length) return null;
    return <View style={styles.dayOrders}>
      {showReceiptHeader ? <View style={styles.dayOrderRow}>
        <Text style={styles.dayOrderRestaurant} numberOfLines={1}>{first.restaurant}</Text>
        {first.localTime ? <Text style={styles.dayOrderTime}>{recapOrderTime(first.localTime)}</Text> : null}
      </View> : null}
      {items.slice(0, 4).map((item, index) => <View key={index} style={[styles.dayOrderRow, (showReceiptHeader || index > 0) && styles.dayOrderDivider]}>
        <Text style={styles.evidenceItem} numberOfLines={1}>{itemText(item)}</Text>
      </View>)}
      {items.length > 4 ? <Text style={styles.dayOrdersRemaining}>+{items.length - 4} more item lines</Text> : null}
      {showReceiptHeader && evidence.kind === 'receipt' && first.amount !== undefined ? <View style={[styles.dayOrderRow, styles.dayOrderDivider]}>
        <Text style={styles.dayOrderRestaurant}>Net order amount</Text>
        <Text style={styles.dayOrderTime}>{orderMoney(first, currency)}</Text>
      </View> : null}
    </View>;
  }
  const title = { 'late-night': 'A few after-hours orders', spending: 'Biggest orders that week', 'single-items': 'A few solo orders', streak: 'A delivery every day' }[evidence.kind];
  return <View style={styles.dayOrders}>
    <Text style={styles.evidenceHeading}>{title}</Text>
    {evidence.orders.map((order, index) => <React.Fragment key={order.id}>
      {evidence.kind === 'streak' && evidence.total > evidence.orders.length && index === 3 ? <View style={styles.evidenceTimelineBreak} accessible accessibilityLabel={`${evidence.total - evidence.orders.length} intervening days omitted from the timeline`}>
        <Svg width={12} height={18} accessible={false}>
          <Path d="M6 0 L6 3 L2 6 L10 12 L6 15 L6 18" fill="none" stroke={Colors.mascotHighlight} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View> : null}
      <View style={[styles.dayOrderRow, index > 0 && evidence.kind !== 'streak' && styles.dayOrderDivider, evidence.kind === 'streak' && styles.evidenceTimelineRow]}>
        {evidence.kind === 'streak' ? <>
          <View style={styles.evidenceTimelineRail} pointerEvents="none" accessible={false}>
            {index > 0 ? <View style={[styles.evidenceTimelineLine, styles.evidenceTimelineLineAbove]} /> : null}
            {index < evidence.orders.length - 1 ? <View style={[styles.evidenceTimelineLine, styles.evidenceTimelineLineBelow]} /> : null}
            <View style={styles.evidenceTimelineDot} />
          </View>
          <Text style={styles.evidenceTimelineDate}>{shortDate(order.date)}</Text>
          <Text style={styles.dayOrderRestaurant} numberOfLines={1}>{order.restaurant}</Text>
        </> : <>
          <View style={styles.evidenceRowBody}>
            <Text style={styles.evidenceRowTitle} numberOfLines={1}>{evidence.kind === 'single-items' ? order.items?.map(itemText).join(', ') : order.restaurant}</Text>
            <Text style={styles.evidenceCaption} numberOfLines={1}>{evidence.kind === 'single-items' ? `${order.restaurant} · ` : ''}{shortDate(order.date)}</Text>
            {evidence.kind === 'late-night' && index === 0 ? <Text style={styles.evidenceCaption}>Latest overnight order</Text> : null}
          </View>
          {evidence.kind !== 'single-items' ? <Text style={styles.dayOrderTime}>{evidence.kind === 'spending' ? orderMoney(order, currency) : recapOrderTime(order.localTime)}</Text> : null}
        </>}
      </View>
    </React.Fragment>)}
    {evidence.kind === 'streak' ? <Text style={styles.dayOrdersRemaining}>One order shown per day</Text> : evidence.total > evidence.orders.length ? <Text style={styles.dayOrdersRemaining}>{evidence.orders.length} of {evidence.total} orders</Text> : null}
  </View>;
}
