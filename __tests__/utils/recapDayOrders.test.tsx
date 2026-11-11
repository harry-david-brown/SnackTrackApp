import React from 'react';
import { render } from '@testing-library/react-native';
import { RecapStorySlide } from '@components/wrapped/RecapStorySlide';
import { WrappedStaticRenderContext } from '@components/wrapped/WrappedSlideEffects';
import type { RecapStory } from '@/types/recap';

const busy: RecapStory = {
  id: 'most-deliveries-day', category: 'extreme-moment', family: 'busy-day', overlaps: [],
  specificity: 1, score: 80, title: 'ONE BUSY DAY.', value: 4, format: 'number',
  label: 'completed deliveries', detail: 'In your tracked history', punchline: 'Your doorbell worked overtime.',
  startDate: '2023-12-10', orders: [
    { id: 'a', restaurant: 'Breakfast', localTime: '00:05' },
    { id: 'b', restaurant: 'Lunch', localTime: '12:38' },
    { id: 'c', restaurant: 'Dinner', localTime: '18:45' },
    { id: 'd', restaurant: 'Snack' },
  ],
};
const show = (story: RecapStory) => render(<WrappedStaticRenderContext.Provider value>
  <RecapStorySlide story={story} currency="CAD" formatDate={date => date} />
</WrappedStaticRenderContext.Provider>);

it('renders the actual orders and honest times in the static recap without an exit link', () => {
  const screen = show(busy);
  for (const text of ['Breakfast', 'Lunch', 'Dinner', 'Snack', '12:05 AM', '12:38 PM', '6:45 PM', 'Time unavailable']) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.queryByText(/View.*orders/i)).toBeNull();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

it('keeps exceptional days bounded and tells users when more deliveries are counted', () => {
  const screen = show({ ...busy, value: 5, orders: [...busy.orders!, { id: 'e', restaurant: 'Extra' }] });
  expect(screen.getByText('+1 more delivery that day')).toBeTruthy();
  expect(screen.queryByText('Extra')).toBeNull();
});

it('supports older recap payloads without order details', () => {
  const screen = show({ ...busy, orders: undefined });
  expect(screen.getByText('ONE BUSY DAY.')).toBeTruthy();
  expect(screen.queryByText('Time unavailable')).toBeNull();
});
