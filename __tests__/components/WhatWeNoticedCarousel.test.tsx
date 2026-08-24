import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, StyleSheet } from 'react-native';
import { WhatWeNoticedCarousel } from '@components/dashboard/WhatWeNoticedCarousel';
import type { DashboardInsight } from '@/types/api';

jest.mock('@contexts/CurrencyContext', () => ({
  useCurrency: () => ({ formatCurrency: (amount: number) => `$${amount.toFixed(2)}` }),
}));

const insights: DashboardInsight[] = [
  { id: 'hero', presentation: 'hero', category: 'habits', icon: 'calendar', eyebrow: 'Weekly ritual', title: 'Your delivery day', headline: 'Friday', value: 12, valueFormat: 'number', detail: 'A recurring appointment.', period: { startDate: '2026-07-01', endDate: '2026-07-08' } },
  { id: 'comparison', presentation: 'comparison', category: 'progress', icon: 'trend', eyebrow: 'Plot twist', title: 'Latest 30 days', detail: 'Frequency did the moving.', comparison: { current: 80, previous: 120, delta: -40, percentDelta: -33, direction: 'down', valueFormat: 'currency', currentLabel: 'Latest', previousLabel: 'Previous', driver: 'frequency' } },
  { id: 'ranking', presentation: 'ranking', category: 'favorites', icon: 'restaurant', eyebrow: 'Your regulars', title: 'The podium', rows: [{ label: 'Burger + Fries', context: 'Test Kitchen', count: 4, amount: 72 }] },
  { id: 'order', presentation: 'order', category: 'extremes', icon: 'receipt', eyebrow: 'Heavyweight', title: 'Biggest order', period: { startDate: '2026-08-05' }, order: { restaurant: 'Comma, Kitchen', restaurants: ['Comma, Kitchen', 'Dinner Place', 'Chinatown Kitchen'], amount: 91, items: ['2× Burger'] } },
  { id: 'timeline', presentation: 'timeline', category: 'favorites', icon: 'trophy', eyebrow: 'A new era', title: 'The crown changed', events: [{ label: '2025', value: 'Old Place' }, { label: '2026', value: 240, valueFormat: 'currency', detail: 'New Place' }] },
  { id: 'yearly', presentation: 'yearly-champions', category: 'favorites', icon: 'trophy', eyebrow: 'Taste timeline', title: 'Your champions through the years', detail: 'Old Place collected 2 crowns. New Place has the latest one.', years: [{ year: 2021, winners: ['First Place'], orderCount: 3, currentYear: false }, { year: 2022, winners: ['Second Place'], orderCount: 4, currentYear: false }, { year: 2023, winners: ['Third Place'], orderCount: 5, currentYear: false }, { year: 2024, winners: ['Old Place'], orderCount: 8, currentYear: false }, { year: 2025, winners: ['Old Place', 'Tie Place'], orderCount: 6, currentYear: false }, { year: 2026, winners: ['New Place'], orderCount: 7, currentYear: true }] },
  { id: 'locked', presentation: 'locked', category: 'favorites', icon: 'lock', eyebrow: 'Hidden', title: 'Your menu soulmate', detail: 'Export data can reveal it.', action: 'open_export' },
];

describe('WhatWeNoticedCarousel', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('renders every typed presentation and routes the locked action', async () => {
    const onOpenExport = jest.fn();
    const screen = render(<WhatWeNoticedCarousel insights={insights} onOpenExport={onOpenExport} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('Friday')).toBeTruthy();
    expect(screen.getByText('Lower · 33%')).toBeTruthy();
    expect(screen.getByText('Burger + Fries')).toBeTruthy();
    expect(screen.getByText('Test Kitchen · 4 orders · $72.00')).toBeTruthy();
    expect(screen.getByText('2× Burger', { exact: false })).toBeTruthy();
    expect(screen.getByText('THE LINEUP')).toBeTruthy();
    expect(screen.getByText('Comma, Kitchen')).toBeTruthy();
    expect(screen.getByText('Dinner Place')).toBeTruthy();
    expect(screen.getByText('Chinatown Kitchen')).toBeTruthy();
    expect(screen.getByText('Jul 1, 2026 – Jul 8, 2026')).toBeTruthy();
    expect(screen.getByText('Aug 5, 2026')).toBeTruthy();
    expect(screen.getByTestId('restaurant-number-1').props.children).toBe(1);
    expect(screen.getByTestId('restaurant-number-2').props.children).toBe(2);
    expect(screen.getByTestId('restaurant-number-3').props.children).toBe(3);
    expect(screen.getByText('$240.00')).toBeTruthy();
    expect(screen.getByText('Your champions through the years')).toBeTruthy();
    expect(screen.getByText('Old Place & Tie Place')).toBeTruthy();
    expect(screen.getByText('6 orders each')).toBeTruthy();
    expect(screen.getByText('SO FAR')).toBeTruthy();
    expect(screen.getByText('That’s all for today')).toBeTruthy();
    expect(screen.getByText('Come back tomorrow for new stats.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Unlock this insight with an Uber data export' }));
    expect(onOpenExport).toHaveBeenCalledTimes(1);
  });

  it('keeps long restaurant, currency, and methodology content renderable without fixed card clipping', async () => {
    const longInsight: DashboardInsight = {
      id: 'long', presentation: 'order', category: 'extremes', icon: 'receipt', eyebrow: 'Receipt archaeology', title: 'A particularly detailed order with a title that needs room to wrap',
      detail: 'Long-form punchlines remain available to font scaling instead of being truncated to a fixed number of lines.',
      order: { restaurant: 'The Extremely Long Restaurant Name With A Downtown Branch', amount: 123456.78, items: ['A menu item with a deliberately long descriptive name'] },
      methodology: { estimated: true, sampleSize: 1234, disclaimer: 'Illustrative methodology text remains visible.' },
    };
    const screen = render(<WhatWeNoticedCarousel insights={[longInsight]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    expect(screen.getByText('The Extremely Long Restaurant Name With A Downtown Branch')).toBeTruthy();
    expect(screen.getByText('$123456.78')).toBeTruthy();
    expect(screen.queryByText(/Estimated/)).toBeNull();
    expect(screen.getByText(/Based on 1234 tracked orders/)).toBeTruthy();
    expect(screen.getByText(/Illustrative methodology text remains visible/)).toBeTruthy();
  });

  it('makes foodflation a named earlier-to-recent price story', async () => {
    const foodflation: DashboardInsight = {
      id: 'foodflation-meal', presentation: 'comparison', category: 'progress', icon: 'trend', eyebrow: 'Foodflation', title: 'The same order costs 31% more', detail: 'Same order. Different price.',
      period: { startDate: '2024-01-05', endDate: '2026-01-05' }, methodology: { sampleSize: 3 },
      comparison: { current: 23.48, previous: 17.95, delta: 5.53, percentDelta: 31, direction: 'up', valueFormat: 'currency', currentLabel: 'Recent price', previousLabel: 'Earlier price', subject: { kind: 'meal', name: 'Mocha Frappé + Hash Brown', restaurant: "McDonald's", occurrences: 3 } },
    };
    const screen = render(<WhatWeNoticedCarousel insights={[foodflation]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('FOODFLATION')).toBeTruthy();
    expect(screen.getByText('The same order costs 31% more')).toBeTruthy();
    expect(screen.getByText("IDENTICAL ORDER · McDonald's")).toBeTruthy();
    expect(screen.getByText('Mocha Frappé + Hash Brown')).toBeTruthy();
    expect(screen.getByText('Earlier price')).toBeTruthy();
    expect(screen.getByText('$17.95')).toBeTruthy();
    expect(screen.getByText('Recent price')).toBeTruthy();
    expect(screen.getByText('$23.48')).toBeTruthy();
    expect(screen.getByText('$5.53 more')).toBeTruthy();
    expect(screen.queryByText(/match/i)).toBeNull();
  });

  it('keeps Alternate Universe focused on spent versus invested value', async () => {
    const investment: DashboardInsight = {
      id: 'hypothetical-investment', presentation: 'comparison', category: 'progress', icon: 'trend', eyebrow: 'Alternate universe', title: 'If your orders were investments',
      detail: 'At a fixed 7% yearly return from each order date.', methodology: { sampleSize: 903, disclaimer: 'For fun—not financial advice.' },
      comparison: { variant: 'investment', current: 32558.94, previous: 25051.13, delta: 7507.81, percentDelta: 30, direction: 'up', valueFormat: 'currency', currentLabel: "You'd have", previousLabel: 'You spent' },
    };
    const screen = render(<WhatWeNoticedCarousel insights={[investment]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('If your orders were investments')).toBeTruthy();
    expect(screen.getByText('You spent')).toBeTruthy();
    expect(screen.getByText('$25051.13')).toBeTruthy();
    expect(screen.getByText("You'd have")).toBeTruthy();
    expect(screen.getByText('$32558.94')).toBeTruthy();
    expect(screen.queryByText(/Hypothetical gain/)).toBeNull();
    expect(screen.queryByText(/Higher ·/)).toBeNull();
  });

  it('renders a sauce podium as order counts without meaningless currency', async () => {
    const sauceRanking: DashboardInsight = {
      id: 'top-dipping-sauces', presentation: 'ranking', category: 'favorites', icon: 'sparkles', eyebrow: 'Dip draft', title: 'Your dipping-sauce podium',
      detail: 'Creamy Garlic took the crown. Dry bites never had a chance.', methodology: { sampleSize: 12 },
      rows: [{ label: 'Creamy Garlic', count: 8 }, { label: 'Blackened Ranch', count: 5 }, { label: 'Hot Mustard', count: 3 }],
    };
    const screen = render(<WhatWeNoticedCarousel insights={[sauceRanking]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('DIP DRAFT')).toBeTruthy();
    expect(screen.getByText('Your dipping-sauce podium')).toBeTruthy();
    expect(screen.getByText('Creamy Garlic')).toBeTruthy();
    expect(screen.getByText('8 orders')).toBeTruthy();
    expect(screen.getByText('Blackened Ranch')).toBeTruthy();
    expect(screen.getByText('Hot Mustard')).toBeTruthy();
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
  });

  it('bounds long champion histories, starts newest-first, and pauses rotation while browsing earlier years', async () => {
    const yearlyInsight = insights.find(insight => insight.presentation === 'yearly-champions');
    if (!yearlyInsight) throw new Error('Missing yearly champions fixture');
    const screen = render(<WhatWeNoticedCarousel insights={[yearlyInsight, insights[0]]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    const scroll = screen.getByTestId('yearly-champions-scroll');
    expect(StyleSheet.flatten(scroll.props.style).maxHeight).toBe(192);
    expect(scroll.props.nestedScrollEnabled).toBe(true);
    expect(screen.getAllByTestId(/^champion-year-/).map(node => node.props.children)).toEqual([2026, 2025, 2024, 2023, 2022, 2021]);
    expect(screen.getByText('Scroll for earlier years')).toBeTruthy();

    fireEvent(scroll, 'scrollBeginDrag', { nativeEvent: {} });
    expect(screen.getAllByRole('button', { name: 'Resume automatic insight rotation' }).length).toBeGreaterThan(0);
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 120 }, contentSize: { height: 312 }, layoutMeasurement: { height: 192 } } });
    expect(screen.queryByText('Scroll for earlier years')).toBeNull();
  });

  it('leaves short champion histories unscrolled and without an earlier-years cue', async () => {
    const yearlyInsight = insights.find(insight => insight.presentation === 'yearly-champions');
    if (!yearlyInsight) throw new Error('Missing yearly champions fixture');
    const shortHistory: DashboardInsight = { ...yearlyInsight, id: 'short-yearly', years: yearlyInsight.years.slice(-3) };
    const screen = render(<WhatWeNoticedCarousel insights={[shortHistory]} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    expect(screen.getByTestId('yearly-champions-scroll').props.scrollEnabled).toBe(false);
    expect(screen.queryByText('Scroll for earlier years')).toBeNull();
  });

  it('reserves room for the full shadow while keeping pagination visually close', async () => {
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 1)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());

    const frameStyle = StyleSheet.flatten(screen.getByTestId('insight-card-frame-0').props.style);
    const paginationStyle = StyleSheet.flatten(screen.getByRole('adjustable').props.style);
    expect(frameStyle.paddingBottom).toBe(24);
    expect(paginationStyle.marginTop).toBe(-12);
  });

  it('uses native paging, updates textual progress, and stops autoplay after a swipe', async () => {
    jest.useFakeTimers();
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 3)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    const carousel = screen.getByRole('adjustable');
    const list = screen.getByTestId('what-we-noticed-list');
    fireEvent(screen.getByTestId('what-we-noticed-carousel'), 'layout', { nativeEvent: { layout: { width: 320 } } });
    fireEvent(list, 'scrollBeginDrag', { nativeEvent: {} });
    fireEvent(list, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 320 } } });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(carousel.props.accessibilityLabel).toBe('Daily insights. Insight 2 of 3');

    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByText('2 of 3')).toBeTruthy();
  });

  it('ends with an uncounted daily outro and loops back to the first stat', async () => {
    jest.useFakeTimers();
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 1)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    const carousel = screen.getByRole('adjustable');

    expect(screen.getByText('1 of 1')).toBeTruthy();
    act(() => jest.advanceTimersByTime(6100));
    expect(screen.getByText('That’s today’s edition')).toBeTruthy();
    expect(carousel.props.accessibilityLabel).toBe('Daily insights. That’s all for today.');
    expect(screen.queryByText('2 of 2')).toBeNull();

    act(() => jest.advanceTimersByTime(6100));
    expect(screen.getByText('1 of 1')).toBeTruthy();
  });

  it('supports swipe-independent accessibility actions and pauses afterward', async () => {
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 3)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    const control = screen.getByRole('adjustable');
    fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Resume automatic insight rotation' }).length).toBeGreaterThan(0);
  });

  it('automatically advances every six seconds and exposes pause and resume state', async () => {
    jest.useFakeTimers();
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 3)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    expect(screen.getByText('1 of 3')).toBeTruthy();
    act(() => jest.advanceTimersByTime(6100));
    expect(screen.getByText('2 of 3')).toBeTruthy();

    fireEvent.press(screen.getAllByRole('button', { name: 'Pause automatic insight rotation' })[0]);
    expect(screen.getAllByRole('button', { name: 'Resume automatic insight rotation' }).length).toBeGreaterThan(0);
    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByText('2 of 3')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Resume automatic insight rotation' })[0]);
    act(() => jest.advanceTimersByTime(6100));
    expect(screen.getByText('3 of 3')).toBeTruthy();
  });

  it('does not autoplay when reduced motion is enabled and provides full position labels', async () => {
    jest.useFakeTimers();
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 2)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(screen.getByLabelText(/Insight 1 of 2.*Your delivery day/)).toBeTruthy();
  });

  it('stops autoplay while backgrounded and resumes after foregrounding', async () => {
    jest.useFakeTimers();
    let appStateListener: ((state: 'active' | 'background') => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: 'active' | 'background') => void;
      return { remove: jest.fn() };
    });
    const screen = render(<WhatWeNoticedCarousel insights={insights.slice(0, 2)} onOpenExport={jest.fn()} />);
    await act(async () => Promise.resolve());
    act(() => { appStateListener?.('background'); });
    act(() => { jest.advanceTimersByTime(12_000); });
    expect(screen.getByText('1 of 2')).toBeTruthy();
    act(() => { appStateListener?.('active'); });
    act(() => { jest.advanceTimersByTime(6100); });
    expect(screen.getByText('2 of 2')).toBeTruthy();
  });
});
