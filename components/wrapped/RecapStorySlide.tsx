import React from 'react';
import { Text, View } from 'react-native';
import type { RecapStory } from '@/types/recap';
import { AnimatedCount, DelayedFadeIn, Spacer } from './WrappedSlideEffects';
import { styles } from './wrappedStyles';

export const recapMoney = (value: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(value);

export function recapStoryText(story: RecapStory, currency: string): string {
  return story.format === 'money' ? recapMoney(Number(story.value), currency) : typeof story.value === 'number' ? story.value.toLocaleString() : story.value;
}

export function RecapStorySlide({ story, currency, formatDate }: { story: RecapStory; currency: string; formatDate: (date: string) => string }) {
  const isDateValue = story.id === 'history-first' || story.id === 'history-latest';
  return <>
    <Text style={styles.slideTitle}>{story.title}</Text>
    {typeof story.value === 'number' ? <AnimatedCount value={story.value} format={n => story.format === 'money' ? recapMoney(n, currency) : Math.round(n).toLocaleString()} style={styles.bigNumber} /> : <Text style={styles.slideTitle}>{isDateValue ? formatDate(story.value) : story.value}</Text>}
    <Text style={styles.bigNumberLabel}>{story.label}</Text>
    <Spacer h={6} />
    {(story.detail || story.startDate) ? <View style={styles.detailBox}>
      {story.startDate ? <Text style={styles.detailText}>{formatDate(story.startDate)}{story.endDate && story.endDate !== story.startDate ? ` – ${formatDate(story.endDate)}` : ''}</Text> : null}
      {story.detail ? <Text style={styles.detailText}>{story.detail}</Text> : null}
      {story.supportingMoney ? <Text style={styles.detailText}>{recapMoney(story.supportingMoney.amount, currency)} {story.supportingMoney.label}</Text> : null}
    </View> : null}
    {story.punchline ? <DelayedFadeIn delay={550}><Text style={styles.roastText}>{story.punchline}</Text></DelayedFadeIn> : null}
  </>;
}
