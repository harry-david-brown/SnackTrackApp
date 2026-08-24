import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DashboardInsightsDevControls, MAX_DEV_INSIGHT_DAY_OFFSET } from '@components/dashboard/DashboardInsightsDevControls';

describe('DashboardInsightsDevControls', () => {
  it('moves through future preview days and resets to today', () => {
    const onChangeDayOffset = jest.fn();
    const screen = render(<DashboardInsightsDevControls dayOffset={3} isFetching={false} onChangeDayOffset={onChangeDayOffset} />);
    expect(screen.getByText('+3 days')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Previous dashboard insight preview day' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next dashboard insight preview day' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reset dashboard insight preview to today' }));
    expect(onChangeDayOffset.mock.calls).toEqual([[2], [4], [0]]);
  });

  it('stays within its preview range and disables controls while loading', () => {
    const today = render(<DashboardInsightsDevControls dayOffset={0} isFetching={false} onChangeDayOffset={jest.fn()} />);
    expect(today.getByRole('button', { name: 'Previous dashboard insight preview day' }).props.accessibilityState.disabled).toBe(true);
    today.unmount();

    const maximum = render(<DashboardInsightsDevControls dayOffset={MAX_DEV_INSIGHT_DAY_OFFSET} isFetching onChangeDayOffset={jest.fn()} />);
    expect(maximum.getByRole('button', { name: 'Next dashboard insight preview day' }).props.accessibilityState.disabled).toBe(true);
    expect(maximum.getByText(/loading/)).toBeTruthy();
  });
});
