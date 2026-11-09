import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReceiptInboxChoice } from '@components/import/ReceiptInboxChoice';

jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => true }));
jest.mock('@components/mascot/Mascot', () => ({ Mascot: () => null }));

function setup(disabled = false) {
  const actions = { onChooseEmail: jest.fn(), onChooseAlternative: jest.fn(), onBack: jest.fn() };
  return { ...render(<ReceiptInboxChoice disabled={disabled} {...actions} />), actions };
}

test('selects an inbox before the explicit next action', () => {
  const screen = setup();
  expect(screen.getByRole('button', { name: 'Choose an inbox to continue' }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByRole('radio', { name: 'Gmail' }));
  expect(screen.actions.onChooseEmail).not.toHaveBeenCalled();
  expect(screen.getByRole('radio', { name: 'Gmail' }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByRole('radio', { name: 'Outlook' }));
  expect(screen.getByRole('radio', { name: 'Gmail' }).props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: 'Continue with Outlook' }));
  expect(screen.actions.onChooseEmail.mock.calls).toEqual([['outlook']]);
  expect(screen.actions.onChooseAlternative).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Use another method' }));
  expect(screen.actions.onChooseAlternative).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.actions.onBack).toHaveBeenCalledTimes(1);
});

test('blocks competing actions during a connection or import', () => {
  const screen = setup(true);
  for (const name of ['Gmail', 'Outlook', 'Use another method', 'Back']) {
    const button = screen.getByRole(name === 'Gmail' || name === 'Outlook' ? 'radio' : 'button', { name });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
  }
  Object.values(screen.actions).forEach(action => expect(action).not.toHaveBeenCalled());
});

test('help expands without choosing a source', () => {
  const screen = setup();
  expect(screen.getByRole('button', { name: 'Not sure which email to use?' }).props.accessibilityState.expanded).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: 'Not sure which email to use?' }));
  expect(screen.getByRole('button', { name: 'Hide help' }).props.accessibilityState.expanded).toBe(true);
  Object.values(screen.actions).forEach(action => expect(action).not.toHaveBeenCalled());
});
