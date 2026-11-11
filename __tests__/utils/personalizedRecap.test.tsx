import React from 'react';
import { render } from '@testing-library/react-native';
import { selectPersonalizedStories } from '@components/wrapped/wrappedSlideSelection';
import { buildWrappedSlides } from '@components/wrapped/buildWrappedSlides';
import { normalizeRecap } from '@services/normalizers/recapNormalizer';
import { WrappedStaticRenderContext } from '@components/wrapped/WrappedSlideEffects';
import type { RecapStory, RecapStoryCollection } from '@/types/recap';
import orderMetricsFixture from '@/__tests__/fixtures/order-event-metrics.json';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import type { UserSummary } from '@/types/api';
import { analyticsKeys } from '@lib/queryKeys';

const story = (id: string, extra: Partial<RecapStory> = {}): RecapStory => ({ id, category: 'pattern', family: id, overlaps: [], specificity: 1, score: 5, title: id, value: 4, format: 'number', label: 'orders', detail: '', punchline: '', ...extra });
const fallbacks = () => Array.from({ length: 8 }, (_, i) => story(`fallback-${i}`, { fallbackOrder: i }));
const collection = (stories: RecapStory[]): RecapStoryCollection => ({ version: 1, currency: 'CAD', rateSnapshot: 'test', spending: { amount: 179.5, approximate: true, pricedOrders: 5, missingPrices: 0, assumedCurrencies: 0 }, stories });

it('fills ten even when all stories have low scores', () => {
  expect(selectPersonalizedStories(fallbacks())).toHaveLength(6);
  expect(selectPersonalizedStories(Array.from({ length: 10 }, (_, i) => story(`weak-${i}`)))).toHaveLength(6);
});
it('reserves busiest day and habit, permits multiple extremes, caps at twelve', () => {
  const stories = [story('most-deliveries-day', { score: 0, category: 'extreme-moment', protected: true }), story('habit', { category: 'habit' }), ...Array.from({ length: 12 }, (_, i) => story(`record-${i}`, { score: 90, category: 'extreme-moment' }))];
  const selected = selectPersonalizedStories(stories);
  expect(selected).toHaveLength(8);
  expect(selected.map(s => s.id)).toEqual(expect.arrayContaining(['most-deliveries-day', 'habit']));
  expect(selected.filter(s => s.category === 'extreme-moment').length).toBeGreaterThan(1);
  expect(selectPersonalizedStories([...stories].reverse())).toEqual(selected);
});
it('adds exactly one strong extra story when only one remains', () => {
  const stories = Array.from({ length: 7 }, (_, i) => story(`record-${i}`, { score: 80 }));
  expect(selectPersonalizedStories(stories)).toHaveLength(7);
});
it('fills with facts instead of prohibited refunds, chart, cancellation, or overlapping subjects', () => {
  const selected = selectPersonalizedStories([story('refunded-orders', { value: 9, score: 100 }), story('cancellation-cost', { score: 100 }), story('spending-timeline', { score: 100 }), story('restaurant-loyalty', { category: 'habit', score: 80, overlaps: ['chain-dependency'], specificity: 2 }), story('chain-dependency', { category: 'habit', score: 70 }), ...fallbacks()]);
  expect(selected).toHaveLength(6);
  expect(selected.map(s => s.id)).not.toEqual(expect.arrayContaining(['chain-dependency']));
  expect(selected.some(s => ['refunded-orders', 'cancellation-cost', 'spending-timeline'].includes(s.id))).toBe(false);
});
it('enforces spending diversity and additional-slide threshold', () => {
  const selected = selectPersonalizedStories([...Array.from({ length: 5 }, (_, i) => story(`money-${i}`, { score: 100, format: 'money', family: 'spending' })), ...fallbacks()]);
  expect(selected.filter(s => s.format === 'money')).toHaveLength(2);
  expect(selected).toHaveLength(6);
});
it('validates story facts and rejects malformed payloads', () => {
  expect(normalizeRecap(collection(fallbacks())).stories).toHaveLength(8);
  for (const bad of [{ score: Infinity }, { score: 101 }, { value: -1 }, { startDate: '2024-02-30' }, { format: 'money', value: '20' }]) {
    expect(() => normalizeRecap(collection([story('bad', bad as Partial<RecapStory>)]))).toThrow();
  }
  expect(() => normalizeRecap(collection([story('same'), story('same')]))).toThrow();
});
it('keys recap requests by currency without changing ordinary summary keys', () => {
  expect(analyticsKeys.wrapped('u', 'CAD')).not.toEqual(analyticsKeys.wrapped('u', 'USD'));
  expect(analyticsKeys.wrapped('u', 'CAD').slice(0, 3)).toEqual(analyticsKeys.wrapped('u'));
});
it('renders a full static share deck with net spending and no chart', () => {
  const recap = collection([story('most-deliveries-day', { title: 'ONE BUSY DAY.', category: 'extreme-moment', startDate: '2023-12-10', label: 'completed deliveries' }), ...fallbacks()]);
  const metrics = normalizeOrderMetrics(orderMetricsFixture.metrics);
  const analytics: UserSummary = { userId: 'u', totalSpent: 157.02, totalReceipts: 5, averageOrderValue: 31.4, currencyCode: 'CAD', topRestaurants: [], monthlyBreakdown: [], refundedReceipts: 1, dataQuality: { issues: [], recommendations: [] }, orderMetrics: metrics, wrappedAnalytics: { recap, orderMetrics: metrics, coverage: { orderCount: 5, earliestOrderDate: '2023-12-10', latestOrderDate: '2023-12-10', dataSources: ['csv'], hasExportData: true }, shame: {}, flex: {}, comparative: {}, patterns: {} } };
  const deck = buildWrappedSlides({ analytics, formatCurrency: n => `$${n}`, formatDate: d => d });
  expect(deck).toHaveLength(11);
  expect(deck.some(s => s.id === 'spending-timeline')).toBe(false);
  expect(deck[0].a11y).toContain('CA$180 across your tracked orders');
  expect(deck.every(slide => !slide.a11y?.includes('≈'))).toBe(true);
  expect(deck[deck.length - 1].a11y).toContain('CA$180');
  const screen = render(<WrappedStaticRenderContext.Provider value>{deck[0].content}</WrappedStaticRenderContext.Provider>);
  expect(screen.getByText('across your tracked orders')).toBeTruthy();
  expect(screen.queryByText(/≈/)).toBeNull();
  screen.unmount();
});

it('places dynamic stories under conditional narrative transitions', () => {
  const recap = collection([
    story('delivery-waits', { category: 'perspective', score: 90 }),
    story('longest-streak', { category: 'habit', score: 95 }),
    story('late-night-orders', { category: 'pattern', score: 90 }),
    story('most-deliveries-day', { category: 'extreme-moment', score: 100, protected: true }),
    story('most-expensive-order', { category: 'extreme-moment', score: 95, format: 'money', family: 'spending' }),
    story('single-item-orders', { category: 'habit', score: 85 }),
  ]);
  const metrics = normalizeOrderMetrics(orderMetricsFixture.metrics);
  const analytics: UserSummary = { userId: 'u', totalSpent: 157.02, totalReceipts: 5, averageOrderValue: 31.4, currencyCode: 'CAD', topRestaurants: [], monthlyBreakdown: [], refundedReceipts: 1, dataQuality: { issues: [], recommendations: [] }, orderMetrics: metrics, wrappedAnalytics: { recap, orderMetrics: metrics, coverage: { orderCount: 5, earliestOrderDate: '2023-12-10', latestOrderDate: '2023-12-10', dataSources: ['csv'], hasExportData: true }, shame: {}, flex: {}, comparative: {}, patterns: {} } };
  const deck = buildWrappedSlides({ analytics, formatCurrency: n => `$${n}`, formatDate: d => d });
  const ids = deck.map(slide => slide.id);

  expect(ids).toEqual([
    'lifetime-damage',
    'order-picture',
    'delivery-waits',
    'pattern-emerged',
    'longest-streak',
    'single-item-orders',
    'late-night-orders',
    'things-escalated',
    'most-deliveries-day',
    'most-expensive-order',
    'case-closed',
    'lifetime-archetype',
  ]);
  expect(deck.find(slide => slide.id === 'lifetime-damage')).toMatchObject({ mascotPose: 'prop-empty-wallet', accentEmoji: '💸' });
  expect(deck.find(slide => slide.id === 'order-picture')?.mascotPose).toBe('prop-delivery-haul');
  const singleItem = deck.find(slide => slide.id === 'single-item-orders');
  expect(singleItem).toMatchObject({ emoji: '', mascotPose: 'prop-solo-drink' });
  const deliveryWaits = deck.find(slide => slide.id === 'delivery-waits');
  expect(deliveryWaits).toMatchObject({ emoji: '', mascotPose: 'prop-stopwatch' });
  expect(deliveryWaits?.accentEmoji).toBeUndefined();
  expect(deck.find(slide => slide.id === 'late-night-orders')).toMatchObject({ emoji: '', mascotPose: 'prop-bedtime-phone' });
  expect(deck.find(slide => slide.id === 'longest-streak')).toMatchObject({ mascotPose: 'prop-celebrating-haul' });
  expect(deck.find(slide => slide.id === 'most-deliveries-day')).toMatchObject({ mascotPose: 'prop-delivery-haul', accentEmoji: '🔔' });
  expect(deck.find(slide => slide.id === 'most-expensive-order')).toMatchObject({ mascotPose: 'prop-money-flex', accentEmoji: '💰', accentEmojiCount: 2 });
  const patternTransition = deck.find(slide => slide.id === 'pattern-emerged');
  expect(patternTransition?.mascotPose).toBe('prop-detective');
  expect(patternTransition?.accentEmoji).toBeUndefined();
});

it('preserves the receipt on adjacent history milestones and uses the original flex for a spending burst', () => {
  const recap = collection([
    story('history-first', { category: 'perspective', value: '2025-01-03' }),
    story('history-latest', { category: 'perspective', value: '2026-10-25' }),
    story('repeated-basket', { category: 'habit' }),
    story('spending-burst', { category: 'extreme-moment', format: 'money' }),
    story('missed-investment', { category: 'perspective', format: 'money' }),
  ]);
  const analytics: UserSummary = {
    userId: 'u', totalSpent: 120, totalReceipts: 6, averageOrderValue: 20,
    topRestaurants: [], monthlyBreakdown: [], refundedReceipts: 0,
    dataQuality: { issues: [], recommendations: [] },
    wrappedAnalytics: {
      recap, coverage: { orderCount: 6, earliestOrderDate: '2025-01-03', latestOrderDate: '2026-10-25', dataSources: ['csv'], hasExportData: true },
      shame: {}, flex: {}, comparative: {}, patterns: {},
    },
  };
  const deck = buildWrappedSlides({ analytics, formatCurrency: String, formatDate: d => d });
  const first = deck.findIndex(slide => slide.id === 'history-first');
  expect(first).toBeGreaterThanOrEqual(0);
  expect(deck.slice(first, first + 2).map(({ id, mascotPose, accentEmoji }) => [id, mascotPose, accentEmoji])).toEqual([
    ['history-first', 'prop-first-receipt', undefined],
    ['history-latest', 'prop-first-receipt', undefined],
  ]);
  expect(deck.find(s => s.id === 'repeated-basket')?.mascotPose).toBe('prop-repeat-menu');
  expect(deck.filter(s => s.mascotPose === 'prop-investment-teacher').map(s => s.id)).toEqual(['missed-investment']);
  expect(deck.find(s => s.id === 'spending-burst')).toMatchObject({ mascotPose: 'flex', accentEmoji: '🔥', accentEmojiCount: 2 });
});

it('normalizes busy-day orders and rejects invalid times, duplicate orders and count mismatches', () => {
  const orders = [
    { id: 'a', restaurant: 'Breakfast', localTime: '09:12' },
    { id: 'b', restaurant: 'Dinner' },
  ];
  const busy = story('most-deliveries-day', { value: 2, orders });
  expect(normalizeRecap(collection([busy])).stories[0].orders).toEqual(orders);
  for (const invalidOrders of [
    [orders[0]],
    [orders[0], orders[0]],
    [orders[0], { ...orders[1], localTime: '24:00' }],
    [orders[0], { ...orders[1], restaurant: '' }],
  ]) {
    expect(() => normalizeRecap(collection([{ ...busy, orders: invalidOrders }]))).toThrow();
  }
});

it('validates supporting evidence while accepting older stories without it', () => {
  const evidence = { kind: 'receipt' as const, total: 1, orders: [{ id: 'a', restaurant: 'Cafe', date: '2024-10-18', localTime: '13:30', amount: 12.5, items: [{ name: 'Latte', quantity: 1 }] }] };
  expect(normalizeRecap(collection([story('history-first', { evidence })])).stories[0].evidence).toEqual(evidence);
  for (const invalidEvidence of [
    { ...evidence, total: 0 },
    { ...evidence, orders: [{ ...evidence.orders[0], date: '2024-02-30' }] },
    { ...evidence, orders: [{ ...evidence.orders[0], localTime: '25:00' }] },
    { ...evidence, orders: [{ ...evidence.orders[0], items: [{ name: 'Latte', quantity: 0 }] }] },
  ]) expect(() => normalizeRecap(collection([story('history-first', { evidence: invalidEvidence })]))).toThrow();
});
