import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { WhatWeNoticedCarousel } from '@components/dashboard/WhatWeNoticedCarousel';
import type { DashboardInsight } from '@/types/api';

jest.mock('@contexts/CurrencyContext', () => ({
  useCurrency: () => ({ formatCurrency: (amount: number) => `$${amount.toFixed(2)}` }),
}));

const insights: DashboardInsight[] = [
  {
    id: 'top-restaurants', category: 'favorites', kind: 'ranking', icon: 'restaurant',
    eyebrow: 'Your regulars', title: 'Top restaurants',
    rows: [{ label: 'Test Kitchen', count: 4, amount: 72 }],
  },
  {
    id: 'locked-most-ordered-meal', category: 'favorites', kind: 'locked', icon: 'lock',
    eyebrow: 'Hidden in your history', title: 'What meal do you order most?',
    detail: 'Your Uber export includes the menu items needed to reveal it.',
    locked: true, action: 'open_export',
  },
];

describe('WhatWeNoticedCarousel', () => {
  it('renders personalized and locked cards and routes the unlock action', async () => {
    const onOpenExport = jest.fn();
    const screen = render(<WhatWeNoticedCarousel insights={[insights[1]]} onOpenExport={onOpenExport} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('What meal do you order most?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Unlock this stat with an Uber data export' }));
    expect(onOpenExport).toHaveBeenCalledTimes(1);
  });

  it('automatically advances and loops through the cards', async () => {
    jest.useFakeTimers();
    try {
      const screen = render(<WhatWeNoticedCarousel insights={insights} onOpenExport={jest.fn()} />);
      await act(async () => Promise.resolve());

      expect(screen.getByText('Top restaurants')).toBeTruthy();
      expect(screen.queryByText('What meal do you order most?')).toBeNull();
      act(() => jest.advanceTimersByTime(4700));
      expect(screen.getByText('What meal do you order most?')).toBeTruthy();
      expect(screen.queryByText('Top restaurants')).toBeNull();
      act(() => jest.advanceTimersByTime(4900));
      expect(screen.getByText('Top restaurants')).toBeTruthy();
      expect(screen.queryByText('What meal do you order most?')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('lets the user pause and resume the current stat', async () => {
    jest.useFakeTimers();
    try {
      const screen = render(<WhatWeNoticedCarousel insights={insights} onOpenExport={jest.fn()} />);
      await act(async () => Promise.resolve());

      fireEvent.press(screen.getByRole('button', { name: 'Pause on this stat' }));
      expect(screen.getByRole('button', { name: 'Resume rotating stats' })).toBeTruthy();
      act(() => jest.advanceTimersByTime(12_000));
      expect(screen.getByText('Top restaurants')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Resume rotating stats' }));
      act(() => jest.advanceTimersByTime(4700));
      expect(screen.getByText('What meal do you order most?')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
