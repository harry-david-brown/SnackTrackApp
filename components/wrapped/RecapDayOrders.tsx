import React from 'react';
import { Text, View } from 'react-native';
import type { RecapDayOrder } from '@/types/recap';
import { styles } from './wrappedStyles';

const VISIBLE_ORDERS = 4;

export function recapOrderTime(localTime?: string): string {
  if (!localTime) return 'Time unavailable';
  const [hour, minute] = localTime.split(':');
  const hours = Number(hour);
  return `${hours % 12 || 12}:${minute} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function recapOrdersText(orders?: RecapDayOrder[]): string {
  return orders?.map(order => `${order.restaurant}, ${recapOrderTime(order.localTime)}`).join('. ') ?? '';
}

export function RecapDayOrders({ orders }: { orders: RecapDayOrder[] }) {
  return <View style={styles.dayOrders}>
    {orders.slice(0, VISIBLE_ORDERS).map((order, index) => <View
      key={order.id}
      accessible
      accessibilityLabel={`${order.restaurant}, ${recapOrderTime(order.localTime)}`}
      style={[styles.dayOrderRow, index > 0 && styles.dayOrderDivider]}
    >
      <Text style={styles.dayOrderRestaurant} numberOfLines={1}>{order.restaurant}</Text>
      <Text style={styles.dayOrderTime}>{recapOrderTime(order.localTime)}</Text>
    </View>)}
    {orders.length > VISIBLE_ORDERS ? <Text style={styles.dayOrdersRemaining}>+{orders.length - VISIBLE_ORDERS} more {orders.length - VISIBLE_ORDERS === 1 ? 'delivery' : 'deliveries'} that day</Text> : null}
  </View>;
}
