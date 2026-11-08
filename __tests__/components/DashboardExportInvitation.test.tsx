import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DashboardTrackingCard } from '@components/dashboard/DashboardTrackingCard';
import { resolveHomeDataGuidance } from '@components/dashboard/dashboardTrackingState';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => true }));

it.each([
  [0, 0, 'Explore history exports'],
  [10, 0, 'Get my Uber history'],
  [0, 10, 'Get my DoorDash history'],
] as const)('offers one subtle tappable export row for %s Uber / %s DoorDash receipts', (uber, doorDash, label) => {
  const preferences = createImportPreferencesFixture();
  preferences.gmailBaseline.hasCompleted = true;
  preferences.coverage.emailReceiptCount = uber + doorDash;
  preferences.coverage.emailProviders.uberEats.receiptCount = uber;
  preferences.coverage.emailProviders.doorDash.receiptCount = doorDash;
  const state = resolveHomeDataGuidance(preferences, false);
  const onAction = jest.fn();
  const screen = render(<DashboardTrackingCard state={state} preferences={preferences} busy={false} onAction={onAction} />);
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByText(state.title)).toBeTruthy();
  expect(screen.queryByText(label)).toBeNull();
  expect(screen.getByText(state.body).props.numberOfLines).toBeUndefined();
  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(onAction).toHaveBeenCalledWith('request_export');
  screen.rerender(<DashboardTrackingCard state={state} preferences={preferences} busy onAction={onAction} />);
  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(onAction).toHaveBeenCalledTimes(1);
});
