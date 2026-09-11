import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { DashboardMonthNavigator } from '@components/dashboard/DashboardMonthNavigator';
import type { DashboardMonthOption } from '@features/dashboard/dashboardPeriodSummary';

jest.mock('@contexts/AppearanceContext', () => ({
  useAppTheme: () => jest.requireActual('@constants/theme').LightTheme,
}));

const months: DashboardMonthOption[] = [
  { key: '2026-07', label: 'July 2026', shortLabel: 'July', year: 2026, isCurrent: false, hasTrackedOrders: false },
  { key: '2026-08', label: 'August 2026', shortLabel: 'August', year: 2026, isCurrent: false, hasTrackedOrders: true },
  { key: '2026-09', label: 'September 2026', shortLabel: 'September', year: 2026, isCurrent: true, hasTrackedOrders: true },
];

function Harness() {
  const [selectedMonthKey, setSelectedMonthKey] = useState('2026-09');
  return (
    <DashboardMonthNavigator
      months={months}
      selectedMonthKey={selectedMonthKey}
      onSelectMonth={setSelectedMonthKey}
    />
  );
}

describe('DashboardMonthNavigator', () => {
  it('moves between months without rendering a separate current-month row', () => {
    const screen = render(<Harness />);

    expect(screen.getByRole('button', { name: 'Show next month' }).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(screen.getByRole('button', { name: 'Show previous month' }));

    expect(screen.getByText('August 2026')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to this month' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Show next month' }));
    expect(screen.getByText('September 2026')).toBeTruthy();
  });

  it('opens the month picker and exposes tracked and empty months accessibly', () => {
    const screen = render(<Harness />);

    fireEvent.press(screen.getByRole('button', { name: 'Choose month. September 2026, current month' }));

    expect(screen.getByText('Choose a month')).toBeTruthy();
    const emptyMonth = screen.getByRole('button', { name: 'July 2026, no tracked orders' });
    fireEvent.press(emptyMonth);
    expect(screen.getByText('July 2026')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Choose month. July 2026' }));
    fireEvent.press(screen.getByRole('button', { name: 'September 2026, current month' }));
    expect(screen.getByText('September 2026')).toBeTruthy();
  });
});
