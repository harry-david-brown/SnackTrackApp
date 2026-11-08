import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EmailJourneyHeading } from '@components/import/EmailJourneyHeading';

jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => true }));

test('shows the confirmed inbox and allows changing it without starting an import', () => {
  const change = jest.fn();
  const screen = render(<EmailJourneyHeading providerName="Gmail" connected email="receipts@example.com" onChangeAccount={change} />);
  expect(screen.getByText('GMAIL CONNECTED')).toBeTruthy();
  expect(screen.getByText('receipts@example.com')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Change account' }));
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/automatic updates/i)).toBeNull();
});

test.each([{ reconnect: true, title: 'Reconnect Outlook' }, { unavailable: true, title: 'Outlook is temporarily unavailable' }])('does not claim a healthy connection during recovery: $title', ({ title, ...state }) => {
  const change = jest.fn();
  const screen = render(<EmailJourneyHeading providerName="Outlook" connected busy onChangeAccount={change} {...state} />);
  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.queryByText('OUTLOOK CONNECTED')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Change account' }));
  expect(change).not.toHaveBeenCalled();
});
