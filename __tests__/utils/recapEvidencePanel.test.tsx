import React from 'react';
import { render } from '@testing-library/react-native';
import { RecapEvidencePanel } from '@components/wrapped/RecapEvidencePanel';
import type { RecapEvidence } from '@/types/recap';

const order = { id: 'a', restaurant: 'Sushi Shop', date: '2024-10-18', amount: 86.4, localTime: '18:30', items: [{ name: 'Salmon bowl', quantity: 2 }] };
it('renders a real receipt snapshot with items, time and amount, without navigation', () => {
  const screen = render(<RecapEvidencePanel evidence={{ kind: 'receipt', orders: [order], total: 1 }} currency="CAD" />);
  expect(screen.getByText('2× Salmon bowl')).toBeTruthy();
  expect(screen.getByText('6:30 PM')).toBeTruthy();
  expect(screen.getByText('CA$86.40')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
it('labels a spending subset and retains currency precision', () => {
  const screen = render(<RecapEvidencePanel evidence={{ kind: 'spending', orders: [order], total: 9 }} currency="CAD" />);
  expect(screen.getByText('Biggest orders that week')).toBeTruthy();
  expect(screen.getByText('1 of 9 orders')).toBeTruthy();
});
it('marks omitted streak days accessibly without visible gap copy', () => {
  const evidence: RecapEvidence = { kind: 'streak', total: 12, orders: Array.from({ length: 6 }, (_, i) => ({ ...order, id: String(i) })) };
  const screen = render(<RecapEvidencePanel evidence={evidence} currency="CAD" />);
  expect(screen.queryByText(/days in between/)).toBeNull();
  expect(screen.getByLabelText('6 intervening days omitted from the timeline')).toBeTruthy();
  expect(screen.getByText('One order shown per day')).toBeTruthy();
});
it('does not invent missing receipt amounts or item details', () => {
  const screen = render(<RecapEvidencePanel evidence={{ kind: 'receipt', total: 1, orders: [{ id: 'a', restaurant: 'Cafe' }] }} currency="CAD" />);
  expect(screen.getByText('Cafe')).toBeTruthy();
  expect(screen.queryByText('Net order amount')).toBeNull();
});
