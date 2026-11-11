import React from 'react';
import { Text, View } from 'react-native';
import type { RecapStory } from '@/types/recap';
import { AnimatedCount, DelayedFadeIn, Spacer } from './WrappedSlideEffects';
import { RecapEvidencePanel } from './RecapEvidencePanel';
import { RecapDayOrders } from './RecapDayOrders';
import { styles } from './wrappedStyles';

export const recapMoney = (value: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(value);

const recapStoryMoney = (story: RecapStory, value: number, currency: string) => story.evidence ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) : recapMoney(value, currency);

export function recapStoryText(story: RecapStory, currency: string): string {
  return story.format === 'money' ? recapStoryMoney(story, Number(story.value), currency) : typeof story.value === 'number' ? story.value.toLocaleString() : story.value;
}

export function RecapStorySlide({ story, currency, formatDate }: { story: RecapStory; currency: string; formatDate: (date: string) => string }) {
  const orders = story.id === 'most-deliveries-day' ? story.orders : undefined;
  const hasOrders = Boolean(orders?.length || story.evidence?.orders.length);
  const isDateValue = story.id === 'history-first' || story.id === 'history-latest';
  return <>
    <Text style={[styles.slideTitle, hasOrders && styles.dayStoryTitle]}>{story.title}</Text>
    {typeof story.value === 'number' ? <AnimatedCount value={story.value} format={n => story.format === 'money' ? recapStoryMoney(story, n, currency) : Math.round(n).toLocaleString()} style={[styles.bigNumber, hasOrders && styles.dayStoryNumber, hasOrders && story.format === 'money' && styles.evidenceMoneyValue]} /> : <Text style={[styles.slideTitle, hasOrders && styles.evidenceDateValue]}>{isDateValue ? formatDate(story.value) : story.value}</Text>}
    <Text style={[styles.bigNumberLabel, hasOrders && styles.dayStoryLabel]}>{story.label}</Text>
    <Spacer h={6} />
    {(story.detail || story.startDate) ? <View style={[styles.detailBox, hasOrders && styles.dayStoryDate]}>
      {story.startDate ? <Text style={styles.detailText}>{formatDate(story.startDate)}{story.endDate && story.endDate !== story.startDate ? ` – ${formatDate(story.endDate)}` : ''}</Text> : null}
      {story.detail ? <Text style={styles.detailText}>{story.detail}</Text> : null}
      {story.supportingMoney ? <Text style={styles.detailText}>{recapMoney(story.supportingMoney.amount, currency)} {story.supportingMoney.label}</Text> : null}
    </View> : null}
    {hasOrders && orders ? <RecapDayOrders orders={orders} /> : null}
    {story.evidence ? <RecapEvidencePanel evidence={story.evidence} currency={currency} showReceiptHeader={isDateValue} /> : null}
    {story.punchline ? <DelayedFadeIn delay={550}><Text style={[styles.roastText, hasOrders && styles.dayStoryPunchline]}>{story.punchline}</Text></DelayedFadeIn> : null}
  </>;
}
